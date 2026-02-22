"""
Merchandise Store Models
- Physical and digital goods
- Coin-based payments
- Order management with shipping
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class MerchandiseType(str, Enum):
    PHYSICAL = "physical"
    DIGITAL = "digital"


class MerchandiseCategory(str, Enum):
    # Physical goods
    APPAREL = "apparel"  # T-shirts, hoodies, caps
    ACCESSORIES = "accessories"  # Phone cases, bags, keychains
    POSTERS = "posters"  # Posters, prints
    COLLECTIBLES = "collectibles"  # Figurines, limited editions
    # Digital goods
    WALLPAPERS = "wallpapers"
    BEHIND_SCENES = "behind_scenes"
    SOUNDTRACK = "soundtrack"
    SCRIPTS = "scripts"
    DIGITAL_ART = "digital_art"
    EXCLUSIVE_CONTENT = "exclusive_content"
    SHOUTOUTS = "shoutouts"


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


# ============ MERCHANDISE ITEM MODELS ============

class MerchandiseItemCreate(BaseModel):
    """Create a new merchandise item"""
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., max_length=1000)
    type: MerchandiseType
    category: MerchandiseCategory
    price_coins: int = Field(..., ge=1)
    images: List[str] = []  # URLs to product images
    
    # Physical product fields
    sizes: Optional[List[str]] = None  # S, M, L, XL, etc.
    colors: Optional[List[str]] = None
    weight_grams: Optional[int] = None
    stock_quantity: Optional[int] = None
    
    # Digital product fields
    download_url: Optional[str] = None
    preview_url: Optional[str] = None
    file_type: Optional[str] = None  # mp4, jpg, pdf, etc.
    
    # Linking
    series_id: Optional[str] = None  # Link to specific series
    is_limited_edition: bool = False
    limited_quantity: Optional[int] = None


class MerchandiseItemUpdate(BaseModel):
    """Update merchandise item"""
    name: Optional[str] = None
    description: Optional[str] = None
    price_coins: Optional[int] = None
    images: Optional[List[str]] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    stock_quantity: Optional[int] = None
    download_url: Optional[str] = None
    is_active: Optional[bool] = None


class MerchandiseItemResponse(BaseModel):
    """Merchandise item response"""
    id: str
    creator_id: str
    creator_name: str
    name: str
    description: str
    type: MerchandiseType
    category: MerchandiseCategory
    price_coins: int
    images: List[str]
    sizes: Optional[List[str]]
    colors: Optional[List[str]]
    stock_quantity: Optional[int]
    download_url: Optional[str]
    preview_url: Optional[str]
    series_id: Optional[str]
    series_title: Optional[str]
    is_limited_edition: bool
    limited_quantity: Optional[int]
    sold_count: int
    is_active: bool
    created_at: str


# ============ SHIPPING ADDRESS MODELS ============

class ShippingAddressCreate(BaseModel):
    """Create shipping address"""
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=5, max_length=20)
    address_line1: str = Field(..., min_length=5, max_length=200)
    address_line2: Optional[str] = None
    city: str = Field(..., min_length=2, max_length=100)
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = Field(..., min_length=2, max_length=100)
    is_default: bool = False


class ShippingAddressResponse(BaseModel):
    """Shipping address response"""
    id: str
    user_id: str
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str]
    city: str
    state_province: Optional[str]
    postal_code: Optional[str]
    country: str
    is_default: bool
    created_at: str


# ============ ORDER MODELS ============

class OrderItemCreate(BaseModel):
    """Single item in an order"""
    merchandise_id: str
    quantity: int = Field(default=1, ge=1, le=10)
    size: Optional[str] = None
    color: Optional[str] = None


class OrderCreate(BaseModel):
    """Create a new order"""
    items: List[OrderItemCreate]
    shipping_address_id: Optional[str] = None  # Required for physical goods
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    """Order item in response"""
    merchandise_id: str
    merchandise_name: str
    merchandise_type: MerchandiseType
    quantity: int
    size: Optional[str]
    color: Optional[str]
    unit_price_coins: int
    total_price_coins: int
    download_url: Optional[str]  # For digital goods after purchase


class OrderResponse(BaseModel):
    """Order response"""
    id: str
    user_id: str
    creator_id: str
    items: List[OrderItemResponse]
    total_coins: int
    platform_fee_coins: int  # Admin revenue share
    creator_earnings_coins: int
    status: OrderStatus
    shipping_address: Optional[ShippingAddressResponse]
    tracking_number: Optional[str]
    tracking_url: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: str
    shipped_at: Optional[str]
    delivered_at: Optional[str]


class OrderStatusUpdate(BaseModel):
    """Update order status"""
    status: OrderStatus
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    notes: Optional[str] = None
