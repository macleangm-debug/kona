"""
Investment Calculator routes - Financial projections based on user growth
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/investment", tags=["investment"])

# Business Constants (based on industry benchmarks)
CONSTANTS = {
    "avg_revenue_per_user_monthly": 2.50,  # ARPU in USD
    "user_acquisition_cost": 1.20,  # CAC in USD
    "monthly_churn_rate": 0.05,  # 5% monthly churn
    "gross_margin": 0.65,  # 65% gross margin
    "operating_cost_per_user": 0.30,  # Monthly operating cost per user
    "content_cost_percentage": 0.25,  # 25% of revenue goes to content
    "payment_processing_fee": 0.029,  # 2.9% payment processing
    "infrastructure_base_cost": 5000,  # Base monthly infrastructure cost
    "infrastructure_per_user": 0.05,  # Per user infrastructure cost
    "support_cost_per_user": 0.10,  # Customer support cost per user
    "marketing_budget_percentage": 0.20,  # 20% of revenue for marketing
}

class InvestmentInput(BaseModel):
    current_users: int = 1000
    target_users: int = 100000
    monthly_growth_rate: float = 0.15  # 15% monthly growth
    months_to_project: int = 24
    initial_investment: Optional[float] = 50000

class MonthlyProjection(BaseModel):
    month: int
    users: int
    new_users: int
    churned_users: int
    revenue: float
    costs: float
    profit: float
    cumulative_profit: float
    roi_percentage: float

class InvestmentResult(BaseModel):
    summary: dict
    projections: list
    break_even_month: Optional[int]
    key_metrics: dict
    risk_factors: list
    recommendations: list

@router.post("/calculate", response_model=InvestmentResult)
async def calculate_investment(data: InvestmentInput):
    """Calculate investment projections based on user growth"""
    
    projections = []
    cumulative_profit = -data.initial_investment if data.initial_investment else 0
    break_even_month = None
    current_users = data.current_users
    total_revenue = 0
    total_costs = data.initial_investment or 0
    
    for month in range(1, data.months_to_project + 1):
        # Calculate user changes
        new_users = int(current_users * data.monthly_growth_rate)
        churned_users = int(current_users * CONSTANTS["monthly_churn_rate"])
        
        # Cap growth if approaching target
        if current_users + new_users - churned_users > data.target_users:
            new_users = data.target_users - current_users + churned_users
        
        current_users = max(0, current_users + new_users - churned_users)
        
        # Revenue calculation
        monthly_revenue = current_users * CONSTANTS["avg_revenue_per_user_monthly"]
        
        # Cost breakdown
        acquisition_cost = new_users * CONSTANTS["user_acquisition_cost"]
        content_cost = monthly_revenue * CONSTANTS["content_cost_percentage"]
        payment_fees = monthly_revenue * CONSTANTS["payment_processing_fee"]
        infrastructure_cost = CONSTANTS["infrastructure_base_cost"] + (current_users * CONSTANTS["infrastructure_per_user"])
        support_cost = current_users * CONSTANTS["support_cost_per_user"]
        operating_cost = current_users * CONSTANTS["operating_cost_per_user"]
        marketing_cost = monthly_revenue * CONSTANTS["marketing_budget_percentage"]
        
        monthly_costs = (
            acquisition_cost + content_cost + payment_fees + 
            infrastructure_cost + support_cost + operating_cost + marketing_cost
        )
        
        # Profit calculation
        monthly_profit = monthly_revenue - monthly_costs
        cumulative_profit += monthly_profit
        
        # Track totals
        total_revenue += monthly_revenue
        total_costs += monthly_costs
        
        # ROI calculation
        total_invested = data.initial_investment or 1
        roi = ((cumulative_profit + total_invested) / total_invested - 1) * 100
        
        # Check break-even
        if break_even_month is None and cumulative_profit >= 0:
            break_even_month = month
        
        projections.append({
            "month": month,
            "users": current_users,
            "new_users": new_users,
            "churned_users": churned_users,
            "revenue": round(monthly_revenue, 2),
            "costs": round(monthly_costs, 2),
            "profit": round(monthly_profit, 2),
            "cumulative_profit": round(cumulative_profit, 2),
            "roi_percentage": round(roi, 2)
        })
    
    # Calculate key metrics
    final_users = projections[-1]["users"] if projections else current_users
    ltv = CONSTANTS["avg_revenue_per_user_monthly"] * (1 / CONSTANTS["monthly_churn_rate"]) * CONSTANTS["gross_margin"]
    ltv_cac_ratio = ltv / CONSTANTS["user_acquisition_cost"]
    
    key_metrics = {
        "lifetime_value": round(ltv, 2),
        "customer_acquisition_cost": CONSTANTS["user_acquisition_cost"],
        "ltv_cac_ratio": round(ltv_cac_ratio, 2),
        "monthly_churn_rate": f"{CONSTANTS['monthly_churn_rate'] * 100}%",
        "gross_margin": f"{CONSTANTS['gross_margin'] * 100}%",
        "avg_revenue_per_user": CONSTANTS["avg_revenue_per_user_monthly"],
        "payback_period_months": round(CONSTANTS["user_acquisition_cost"] / (CONSTANTS["avg_revenue_per_user_monthly"] * CONSTANTS["gross_margin"]), 1)
    }
    
    # Summary
    summary = {
        "initial_investment": data.initial_investment or 0,
        "final_users": final_users,
        "total_revenue": round(total_revenue, 2),
        "total_costs": round(total_costs, 2),
        "net_profit": round(total_revenue - total_costs, 2),
        "final_roi": projections[-1]["roi_percentage"] if projections else 0,
        "break_even_month": break_even_month,
        "months_projected": data.months_to_project
    }
    
    # Risk factors
    risk_factors = [
        {"level": "HIGH" if data.monthly_growth_rate > 0.20 else "MEDIUM", 
         "factor": "Growth Rate Assumptions", 
         "description": f"{data.monthly_growth_rate*100}% monthly growth requires strong marketing execution"},
        {"level": "MEDIUM", 
         "factor": "Market Competition", 
         "description": "Netflix, ReelShort, and local players may affect user acquisition"},
        {"level": "LOW" if ltv_cac_ratio > 3 else "HIGH", 
         "factor": "Unit Economics", 
         "description": f"LTV:CAC ratio of {round(ltv_cac_ratio, 1)}x {'is healthy' if ltv_cac_ratio > 3 else 'needs improvement'}"},
        {"level": "MEDIUM", 
         "factor": "Content Costs", 
         "description": "Content licensing and creator payouts may increase with scale"},
        {"level": "LOW", 
         "factor": "Technical Infrastructure", 
         "description": "Cloud-based architecture scales efficiently with user growth"}
    ]
    
    # Recommendations
    recommendations = []
    if ltv_cac_ratio < 3:
        recommendations.append("Focus on reducing CAC through organic growth channels and referrals")
    if data.monthly_growth_rate > 0.20:
        recommendations.append("Consider more conservative growth projections for investor presentations")
    if break_even_month and break_even_month > 18:
        recommendations.append("Explore additional revenue streams to accelerate break-even")
    recommendations.append("Prioritize African markets where competition is lower and growth potential is high")
    recommendations.append("Invest in creator partnerships to secure exclusive content")
    
    return InvestmentResult(
        summary=summary,
        projections=projections,
        break_even_month=break_even_month,
        key_metrics=key_metrics,
        risk_factors=risk_factors,
        recommendations=recommendations
    )

@router.get("/benchmarks")
async def get_industry_benchmarks():
    """Get industry benchmark data for comparison"""
    return {
        "streaming_industry": {
            "avg_arpu": {"low": 1.50, "medium": 3.00, "high": 8.00},
            "avg_churn": {"low": 0.03, "medium": 0.05, "high": 0.08},
            "avg_cac": {"low": 0.80, "medium": 1.50, "high": 3.00},
            "ltv_cac_benchmark": {"poor": 1.5, "good": 3.0, "excellent": 5.0}
        },
        "kona_current": {
            "arpu": CONSTANTS["avg_revenue_per_user_monthly"],
            "churn": CONSTANTS["monthly_churn_rate"],
            "cac": CONSTANTS["user_acquisition_cost"],
            "gross_margin": CONSTANTS["gross_margin"]
        },
        "market_size": {
            "african_streaming_market_2025": "2.5B USD",
            "cagr": "15.2%",
            "mobile_penetration_africa": "46%",
            "target_addressable_market": "150M users"
        }
    }
