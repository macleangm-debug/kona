"""
Creator Contracts API
Manage partnership contracts with creators
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid

from services import db, get_current_user

router = APIRouter(prefix="/contracts", tags=["contracts"])

# Contract status enum
CONTRACT_STATUS = ["draft", "sent", "signed", "active", "terminated", "expired"]

class ContractParty(BaseModel):
    name: str
    email: EmailStr
    address: Optional[str] = None
    tax_id: Optional[str] = None
    company_name: Optional[str] = None

class RevenueTerms(BaseModel):
    platform_fee_percent: float = Field(default=25.0, ge=0, le=100)
    creator_share_percent: float = Field(default=60.0, ge=0, le=100)
    platform_share_percent: float = Field(default=40.0, ge=0, le=100)
    minimum_payout_threshold: float = Field(default=50.0, ge=0)
    payout_frequency: str = Field(default="monthly")  # weekly, bi-weekly, monthly
    currency: str = Field(default="USD")

class ContractTerms(BaseModel):
    duration_months: int = Field(default=12, ge=1, le=60)
    auto_renewal: bool = Field(default=True)
    exclusivity: bool = Field(default=False)
    exclusivity_scope: Optional[str] = None  # "platform", "category", "none"
    content_ownership: str = Field(default="creator")  # "creator", "platform", "shared"
    termination_notice_days: int = Field(default=30, ge=7, le=90)

class TaxTerms(BaseModel):
    vat_handling: str = Field(default="creator_responsible")  # "creator_responsible", "platform_withholds", "gross_up"
    withholding_tax_percent: Optional[float] = Field(default=0, ge=0, le=50)
    tax_jurisdiction: str = Field(default="")
    creator_tax_registered: bool = Field(default=False)
    creator_vat_number: Optional[str] = None

class CreateContractRequest(BaseModel):
    creator: ContractParty
    platform: ContractParty
    revenue_terms: RevenueTerms
    contract_terms: ContractTerms
    tax_terms: TaxTerms
    additional_clauses: Optional[List[str]] = None
    notes: Optional[str] = None

class UpdateContractStatusRequest(BaseModel):
    status: str
    signed_date: Optional[str] = None
    signed_by_creator: Optional[bool] = None
    signed_by_platform: Optional[bool] = None

@router.post("/create")
async def create_contract(
    request: CreateContractRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new creator partnership contract"""
    
    # Only admins can create contracts
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can create contracts")
    
    contract_id = f"contract-{uuid.uuid4().hex[:12]}"
    contract_number = f"KON-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
    
    # Calculate effective date and expiry
    effective_date = datetime.now(timezone.utc)
    expiry_date = effective_date + timedelta(days=request.contract_terms.duration_months * 30)
    
    contract_doc = {
        "id": contract_id,
        "contract_number": contract_number,
        "status": "draft",
        "creator": request.creator.dict(),
        "platform": request.platform.dict(),
        "revenue_terms": request.revenue_terms.dict(),
        "contract_terms": request.contract_terms.dict(),
        "tax_terms": request.tax_terms.dict(),
        "additional_clauses": request.additional_clauses or [],
        "notes": request.notes,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "effective_date": effective_date.isoformat(),
        "expiry_date": expiry_date.isoformat(),
        "signed_date": None,
        "signed_by_creator": False,
        "signed_by_platform": False,
        "version": 1,
        "amendments": []
    }
    
    await db.contracts.insert_one(contract_doc)
    
    # Remove _id before returning
    contract_doc.pop("_id", None)
    
    return {
        "success": True,
        "contract": contract_doc,
        "message": f"Contract {contract_number} created successfully"
    }

@router.get("/list")
async def list_contracts(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all contracts (admin only)"""
    
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can view contracts")
    
    query = {}
    if status:
        query["status"] = status
    
    contracts = await db.contracts.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    
    # Get summary stats
    all_contracts = await db.contracts.find({}, {"_id": 0, "status": 1}).to_list(length=1000)
    stats = {
        "total": len(all_contracts),
        "draft": sum(1 for c in all_contracts if c.get("status") == "draft"),
        "sent": sum(1 for c in all_contracts if c.get("status") == "sent"),
        "signed": sum(1 for c in all_contracts if c.get("status") == "signed"),
        "active": sum(1 for c in all_contracts if c.get("status") == "active"),
        "terminated": sum(1 for c in all_contracts if c.get("status") == "terminated"),
        "expired": sum(1 for c in all_contracts if c.get("status") == "expired")
    }
    
    return {
        "contracts": contracts,
        "stats": stats,
        "total": len(contracts)
    }

@router.get("/{contract_id}")
async def get_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific contract"""
    
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return contract

@router.patch("/{contract_id}/status")
async def update_contract_status(
    contract_id: str,
    request: UpdateContractStatusRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update contract status"""
    
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can update contracts")
    
    if request.status not in CONTRACT_STATUS:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {CONTRACT_STATUS}")
    
    update_data = {"status": request.status}
    
    if request.signed_date:
        update_data["signed_date"] = request.signed_date
    if request.signed_by_creator is not None:
        update_data["signed_by_creator"] = request.signed_by_creator
    if request.signed_by_platform is not None:
        update_data["signed_by_platform"] = request.signed_by_platform
    
    result = await db.contracts.update_one(
        {"id": contract_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {"success": True, "message": f"Contract status updated to {request.status}"}

@router.delete("/{contract_id}")
async def delete_contract(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a draft contract"""
    
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete contracts")
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get("status") not in ["draft"]:
        raise HTTPException(status_code=400, detail="Only draft contracts can be deleted")
    
    await db.contracts.delete_one({"id": contract_id})
    
    return {"success": True, "message": "Contract deleted"}

@router.get("/{contract_id}/html")
async def get_contract_html(
    contract_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get contract as HTML for preview/print"""
    
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    html = generate_contract_html(contract)
    
    return HTMLResponse(content=html)

@router.get("/{contract_id}/export")
async def export_contract(
    contract_id: str,
    format: str = "html",
    current_user: dict = Depends(get_current_user)
):
    """Export contract in various formats"""
    
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if format == "html":
        html = generate_contract_html(contract)
        return HTMLResponse(
            content=html,
            headers={
                "Content-Disposition": f"attachment; filename={contract['contract_number']}.html"
            }
        )
    elif format == "json":
        return contract
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'html' or 'json'")

def generate_contract_html(contract: dict) -> str:
    """Generate a professional HTML contract document"""
    
    creator = contract.get("creator", {})
    platform = contract.get("platform", {})
    revenue = contract.get("revenue_terms", {})
    terms = contract.get("contract_terms", {})
    tax = contract.get("tax_terms", {})
    
    # Calculate actual shares after platform fee
    net_after_platform = 100 - revenue.get("platform_fee_percent", 25)
    creator_actual = (net_after_platform * revenue.get("creator_share_percent", 60)) / 100
    platform_actual = (net_after_platform * revenue.get("platform_share_percent", 40)) / 100
    
    # VAT handling text
    vat_handling_text = {
        "creator_responsible": "The Creator is solely responsible for registering for, collecting, reporting, and remitting any applicable Value Added Tax (VAT), Goods and Services Tax (GST), or similar consumption taxes in their jurisdiction. The Platform makes no deductions for such taxes from Creator payments.",
        "platform_withholds": f"The Platform will withhold {tax.get('withholding_tax_percent', 0)}% from Creator payments for tax purposes and remit to the appropriate tax authorities as required by law.",
        "gross_up": "If the Platform is required by law to withhold any taxes from payments to the Creator, the Platform will gross-up the payment so that the net amount received by the Creator equals the agreed percentage after such withholding."
    }.get(tax.get("vat_handling", "creator_responsible"), "")
    
    # Exclusivity text
    exclusivity_text = ""
    if terms.get("exclusivity"):
        scope = terms.get("exclusivity_scope", "platform")
        if scope == "platform":
            exclusivity_text = "During the term of this Agreement, Creator agrees to publish content exclusively on the Platform and shall not publish similar content on competing platforms."
        elif scope == "category":
            exclusivity_text = "During the term of this Agreement, Creator agrees to publish content in the specified category exclusively on the Platform."
    else:
        exclusivity_text = "This Agreement is non-exclusive. Creator may publish content on other platforms, subject to not directly competing with content published on the Platform."
    
    # Content ownership text
    ownership_text = {
        "creator": "The Creator retains full ownership of all intellectual property rights in the Content. The Creator grants the Platform a non-exclusive, worldwide license to host, display, stream, and distribute the Content on the Platform for the duration of this Agreement.",
        "platform": "Upon upload to the Platform, ownership of all Content transfers to the Platform. The Platform grants Creator a license to reference the Content for promotional purposes.",
        "shared": "Ownership of Content is shared between Creator and Platform. Both parties have equal rights to use, distribute, and monetize the Content."
    }.get(terms.get("content_ownership", "creator"), "")
    
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Creator Partnership Agreement - {contract.get('contract_number', '')}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: #fff;
        }}
        .header {{
            text-align: center;
            border-bottom: 3px double #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }}
        .header .contract-number {{
            font-size: 14px;
            color: #666;
        }}
        .parties {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
        }}
        .party {{
            width: 48%;
        }}
        .party h3 {{
            font-size: 14px;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }}
        .party p {{
            font-size: 14px;
            margin-bottom: 5px;
        }}
        .party .name {{
            font-weight: bold;
            font-size: 16px;
        }}
        .section {{
            margin-bottom: 25px;
        }}
        .section h2 {{
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #333;
            text-transform: uppercase;
        }}
        .section p {{
            margin-bottom: 10px;
            text-align: justify;
        }}
        .revenue-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        .revenue-table th, .revenue-table td {{
            border: 1px solid #333;
            padding: 10px;
            text-align: left;
        }}
        .revenue-table th {{
            background: #f0f0f0;
            font-weight: bold;
        }}
        .revenue-table .highlight {{
            background: #fffde7;
            font-weight: bold;
        }}
        .clause {{
            margin-bottom: 15px;
            padding-left: 20px;
        }}
        .clause-number {{
            font-weight: bold;
            margin-right: 10px;
        }}
        .signature-section {{
            margin-top: 50px;
            page-break-inside: avoid;
        }}
        .signature-block {{
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }}
        .signature {{
            width: 45%;
        }}
        .signature-line {{
            border-bottom: 1px solid #333;
            height: 40px;
            margin-bottom: 5px;
        }}
        .signature label {{
            font-size: 12px;
            color: #666;
        }}
        .footer {{
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }}
        @media print {{
            body {{
                padding: 20px;
            }}
            .section {{
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Creator Partnership Agreement</h1>
        <p class="contract-number">Contract No: {contract.get('contract_number', 'DRAFT')}</p>
        <p class="contract-number">Effective Date: {contract.get('effective_date', '')[:10] if contract.get('effective_date') else 'TBD'}</p>
    </div>

    <div class="parties">
        <div class="party">
            <h3>The Platform</h3>
            <p class="name">{platform.get('company_name') or platform.get('name', 'Kona Streaming Platform')}</p>
            <p>{platform.get('address', '')}</p>
            <p>Email: {platform.get('email', '')}</p>
            {f"<p>Tax ID: {platform.get('tax_id')}</p>" if platform.get('tax_id') else ''}
        </div>
        <div class="party">
            <h3>The Creator</h3>
            <p class="name">{creator.get('name', '')}</p>
            {f"<p>{creator.get('company_name')}</p>" if creator.get('company_name') else ''}
            <p>{creator.get('address', '')}</p>
            <p>Email: {creator.get('email', '')}</p>
            {f"<p>Tax ID/VAT: {creator.get('tax_id')}</p>" if creator.get('tax_id') else ''}
        </div>
    </div>

    <div class="section">
        <h2>1. Recitals</h2>
        <p>WHEREAS, the Platform operates a digital video streaming service enabling creators to publish, distribute, and monetize their content;</p>
        <p>WHEREAS, the Creator wishes to publish content on the Platform and participate in the Platform's revenue sharing program;</p>
        <p>NOW, THEREFORE, in consideration of the mutual covenants and agreements hereinafter set forth, the parties agree as follows:</p>
    </div>

    <div class="section">
        <h2>2. Revenue Sharing</h2>
        <p>The parties agree to the following revenue sharing arrangement for all revenue generated from Creator's content on the Platform:</p>
        
        <table class="revenue-table">
            <tr>
                <th>Revenue Component</th>
                <th>Percentage</th>
                <th>Description</th>
            </tr>
            <tr>
                <td>Gross Revenue</td>
                <td>100%</td>
                <td>Total revenue from subscriptions, ads, tips, and merchandise</td>
            </tr>
            <tr>
                <td>Platform Fee</td>
                <td>{revenue.get('platform_fee_percent', 25)}%</td>
                <td>Deducted first for platform operations, hosting, and services</td>
            </tr>
            <tr>
                <td>Net Revenue</td>
                <td>{net_after_platform}%</td>
                <td>Remaining after platform fee deduction</td>
            </tr>
            <tr class="highlight">
                <td>Creator Share</td>
                <td>{revenue.get('creator_share_percent', 60)}% of Net ({creator_actual:.1f}% of Gross)</td>
                <td>Paid to Creator per payout schedule</td>
            </tr>
            <tr>
                <td>Platform Share</td>
                <td>{revenue.get('platform_share_percent', 40)}% of Net ({platform_actual:.1f}% of Gross)</td>
                <td>Retained by Platform</td>
            </tr>
        </table>

        <p><strong>Example:</strong> For every $100 in gross revenue, the Platform deducts ${revenue.get('platform_fee_percent', 25)} as platform fee. From the remaining ${net_after_platform}, Creator receives ${creator_actual:.2f} and Platform retains ${platform_actual:.2f}.</p>
    </div>

    <div class="section">
        <h2>3. Payment Terms</h2>
        <p><span class="clause-number">3.1</span> <strong>Payout Frequency:</strong> Payments shall be made on a {revenue.get('payout_frequency', 'monthly')} basis, within 15 business days following the end of each payment period.</p>
        <p><span class="clause-number">3.2</span> <strong>Minimum Threshold:</strong> Payments will only be processed when the Creator's accumulated balance reaches {revenue.get('currency', 'USD')} {revenue.get('minimum_payout_threshold', 50)}. Balances below this threshold will roll over to the next payment period.</p>
        <p><span class="clause-number">3.3</span> <strong>Currency:</strong> All payments shall be made in {revenue.get('currency', 'USD')}. Currency conversion fees, if applicable, shall be borne by the Creator.</p>
        <p><span class="clause-number">3.4</span> <strong>Payment Method:</strong> Payments will be made via the Creator's designated payment method on file (bank transfer, PayPal, or other approved methods).</p>
    </div>

    <div class="section">
        <h2>4. Tax Obligations</h2>
        <p><span class="clause-number">4.1</span> <strong>VAT/GST Handling:</strong> {vat_handling_text}</p>
        <p><span class="clause-number">4.2</span> <strong>Tax Documentation:</strong> Creator agrees to provide valid tax documentation (W-9, W-8BEN, VAT registration certificate, or equivalent) as required by applicable law before receiving payments.</p>
        <p><span class="clause-number">4.3</span> <strong>Withholding Taxes:</strong> The Platform reserves the right to withhold taxes as required by law. If withholding is required, the Platform will provide Creator with documentation of amounts withheld.</p>
        <p><span class="clause-number">4.4</span> <strong>Tax Jurisdiction:</strong> {tax.get('tax_jurisdiction') or 'Creator is responsible for compliance with tax laws in their jurisdiction of residence.'}</p>
        {f"<p><span class='clause-number'>4.5</span> <strong>Creator VAT Number:</strong> {tax.get('creator_vat_number')}</p>" if tax.get('creator_vat_number') else ''}
    </div>

    <div class="section">
        <h2>5. Content Rights & Ownership</h2>
        <p><span class="clause-number">5.1</span> <strong>Ownership:</strong> {ownership_text}</p>
        <p><span class="clause-number">5.2</span> <strong>Warranties:</strong> Creator warrants that all Content uploaded is original or properly licensed, does not infringe upon any third-party rights, and complies with all applicable laws.</p>
        <p><span class="clause-number">5.3</span> <strong>Indemnification:</strong> Creator shall indemnify and hold harmless the Platform from any claims arising from Creator's Content or breach of these warranties.</p>
    </div>

    <div class="section">
        <h2>6. Exclusivity</h2>
        <p>{exclusivity_text}</p>
    </div>

    <div class="section">
        <h2>7. Term & Termination</h2>
        <p><span class="clause-number">7.1</span> <strong>Initial Term:</strong> This Agreement shall commence on the Effective Date and continue for a period of {terms.get('duration_months', 12)} months.</p>
        <p><span class="clause-number">7.2</span> <strong>Renewal:</strong> {'This Agreement shall automatically renew for successive periods of equal length unless either party provides written notice of non-renewal at least ' + str(terms.get('termination_notice_days', 30)) + ' days prior to the end of the current term.' if terms.get('auto_renewal') else 'This Agreement shall not automatically renew. Parties must execute a new agreement to continue the partnership.'}</p>
        <p><span class="clause-number">7.3</span> <strong>Termination for Convenience:</strong> Either party may terminate this Agreement with {terms.get('termination_notice_days', 30)} days' written notice to the other party.</p>
        <p><span class="clause-number">7.4</span> <strong>Termination for Cause:</strong> Either party may terminate immediately upon material breach by the other party that remains uncured for 14 days after written notice.</p>
        <p><span class="clause-number">7.5</span> <strong>Effect of Termination:</strong> Upon termination, Creator's Content may remain on the Platform for a wind-down period of 30 days. All accrued but unpaid revenue shall be paid within 45 days of termination.</p>
    </div>

    <div class="section">
        <h2>8. Confidentiality</h2>
        <p>Both parties agree to keep confidential all non-public information disclosed during the term of this Agreement, including but not limited to revenue figures, business strategies, and user data. This obligation survives termination for a period of 2 years.</p>
    </div>

    <div class="section">
        <h2>9. Dispute Resolution</h2>
        <p><span class="clause-number">9.1</span> <strong>Negotiation:</strong> The parties shall attempt to resolve any dispute arising from this Agreement through good-faith negotiation.</p>
        <p><span class="clause-number">9.2</span> <strong>Mediation:</strong> If negotiation fails, the parties agree to submit the dispute to mediation before pursuing other remedies.</p>
        <p><span class="clause-number">9.3</span> <strong>Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction where the Platform is incorporated.</p>
    </div>

    <div class="section">
        <h2>10. General Provisions</h2>
        <p><span class="clause-number">10.1</span> <strong>Entire Agreement:</strong> This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations and agreements.</p>
        <p><span class="clause-number">10.2</span> <strong>Amendments:</strong> This Agreement may only be amended in writing signed by both parties.</p>
        <p><span class="clause-number">10.3</span> <strong>Assignment:</strong> Neither party may assign this Agreement without the prior written consent of the other party.</p>
        <p><span class="clause-number">10.4</span> <strong>Severability:</strong> If any provision is found invalid, the remaining provisions shall continue in full force and effect.</p>
        <p><span class="clause-number">10.5</span> <strong>Notices:</strong> All notices shall be in writing and sent to the addresses specified above or updated in writing.</p>
    </div>

    {"".join(f'<div class="section"><h2>11. Additional Terms</h2><p>{clause}</p></div>' for clause in (contract.get('additional_clauses') or [])) if contract.get('additional_clauses') else ''}

    <div class="signature-section">
        <h2>Signatures</h2>
        <p>IN WITNESS WHEREOF, the parties have executed this Agreement as of the date last signed below.</p>
        
        <div class="signature-block">
            <div class="signature">
                <div class="signature-line"></div>
                <label>Platform Representative Signature</label>
                <p style="margin-top: 10px;"><strong>{platform.get('name', '')}</strong></p>
                <p>Date: _____________________</p>
            </div>
            <div class="signature">
                <div class="signature-line"></div>
                <label>Creator Signature</label>
                <p style="margin-top: 10px;"><strong>{creator.get('name', '')}</strong></p>
                <p>Date: _____________________</p>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Contract ID: {contract.get('id', '')} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}</p>
        <p>This document was generated by Kona Streaming Platform</p>
    </div>
</body>
</html>
"""
    return html

# Default platform info endpoint
@router.get("/defaults/platform")
async def get_platform_defaults():
    """Get default platform information for contracts"""
    return {
        "name": "Kona Streaming Platform",
        "company_name": "Kona Media Inc.",
        "email": "partnerships@kona.com",
        "address": "",
        "default_revenue_terms": {
            "platform_fee_percent": 25,
            "creator_share_percent": 60,
            "platform_share_percent": 40,
            "minimum_payout_threshold": 50,
            "payout_frequency": "monthly",
            "currency": "USD"
        },
        "default_contract_terms": {
            "duration_months": 12,
            "auto_renewal": True,
            "exclusivity": False,
            "content_ownership": "creator",
            "termination_notice_days": 30
        },
        "default_tax_terms": {
            "vat_handling": "creator_responsible",
            "withholding_tax_percent": 0
        }
    }
