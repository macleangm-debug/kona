"""
Promo routes (public)
"""
from fastapi import APIRouter

from services import db

router = APIRouter(tags=["Promos"])

@router.get("/promos/active")
async def get_active_promos():
    """Get active promotional content"""
    promos = await db.featured_promos.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("priority", -1).to_list(10)
    return promos
