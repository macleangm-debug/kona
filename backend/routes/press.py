"""
Press/News Articles Routes
Handles CRUD operations for press releases and news articles
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from services.database import db
from services import get_current_user
import uuid

router = APIRouter()

# ============ MODELS ============
class PressArticleCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    content: str = Field(..., min_length=50, max_length=10000)
    summary: Optional[str] = Field(None, max_length=500)
    tag: str = Field(..., max_length=50)  # e.g., "Funding", "Product", "Partnership", "Milestone"
    category: Optional[str] = Field("News", max_length=50)  # News, Press Release, Blog
    image_url: Optional[str] = Field(None, max_length=500)
    source_link: Optional[str] = Field(None, max_length=500)
    is_featured: bool = False
    is_published: bool = True

class PressArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    content: Optional[str] = Field(None, min_length=50, max_length=10000)
    summary: Optional[str] = Field(None, max_length=500)
    tag: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = Field(None, max_length=50)
    image_url: Optional[str] = Field(None, max_length=500)
    source_link: Optional[str] = Field(None, max_length=500)
    is_featured: Optional[bool] = None
    is_published: Optional[bool] = None

# ============ ADMIN DEPENDENCY ============
async def require_admin(user: dict = Depends(get_current_user)):
    """Dependency to require admin privileges"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ PUBLIC ROUTES ============
@router.get("/articles")
async def get_published_articles(
    tag: Optional[str] = None,
    category: Optional[str] = None,
    featured_only: bool = False,
    limit: int = 20
):
    """Get all published press articles (public endpoint)"""
    query = {"is_published": True}
    
    if tag:
        query["tag"] = tag
    if category:
        query["category"] = category
    if featured_only:
        query["is_featured"] = True
    
    articles = await db.press_articles.find(
        query,
        {"_id": 0}
    ).sort("published_at", -1).limit(limit).to_list(length=limit)
    
    return {"articles": articles}

@router.get("/articles/{article_id}")
async def get_article(article_id: str):
    """Get a single article by ID (public endpoint)"""
    article = await db.press_articles.find_one(
        {"id": article_id, "is_published": True},
        {"_id": 0}
    )
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return article

@router.get("/featured")
async def get_featured_article():
    """Get the most recent featured article (for hero section)"""
    article = await db.press_articles.find_one(
        {"is_published": True, "is_featured": True},
        {"_id": 0}
    )
    
    return article

# ============ ADMIN ROUTES ============
@router.get("/admin/articles")
async def admin_get_all_articles(
    user: dict = Depends(require_admin),
    include_unpublished: bool = True,
    skip: int = 0,
    limit: int = 50
):
    """Get all articles for admin review (including unpublished)"""
    query = {} if include_unpublished else {"is_published": True}
    
    articles = await db.press_articles.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.press_articles.count_documents(query)
    
    # Stats
    stats = {
        "total": total,
        "published": await db.press_articles.count_documents({"is_published": True}),
        "drafts": await db.press_articles.count_documents({"is_published": False}),
        "featured": await db.press_articles.count_documents({"is_featured": True})
    }
    
    return {"articles": articles, "total": total, "stats": stats}

@router.post("/admin/articles")
async def create_article(
    article: PressArticleCreate,
    user: dict = Depends(require_admin)
):
    """Create a new press article"""
    article_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    article_data = {
        "id": article_id,
        **article.model_dump(),
        "author_id": user["id"],
        "author_name": user.get("name", "Admin"),
        "created_at": now,
        "updated_at": now,
        "published_at": now if article.is_published else None
    }
    
    # If this is being set as featured, unfeature other articles
    if article.is_featured:
        await db.press_articles.update_many(
            {"is_featured": True},
            {"$set": {"is_featured": False}}
        )
    
    await db.press_articles.insert_one(article_data)
    
    # Remove _id from response
    del article_data["_id"] if "_id" in article_data else None
    
    return article_data

@router.put("/admin/articles/{article_id}")
async def update_article(
    article_id: str,
    update: PressArticleUpdate,
    user: dict = Depends(require_admin)
):
    """Update an existing press article"""
    existing = await db.press_articles.find_one({"id": article_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Article not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If being published for first time, set published_at
    if update.is_published and not existing.get("published_at"):
        update_data["published_at"] = datetime.now(timezone.utc).isoformat()
    
    # If setting as featured, unfeature others
    if update.is_featured:
        await db.press_articles.update_many(
            {"is_featured": True, "id": {"$ne": article_id}},
            {"$set": {"is_featured": False}}
        )
    
    await db.press_articles.update_one(
        {"id": article_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Article updated", "id": article_id}

@router.delete("/admin/articles/{article_id}")
async def delete_article(
    article_id: str,
    user: dict = Depends(require_admin)
):
    """Delete a press article"""
    result = await db.press_articles.delete_one({"id": article_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {"success": True, "message": "Article deleted"}

@router.post("/admin/articles/{article_id}/publish")
async def publish_article(
    article_id: str,
    user: dict = Depends(require_admin)
):
    """Publish a draft article"""
    result = await db.press_articles.update_one(
        {"id": article_id, "is_published": False},
        {"$set": {
            "is_published": True,
            "published_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Draft article not found")
    
    return {"success": True, "message": "Article published"}

@router.post("/admin/articles/{article_id}/unpublish")
async def unpublish_article(
    article_id: str,
    user: dict = Depends(require_admin)
):
    """Unpublish an article (move to draft)"""
    result = await db.press_articles.update_one(
        {"id": article_id, "is_published": True},
        {"$set": {
            "is_published": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Published article not found")
    
    return {"success": True, "message": "Article unpublished (moved to drafts)"}

@router.post("/admin/articles/{article_id}/feature")
async def set_featured_article(
    article_id: str,
    user: dict = Depends(require_admin)
):
    """Set an article as featured (only one can be featured at a time)"""
    # Unfeature all others
    await db.press_articles.update_many(
        {"is_featured": True},
        {"$set": {"is_featured": False}}
    )
    
    # Feature this one
    result = await db.press_articles.update_one(
        {"id": article_id},
        {"$set": {"is_featured": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {"success": True, "message": "Article set as featured"}
