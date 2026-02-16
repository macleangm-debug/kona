"""
Payout Routes - Creator Payouts via Local Payment Channels
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from services import db, get_current_user
from services.payouts import payout_service, PayoutMethod, PayoutStatus, MOBILE_MONEY_PROVIDERS

router = APIRouter(prefix="/payouts", tags=["Payouts"])


# ============ PYDANTIC MODELS ============

class PayoutRequest(BaseModel):
    coins: int
    method: str  # "mobile_money" or "bank_transfer"
    country_code: str
    # Mobile Money fields
    phone_number: Optional[str] = None
    provider: Optional[str] = None  # mpesa, mtn_mobile_money, etc.
    # Bank Transfer fields
    account_number: Optional[str] = None
    bank_code: Optional[str] = None
    account_name: Optional[str] = None


class PayoutResponse(BaseModel):
    payout_id: str
    status: str
    message: str
    coins: int
    local_amount: float
    currency: str
    provider: str


# ============ ROUTES ============

@router.get("/options/{country_code}")
async def get_payout_options(country_code: str, user: dict = Depends(get_current_user)):
    """Get available payout options for a country"""
    return await payout_service.get_payout_options(country_code)


@router.get("/providers")
async def get_supported_countries():
    """Get list of supported countries for payouts"""
    countries = []
    for code, config in MOBILE_MONEY_PROVIDERS.items():
        countries.append({
            "code": code,
            "name": config["name"],
            "currency": config["currency"],
            "mobile_money_providers": config["providers"],
            "default_provider": config["default_provider"]
        })
    
    return {
        "countries": countries,
        "min_payout_coins": 500,
        "coin_to_usd_rate": 0.01
    }


@router.get("/banks/{country_code}")
async def get_banks(country_code: str, user: dict = Depends(get_current_user)):
    """Get list of banks for a country"""
    from services.payouts import flutterwave_payout
    return await flutterwave_payout.get_banks(country_code)


@router.post("/request")
async def request_payout(data: PayoutRequest, user: dict = Depends(get_current_user)):
    """Request a payout as a creator"""
    
    # Get creator profile
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator:
        raise HTTPException(status_code=403, detail="You must be a creator to request payouts")
    
    if creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Your creator account must be approved")
    
    # Check minimum payout
    if data.coins < 500:
        raise HTTPException(status_code=400, detail="Minimum payout is 500 coins")
    
    # Check available balance
    if creator.get("pending_payout", 0) < data.coins:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Available: {creator.get('pending_payout', 0)} coins"
        )
    
    # Validate payout method
    method = PayoutMethod.MOBILE_MONEY if data.method == "mobile_money" else PayoutMethod.BANK_TRANSFER
    
    # Build recipient details
    if method == PayoutMethod.MOBILE_MONEY:
        if not data.phone_number or not data.provider:
            raise HTTPException(status_code=400, detail="Phone number and provider required for mobile money")
        
        recipient_details = {
            "phone": data.phone_number,
            "provider": data.provider
        }
    else:
        if not data.account_number or not data.bank_code or not data.account_name:
            raise HTTPException(status_code=400, detail="Account details required for bank transfer")
        
        recipient_details = {
            "account_number": data.account_number,
            "bank_code": data.bank_code,
            "account_name": data.account_name
        }
    
    # Create payout
    result = await payout_service.create_payout(
        creator_id=creator["id"],
        coins=data.coins,
        country_code=data.country_code,
        method=method,
        recipient_details=recipient_details
    )
    
    # Generate payout ID
    payout_id = f"payout_{uuid.uuid4().hex[:12]}"
    
    # Save payout record
    payout_record = {
        "id": payout_id,
        "creator_id": creator["id"],
        "user_id": user["id"],
        "coins": data.coins,
        "local_amount": result["local_amount"],
        "currency": result["currency"],
        "method": data.method,
        "provider": result["provider"],
        "recipient_details": recipient_details,
        "reference": result["reference"],
        "status": PayoutStatus.PROCESSING.value,
        "provider_response": result["result"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.payouts.insert_one(payout_record)
    
    # Deduct from creator's pending payout
    await db.creators.update_one(
        {"id": creator["id"]},
        {"$inc": {"pending_payout": -data.coins}}
    )
    
    return {
        "payout_id": payout_id,
        "status": "processing",
        "message": "Payout initiated successfully" + (" (Mock - KwikPay pending)" if result["result"].get("mock") else ""),
        "coins": data.coins,
        "local_amount": result["local_amount"],
        "currency": result["currency"],
        "provider": result["provider"],
        "estimated_completion": "2-5 minutes for mobile money, 24-48 hours for bank transfer"
    }


@router.get("/history")
async def get_payout_history(user: dict = Depends(get_current_user)):
    """Get creator's payout history"""
    
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not creator:
        raise HTTPException(status_code=403, detail="You must be a creator to view payouts")
    
    payouts = await db.payouts.find(
        {"creator_id": creator["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {
        "payouts": payouts,
        "total_paid_out": sum(p["coins"] for p in payouts if p["status"] == "completed"),
        "pending_balance": creator.get("pending_payout", 0)
    }


@router.get("/{payout_id}")
async def get_payout_status(payout_id: str, user: dict = Depends(get_current_user)):
    """Get status of a specific payout"""
    
    payout = await db.payouts.find_one({"id": payout_id}, {"_id": 0})
    
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    if payout["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this payout")
    
    return payout


# ============ WEBHOOK HANDLERS ============

@router.post("/webhook/flutterwave")
async def flutterwave_webhook(request: Request):
    """Handle Flutterwave payout webhooks"""
    
    try:
        data = await request.json()
        
        # Verify webhook (in production, verify signature)
        reference = data.get("data", {}).get("reference", "")
        status = data.get("data", {}).get("status", "")
        
        if reference:
            # Update payout status
            new_status = PayoutStatus.COMPLETED.value if status == "successful" else PayoutStatus.FAILED.value
            
            await db.payouts.update_one(
                {"reference": reference},
                {"$set": {
                    "status": new_status,
                    "completed_at": datetime.now(timezone.utc).isoformat() if new_status == "completed" else None,
                    "webhook_data": data
                }}
            )
            
            # If failed, refund coins to creator
            if new_status == "failed":
                payout = await db.payouts.find_one({"reference": reference})
                if payout:
                    await db.creators.update_one(
                        {"id": payout["creator_id"]},
                        {"$inc": {"pending_payout": payout["coins"]}}
                    )
        
        return {"status": "received"}
    
    except Exception as e:
        print(f"Flutterwave webhook error: {e}")
        return {"status": "error"}


@router.post("/webhook/kwikpay")
async def kwikpay_webhook(request: Request):
    """
    Handle KwikPay payout webhooks
    MOCK - Ready for when KwikPay is developed
    """
    
    try:
        data = await request.json()
        
        reference = data.get("reference", "")
        status = data.get("status", "")
        transaction_id = data.get("transaction_id", "")
        
        if reference:
            new_status = PayoutStatus.COMPLETED.value if status == "completed" else PayoutStatus.FAILED.value
            
            await db.payouts.update_one(
                {"reference": reference},
                {"$set": {
                    "status": new_status,
                    "completed_at": datetime.now(timezone.utc).isoformat() if new_status == "completed" else None,
                    "provider_transaction_id": transaction_id,
                    "webhook_data": data
                }}
            )
            
            # If failed, refund coins
            if new_status == "failed":
                payout = await db.payouts.find_one({"reference": reference})
                if payout:
                    await db.creators.update_one(
                        {"id": payout["creator_id"]},
                        {"$inc": {"pending_payout": payout["coins"]}}
                    )
        
        return {"status": "received"}
    
    except Exception as e:
        print(f"KwikPay webhook error: {e}")
        return {"status": "error"}
