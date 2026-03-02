"""
Creator Shop & Tips Routes
Handles creator monetization: tips, digital items, and physical merchandise
"""
import uuid
import base64
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from pydantic import BaseModel
import os

from services import db
from services.auth import get_current_user

router = APIRouter(prefix="/creators", tags=["CreatorShop"])

# ============ PLATFORM SETTINGS ============

async def get_platform_settings():
    """Get platform commission settings"""
    settings = await db.platform_settings.find_one({"id": "commission_rates"})
    if not settings:
        # Default: 75% to creator, 25% platform fee
        return {
            "tip_creator_percent": 75,
            "shop_creator_percent": 75
        }
    return settings

async def get_creator_percent(setting_type: str) -> float:
    """Get the creator percentage for tips or shop purchases"""
    settings = await get_platform_settings()
    if setting_type == "tip":
        return settings.get("tip_creator_percent", 75) / 100.0
    elif setting_type == "shop":
        return settings.get("shop_creator_percent", 75) / 100.0
    return 0.75  # Default 75%

# ============ MODELS ============

class SendTip(BaseModel):
    amount: int  # Coins
    message: Optional[str] = None

class CreateShopItem(BaseModel):
    type: str  # "digital" or "physical"
    title: str
    description: Optional[str] = None
    price_coins: int
    image_url: Optional[str] = None
    stock: Optional[int] = None  # None = unlimited (for digital)
    delivery_method: str = "download"  # download, email, shipping
    download_url: Optional[str] = None  # For digital items
    
class UpdateShopItem(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price_coins: Optional[int] = None
    image_url: Optional[str] = None
    stock: Optional[int] = None
    active: Optional[bool] = None
    download_url: Optional[str] = None

class PurchaseItem(BaseModel):
    shipping_address: Optional[dict] = None  # For physical items
    email: Optional[str] = None  # For email delivery

# ============ TIPS ============

@router.post("/{creator_id}/tip")
async def send_tip_to_creator(
    creator_id: str,
    data: SendTip,
    user: dict = Depends(get_current_user)
):
    """Send a coin tip to a creator"""
    if data.amount < 1:
        raise HTTPException(status_code=400, detail="Tip amount must be at least 1 coin")
    
    if data.amount > 10000:
        raise HTTPException(status_code=400, detail="Maximum tip is 10,000 coins")
    
    # Check creator exists
    creator = await db.creators.find_one({"id": creator_id, "status": "approved"})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Check user has enough coins
    if user.get("coins", 0) < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Deduct from user
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"coins": -data.amount}}
    )
    
    # Get configurable creator percentage
    creator_percent = await get_creator_percent("tip")
    creator_amount = int(data.amount * creator_percent)
    
    await db.creators.update_one(
        {"id": creator_id},
        {"$inc": {"coins_balance": creator_amount, "total_tips": data.amount}}
    )
    
    # Record the tip
    tip_id = f"tip-{uuid.uuid4().hex[:12]}"
    tip_record = {
        "id": tip_id,
        "type": "profile_tip",
        "from_user_id": user["id"],
        "from_username": user.get("username", "Anonymous"),
        "from_avatar": user.get("avatar_url"),
        "to_creator_id": creator_id,
        "to_creator_name": creator.get("display_name"),
        "amount": data.amount,
        "creator_received": creator_amount,
        "platform_fee": data.amount - creator_amount,
        "message": data.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tips.insert_one(tip_record)
    
    # Create notification for creator
    await db.notifications.insert_one({
        "id": f"notif-{uuid.uuid4().hex[:12]}",
        "user_id": creator.get("user_id"),
        "type": "tip_received",
        "title": "You received a tip!",
        "message": f"{user.get('username', 'Someone')} sent you {data.amount} coins" + (f": \"{data.message}\"" if data.message else ""),
        "data": {"tip_id": tip_id, "amount": data.amount},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "tip_id": tip_id,
        "amount": data.amount,
        "new_balance": user.get("coins", 0) - data.amount,
        "message": f"Sent {data.amount} coins to {creator.get('display_name')}"
    }

@router.get("/{creator_id}/tips/recent")
async def get_recent_tips(creator_id: str, limit: int = Query(10, le=50)):
    """Get recent tips for a creator (public, for display)"""
    tips = await db.tips.find(
        {"to_creator_id": creator_id},
        {"_id": 0, "from_username": 1, "from_avatar": 1, "amount": 1, "message": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return tips

# ============ SHOP ITEMS ============

@router.get("/{creator_id}/shop")
async def get_creator_shop(
    creator_id: str,
    item_type: Optional[str] = None,  # "digital" or "physical"
    limit: int = Query(20, le=50)
):
    """Get all shop items for a creator"""
    query = {"creator_id": creator_id, "active": True}
    if item_type:
        query["type"] = item_type
    
    items = await db.shop_items.find(
        query,
        {"_id": 0, "download_url": 0}  # Don't expose download URL in listing
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get creator info
    creator = await db.creators.find_one(
        {"id": creator_id},
        {"_id": 0, "display_name": 1, "avatar_url": 1}
    )
    
    return {
        "creator": creator,
        "items": items,
        "digital_count": len([i for i in items if i.get("type") == "digital"]),
        "physical_count": len([i for i in items if i.get("type") == "physical"])
    }

@router.get("/{creator_id}/shop/items/{item_id}")
async def get_shop_item(creator_id: str, item_id: str):
    """Get details of a specific shop item"""
    item = await db.shop_items.find_one(
        {"id": item_id, "creator_id": creator_id, "active": True},
        {"_id": 0, "download_url": 0}
    )
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get purchase count
    purchase_count = await db.purchases.count_documents({"item_id": item_id})
    item["purchase_count"] = purchase_count
    
    return item

@router.post("/{creator_id}/shop/items")
async def create_shop_item(
    creator_id: str,
    data: CreateShopItem,
    user: dict = Depends(get_current_user)
):
    """Create a new shop item (creator only)"""
    # Verify user is the creator
    creator = await db.creators.find_one({"id": creator_id, "user_id": user["id"]})
    if not creator:
        raise HTTPException(status_code=403, detail="Not authorized to manage this shop")
    
    if data.price_coins < 1:
        raise HTTPException(status_code=400, detail="Price must be at least 1 coin")
    
    if data.type not in ["digital", "physical"]:
        raise HTTPException(status_code=400, detail="Type must be 'digital' or 'physical'")
    
    item_id = f"item-{uuid.uuid4().hex[:12]}"
    item = {
        "id": item_id,
        "creator_id": creator_id,
        "type": data.type,
        "title": data.title,
        "description": data.description,
        "price_coins": data.price_coins,
        "image_url": data.image_url,
        "stock": data.stock,
        "sold_count": 0,
        "delivery_method": data.delivery_method,
        "download_url": data.download_url if data.type == "digital" else None,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.shop_items.insert_one(item)
    item.pop("_id", None)
    item.pop("download_url", None)  # Don't return download URL
    
    return {"message": "Item created", "item": item}

@router.patch("/{creator_id}/shop/items/{item_id}")
async def update_shop_item(
    creator_id: str,
    item_id: str,
    data: UpdateShopItem,
    user: dict = Depends(get_current_user)
):
    """Update a shop item (creator only)"""
    # Verify user is the creator
    creator = await db.creators.find_one({"id": creator_id, "user_id": user["id"]})
    if not creator:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item = await db.shop_items.find_one({"id": item_id, "creator_id": creator_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.shop_items.update_one({"id": item_id}, {"$set": update_data})
    
    return {"message": "Item updated"}

@router.delete("/{creator_id}/shop/items/{item_id}")
async def delete_shop_item(
    creator_id: str,
    item_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete/deactivate a shop item (creator only)"""
    creator = await db.creators.find_one({"id": creator_id, "user_id": user["id"]})
    if not creator:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.shop_items.update_one(
        {"id": item_id, "creator_id": creator_id},
        {"$set": {"active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted"}

# ============ PURCHASES ============

@router.post("/{creator_id}/shop/purchase/{item_id}")
async def purchase_shop_item(
    creator_id: str,
    item_id: str,
    data: PurchaseItem,
    user: dict = Depends(get_current_user)
):
    """Purchase a shop item with coins"""
    # Get item
    item = await db.shop_items.find_one({"id": item_id, "creator_id": creator_id, "active": True})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check stock for physical items
    if item.get("type") == "physical":
        if item.get("stock") is not None and item.get("stock") <= 0:
            raise HTTPException(status_code=400, detail="Item out of stock")
        if not data.shipping_address:
            raise HTTPException(status_code=400, detail="Shipping address required for physical items")
    
    # Check user has enough coins
    price = item.get("price_coins", 0)
    if user.get("coins", 0) < price:
        raise HTTPException(status_code=400, detail="Insufficient coins")
    
    # Check if user already purchased (for digital items, optional re-purchase)
    existing = await db.purchases.find_one({
        "user_id": user["id"],
        "item_id": item_id,
        "type": "digital"
    })
    if existing and item.get("type") == "digital":
        # Return existing purchase for digital items
        return {
            "success": True,
            "message": "You already own this item",
            "purchase_id": existing["id"],
            "download_url": item.get("download_url") if item.get("delivery_method") == "download" else None,
            "already_owned": True
        }
    
    # Deduct coins from user
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"coins": -price}}
    )
    
    # Get configurable creator percentage
    creator_percent = await get_creator_percent("shop")
    creator_amount = int(price * creator_percent)
    
    await db.creators.update_one(
        {"id": creator_id},
        {"$inc": {"coins_balance": creator_amount, "shop_revenue": price}}
    )
    
    # Update item stock and sold count
    update_query = {"$inc": {"sold_count": 1}}
    if item.get("stock") is not None:
        update_query["$inc"]["stock"] = -1
    await db.shop_items.update_one({"id": item_id}, update_query)
    
    # Create purchase record
    purchase_id = f"purchase-{uuid.uuid4().hex[:12]}"
    purchase = {
        "id": purchase_id,
        "user_id": user["id"],
        "user_email": user.get("email"),
        "creator_id": creator_id,
        "item_id": item_id,
        "item_title": item.get("title"),
        "item_type": item.get("type"),
        "price_paid": price,
        "creator_received": creator_amount,
        "delivery_method": item.get("delivery_method"),
        "shipping_address": data.shipping_address if item.get("type") == "physical" else None,
        "delivery_email": data.email,
        "status": "completed" if item.get("type") == "digital" else "pending",  # Physical items need fulfillment
        "download_url": item.get("download_url") if item.get("type") == "digital" else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.purchases.insert_one(purchase)
    
    # Notify creator
    await db.notifications.insert_one({
        "id": f"notif-{uuid.uuid4().hex[:12]}",
        "user_id": (await db.creators.find_one({"id": creator_id})).get("user_id"),
        "type": "shop_sale",
        "title": "New sale!",
        "message": f"{user.get('username', 'Someone')} purchased \"{item.get('title')}\" for {price} coins",
        "data": {"purchase_id": purchase_id, "item_id": item_id},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "purchase_id": purchase_id,
        "message": f"Successfully purchased {item.get('title')}",
        "new_balance": user.get("coins", 0) - price,
        "download_url": item.get("download_url") if item.get("type") == "digital" and item.get("delivery_method") == "download" else None,
        "delivery_method": item.get("delivery_method"),
        "status": purchase["status"]
    }

@router.get("/shop/my-purchases")
async def get_my_purchases(
    user: dict = Depends(get_current_user),
    item_type: Optional[str] = None,
    limit: int = Query(50, le=100)
):
    """Get user's purchase history"""
    query = {"user_id": user["id"]}
    if item_type:
        query["item_type"] = item_type
    
    purchases = await db.purchases.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return purchases

@router.get("/shop/purchases/{purchase_id}")
async def get_purchase_details(
    purchase_id: str,
    user: dict = Depends(get_current_user)
):
    """Get details of a specific purchase"""
    purchase = await db.purchases.find_one(
        {"id": purchase_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    return purchase

# ============ CREATOR SHOP MANAGEMENT ============

@router.get("/shop/my-items")
async def get_my_shop_items(
    user: dict = Depends(get_current_user),
    include_inactive: bool = False
):
    """Get creator's own shop items"""
    creator = await db.creators.find_one({"user_id": user["id"]})
    if not creator:
        raise HTTPException(status_code=403, detail="Not a creator")
    
    query = {"creator_id": creator["id"]}
    if not include_inactive:
        query["active"] = True
    
    items = await db.shop_items.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get sales stats
    total_sales = sum(i.get("sold_count", 0) for i in items)
    total_revenue = await db.purchases.aggregate([
        {"$match": {"creator_id": creator["id"]}},
        {"$group": {"_id": None, "total": {"$sum": "$creator_received"}}}
    ]).to_list(1)
    
    return {
        "items": items,
        "stats": {
            "total_items": len(items),
            "total_sales": total_sales,
            "total_revenue": total_revenue[0]["total"] if total_revenue else 0
        }
    }

@router.get("/shop/my-orders")
async def get_my_orders(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = Query(50, le=100)
):
    """Get orders for creator's shop items (for fulfillment)"""
    creator = await db.creators.find_one({"user_id": user["id"]})
    if not creator:
        raise HTTPException(status_code=403, detail="Not a creator")
    
    query = {"creator_id": creator["id"]}
    if status:
        query["status"] = status
    
    orders = await db.purchases.find(
        query,
        {"_id": 0, "download_url": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return orders

@router.patch("/shop/orders/{purchase_id}/fulfill")
async def fulfill_order(
    purchase_id: str,
    tracking_number: Optional[str] = None,
    notes: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Mark a physical order as fulfilled/shipped"""
    creator = await db.creators.find_one({"user_id": user["id"]})
    if not creator:
        raise HTTPException(status_code=403, detail="Not a creator")
    
    purchase = await db.purchases.find_one({
        "id": purchase_id,
        "creator_id": creator["id"],
        "item_type": "physical"
    })
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.purchases.update_one(
        {"id": purchase_id},
        {"$set": {
            "status": "shipped",
            "tracking_number": tracking_number,
            "fulfillment_notes": notes,
            "fulfilled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify buyer
    await db.notifications.insert_one({
        "id": f"notif-{uuid.uuid4().hex[:12]}",
        "user_id": purchase["user_id"],
        "type": "order_shipped",
        "title": "Your order has shipped!",
        "message": f"Your order \"{purchase.get('item_title')}\" has been shipped" + (f". Tracking: {tracking_number}" if tracking_number else ""),
        "data": {"purchase_id": purchase_id},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Order marked as shipped"}



# ============ IMAGE UPLOAD ============

UPLOAD_DIR = "/app/uploads/shop_images"

@router.post("/shop/upload-image")
async def upload_shop_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload an image for shop item (PNG, JPG, WEBP)"""
    # Verify user is a creator
    creator = await db.creators.find_one({"user_id": user["id"]})
    if not creator:
        raise HTTPException(status_code=403, detail="Not a creator")
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPG, WEBP")
    
    # Read file content
    content = await file.read()
    
    # Check file size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
    
    # Create upload directory if it doesn't exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    image_id = f"shop-img-{uuid.uuid4().hex[:12]}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, image_id)
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Return the URL (will be served via API)
    image_url = f"/api/creators/shop/images/{image_id}"
    
    return {
        "success": True,
        "image_id": image_id,
        "image_url": image_url
    }

@router.get("/shop/images/{image_id}")
async def get_shop_image(image_id: str):
    """Serve a shop item image"""
    from fastapi.responses import FileResponse
    
    file_path = os.path.join(UPLOAD_DIR, image_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Determine content type
    ext = image_id.split(".")[-1].lower()
    content_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp"
    }
    
    return FileResponse(
        file_path, 
        media_type=content_types.get(ext, "image/png"),
        headers={"Cache-Control": "public, max-age=31536000"}
    )
