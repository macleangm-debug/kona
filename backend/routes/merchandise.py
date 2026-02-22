"""
Merchandise Store Routes
- Creator merchandise management
- User shopping and orders
- Coin-based payments
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from services.database import db
from routes.auth import get_current_user
from models.merchandise import (
    MerchandiseType, MerchandiseCategory, OrderStatus,
    MerchandiseItemCreate, MerchandiseItemUpdate, MerchandiseItemResponse,
    ShippingAddressCreate, ShippingAddressResponse,
    OrderCreate, OrderItemCreate, OrderResponse, OrderStatusUpdate
)

router = APIRouter(prefix="/merchandise", tags=["merchandise"])


# ============ HELPER FUNCTIONS ============

async def get_platform_fee_percent():
    """Get platform fee percentage from admin settings"""
    settings = await db.platform_settings.find_one({"type": "revenue"}, {"_id": 0})
    return settings.get("merchandise_platform_fee", 15) if settings else 15  # Default 15%


async def get_creator_or_403(user: dict):
    """Get creator profile or raise 403"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if not creator or creator.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    return creator


# ============ MERCHANDISE MANAGEMENT (CREATOR) ============

@router.post("/items")
async def create_merchandise_item(
    item: MerchandiseItemCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new merchandise item"""
    creator = await get_creator_or_403(user)
    
    item_id = f"merch-{uuid.uuid4().hex[:12]}"
    
    item_doc = {
        "id": item_id,
        "creator_id": creator["id"],
        "creator_name": creator.get("display_name") or user.get("username", "Creator"),
        "name": item.name,
        "description": item.description,
        "type": item.type.value,
        "category": item.category.value,
        "price_coins": item.price_coins,
        "images": item.images,
        "sizes": item.sizes,
        "colors": item.colors,
        "weight_grams": item.weight_grams,
        "stock_quantity": item.stock_quantity,
        "download_url": item.download_url,
        "preview_url": item.preview_url,
        "file_type": item.file_type,
        "series_id": item.series_id,
        "is_limited_edition": item.is_limited_edition,
        "limited_quantity": item.limited_quantity,
        "sold_count": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Get series title if linked
    if item.series_id:
        series = await db.creator_series.find_one({"id": item.series_id}, {"_id": 0, "title": 1})
        if series:
            item_doc["series_title"] = series["title"]
    
    await db.merchandise.insert_one(item_doc)
    
    return {"message": "Merchandise item created", "item_id": item_id, "item": item_doc}


@router.get("/items/my")
async def get_my_merchandise(
    user: dict = Depends(get_current_user),
    include_inactive: bool = False
):
    """Get all merchandise items for the current creator"""
    creator = await get_creator_or_403(user)
    
    query = {"creator_id": creator["id"]}
    if not include_inactive:
        query["is_active"] = True
    
    items = await db.merchandise.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"items": items, "count": len(items)}


@router.patch("/items/{item_id}")
async def update_merchandise_item(
    item_id: str,
    update: MerchandiseItemUpdate,
    user: dict = Depends(get_current_user)
):
    """Update a merchandise item"""
    creator = await get_creator_or_403(user)
    
    item = await db.merchandise.find_one({"id": item_id, "creator_id": creator["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.merchandise.update_one({"id": item_id}, {"$set": update_data})
    
    return {"message": "Item updated", "item_id": item_id}


@router.delete("/items/{item_id}")
async def delete_merchandise_item(
    item_id: str,
    user: dict = Depends(get_current_user)
):
    """Soft delete a merchandise item"""
    creator = await get_creator_or_403(user)
    
    result = await db.merchandise.update_one(
        {"id": item_id, "creator_id": creator["id"]},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted"}


# ============ SHOP (USER BROWSING) ============

@router.get("/shop")
async def browse_merchandise(
    category: Optional[MerchandiseCategory] = None,
    type: Optional[MerchandiseType] = None,
    creator_id: Optional[str] = None,
    series_id: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    sort_by: str = Query(default="popular", description="popular, newest, price_low, price_high"),
    page: int = 1,
    limit: int = 20
):
    """Browse merchandise shop"""
    query = {"is_active": True}
    
    if category:
        query["category"] = category.value
    if type:
        query["type"] = type.value
    if creator_id:
        query["creator_id"] = creator_id
    if series_id:
        query["series_id"] = series_id
    if min_price:
        query["price_coins"] = {"$gte": min_price}
    if max_price:
        query.setdefault("price_coins", {})["$lte"] = max_price
    
    # Sorting
    sort_field = "sold_count"
    sort_order = -1
    if sort_by == "newest":
        sort_field = "created_at"
    elif sort_by == "price_low":
        sort_field = "price_coins"
        sort_order = 1
    elif sort_by == "price_high":
        sort_field = "price_coins"
    
    skip = (page - 1) * limit
    items = await db.merchandise.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
    total = await db.merchandise.count_documents(query)
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/shop/{item_id}")
async def get_merchandise_item(item_id: str):
    """Get single merchandise item details"""
    item = await db.merchandise.find_one({"id": item_id, "is_active": True}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get creator info
    creator = await db.creators.find_one({"id": item["creator_id"]}, {"_id": 0, "display_name": 1, "avatar_url": 1})
    if creator:
        item["creator_avatar"] = creator.get("avatar_url")
    
    return item


@router.get("/shop/creator/{creator_id}")
async def get_creator_shop(creator_id: str):
    """Get all merchandise from a specific creator"""
    items = await db.merchandise.find(
        {"creator_id": creator_id, "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    creator = await db.creators.find_one({"id": creator_id}, {"_id": 0, "display_name": 1, "avatar_url": 1})
    
    return {
        "items": items,
        "creator": creator,
        "count": len(items)
    }


# ============ SHIPPING ADDRESSES ============

@router.post("/addresses")
async def create_shipping_address(
    address: ShippingAddressCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new shipping address"""
    address_id = f"addr-{uuid.uuid4().hex[:12]}"
    
    # If this is set as default, unset other defaults
    if address.is_default:
        await db.shipping_addresses.update_many(
            {"user_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    address_doc = {
        "id": address_id,
        "user_id": user["id"],
        **address.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.shipping_addresses.insert_one(address_doc)
    
    return {"message": "Address created", "address_id": address_id}


@router.get("/addresses")
async def get_my_addresses(user: dict = Depends(get_current_user)):
    """Get all shipping addresses for current user"""
    addresses = await db.shipping_addresses.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(10)
    
    return {"addresses": addresses}


@router.delete("/addresses/{address_id}")
async def delete_shipping_address(
    address_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a shipping address"""
    result = await db.shipping_addresses.delete_one({
        "id": address_id,
        "user_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    
    return {"message": "Address deleted"}


# ============ ORDERS ============

@router.post("/orders")
async def create_order(
    order: OrderCreate,
    user: dict = Depends(get_current_user)
):
    """Place a merchandise order"""
    # Validate items and calculate total
    order_items = []
    total_coins = 0
    has_physical = False
    creator_id = None
    
    for item_req in order.items:
        item = await db.merchandise.find_one({"id": item_req.merchandise_id, "is_active": True}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_req.merchandise_id} not found")
        
        # Check stock for physical items
        if item["type"] == "physical":
            has_physical = True
            if item.get("stock_quantity") is not None and item["stock_quantity"] < item_req.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {item['name']}")
            
            # Validate size/color if required
            if item.get("sizes") and item_req.size not in item["sizes"]:
                raise HTTPException(status_code=400, detail=f"Invalid size for {item['name']}")
            if item.get("colors") and item_req.color not in item["colors"]:
                raise HTTPException(status_code=400, detail=f"Invalid color for {item['name']}")
        
        # All items must be from the same creator
        if creator_id is None:
            creator_id = item["creator_id"]
        elif creator_id != item["creator_id"]:
            raise HTTPException(status_code=400, detail="All items must be from the same creator")
        
        item_total = item["price_coins"] * item_req.quantity
        total_coins += item_total
        
        order_items.append({
            "merchandise_id": item["id"],
            "merchandise_name": item["name"],
            "merchandise_type": item["type"],
            "quantity": item_req.quantity,
            "size": item_req.size,
            "color": item_req.color,
            "unit_price_coins": item["price_coins"],
            "total_price_coins": item_total,
            "download_url": item.get("download_url") if item["type"] == "digital" else None
        })
    
    # Require shipping address for physical items
    if has_physical:
        if not order.shipping_address_id:
            raise HTTPException(status_code=400, detail="Shipping address required for physical items")
        
        address = await db.shipping_addresses.find_one({
            "id": order.shipping_address_id,
            "user_id": user["id"]
        }, {"_id": 0})
        
        if not address:
            raise HTTPException(status_code=404, detail="Shipping address not found")
    else:
        address = None
    
    # Check user has enough coins
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0, "coins": 1})
    if user_data.get("coins", 0) < total_coins:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Calculate platform fee
    platform_fee_percent = await get_platform_fee_percent()
    platform_fee = int(total_coins * platform_fee_percent / 100)
    creator_earnings = total_coins - platform_fee
    
    # Create order
    order_id = f"order-{uuid.uuid4().hex[:12]}"
    
    order_doc = {
        "id": order_id,
        "user_id": user["id"],
        "creator_id": creator_id,
        "items": order_items,
        "total_coins": total_coins,
        "platform_fee_coins": platform_fee,
        "creator_earnings_coins": creator_earnings,
        "status": OrderStatus.CONFIRMED.value if not has_physical else OrderStatus.PENDING.value,
        "shipping_address": address,
        "tracking_number": None,
        "tracking_url": None,
        "notes": order.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "shipped_at": None,
        "delivered_at": None
    }
    
    # Deduct coins from user
    await db.users.update_one({"id": user["id"]}, {"$inc": {"coins": -total_coins}})
    
    # Add earnings to creator
    await db.creators.update_one({"id": creator_id}, {"$inc": {"merchandise_earnings": creator_earnings}})
    
    # Update stock and sold count
    for item_req in order.items:
        await db.merchandise.update_one(
            {"id": item_req.merchandise_id},
            {
                "$inc": {
                    "sold_count": item_req.quantity,
                    "stock_quantity": -item_req.quantity if has_physical else 0
                }
            }
        )
    
    await db.merchandise_orders.insert_one(order_doc)
    
    return {
        "message": "Order placed successfully",
        "order_id": order_id,
        "total_coins": total_coins,
        "order": order_doc
    }


@router.get("/orders/my")
async def get_my_orders(
    user: dict = Depends(get_current_user),
    status: Optional[OrderStatus] = None
):
    """Get all orders for current user"""
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status.value
    
    orders = await db.merchandise_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return {"orders": orders, "count": len(orders)}


@router.get("/orders/{order_id}")
async def get_order(
    order_id: str,
    user: dict = Depends(get_current_user)
):
    """Get specific order details"""
    order = await db.merchandise_orders.find_one({
        "id": order_id,
        "$or": [{"user_id": user["id"]}, {"creator_id": user.get("creator_id")}]
    }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order


# ============ ORDER MANAGEMENT (CREATOR) ============

@router.get("/orders/creator/pending")
async def get_creator_pending_orders(user: dict = Depends(get_current_user)):
    """Get pending orders for creator"""
    creator = await get_creator_or_403(user)
    
    orders = await db.merchandise_orders.find({
        "creator_id": creator["id"],
        "status": {"$in": [OrderStatus.PENDING.value, OrderStatus.CONFIRMED.value, OrderStatus.PROCESSING.value]}
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"orders": orders, "count": len(orders)}


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    user: dict = Depends(get_current_user)
):
    """Update order status (creator or admin)"""
    creator = await get_creator_or_403(user)
    
    order = await db.merchandise_orders.find_one({
        "id": order_id,
        "creator_id": creator["id"]
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "status": status_update.status.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status_update.tracking_number:
        update_data["tracking_number"] = status_update.tracking_number
    if status_update.tracking_url:
        update_data["tracking_url"] = status_update.tracking_url
    if status_update.notes:
        update_data["notes"] = status_update.notes
    
    if status_update.status == OrderStatus.SHIPPED:
        update_data["shipped_at"] = datetime.now(timezone.utc).isoformat()
    elif status_update.status == OrderStatus.DELIVERED:
        update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.merchandise_orders.update_one({"id": order_id}, {"$set": update_data})
    
    return {"message": "Order status updated", "status": status_update.status.value}


# ============ ANALYTICS ============

@router.get("/analytics")
async def get_merchandise_analytics(user: dict = Depends(get_current_user)):
    """Get merchandise analytics for creator"""
    creator = await get_creator_or_403(user)
    
    # Total items
    total_items = await db.merchandise.count_documents({"creator_id": creator["id"], "is_active": True})
    
    # Total sales
    pipeline = [
        {"$match": {"creator_id": creator["id"]}},
        {"$group": {
            "_id": None,
            "total_orders": {"$sum": 1},
            "total_revenue": {"$sum": "$creator_earnings_coins"},
            "total_items_sold": {"$sum": {"$sum": "$items.quantity"}}
        }}
    ]
    
    sales_stats = await db.merchandise_orders.aggregate(pipeline).to_list(1)
    stats = sales_stats[0] if sales_stats else {"total_orders": 0, "total_revenue": 0, "total_items_sold": 0}
    
    # Top selling items
    top_items = await db.merchandise.find(
        {"creator_id": creator["id"], "is_active": True},
        {"_id": 0, "id": 1, "name": 1, "sold_count": 1, "price_coins": 1}
    ).sort("sold_count", -1).limit(5).to_list(5)
    
    return {
        "total_items": total_items,
        "total_orders": stats.get("total_orders", 0),
        "total_revenue_coins": stats.get("total_revenue", 0),
        "total_items_sold": stats.get("total_items_sold", 0),
        "top_selling_items": top_items
    }
