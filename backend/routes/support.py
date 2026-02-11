"""
Support API Routes
- AI Chatbot
- Help Center Articles
- Support Tickets
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uuid

router = APIRouter(prefix="/support", tags=["support"])

# Import services
from services.support import (
    support_chat_service, 
    support_ticket_service,
    HELP_ARTICLES
)

# Request/Response Models
class ChatMessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str

class ChatMessageResponse(BaseModel):
    session_id: str
    response: str

class TicketCreateRequest(BaseModel):
    email: str
    subject: str
    description: str
    category: str
    user_id: Optional[str] = None

class TicketResponse(BaseModel):
    id: str
    status: str
    message: str


# AI Chatbot Endpoints
@router.post("/chat", response_model=ChatMessageResponse)
async def chat_with_ai(request: ChatMessageRequest):
    """Send a message to the AI support assistant"""
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Get AI response
        response = await support_chat_service.send_message(
            session_id=session_id,
            message=request.message
        )
        
        return ChatMessageResponse(
            session_id=session_id,
            response=response
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@router.post("/chat/clear")
async def clear_chat_session(session_id: str):
    """Clear a chat session to start fresh"""
    support_chat_service.clear_session(session_id)
    return {"status": "success", "message": "Chat session cleared"}


# Help Center Endpoints
@router.get("/articles")
async def get_help_articles(category: Optional[str] = None, search: Optional[str] = None):
    """Get help articles, optionally filtered by category or search term"""
    articles = HELP_ARTICLES
    
    if category:
        articles = [a for a in articles if a["category"].lower() == category.lower()]
    
    if search:
        search_lower = search.lower()
        articles = [
            a for a in articles 
            if search_lower in a["title"].lower() 
            or search_lower in a["summary"].lower()
            or any(search_lower in tag for tag in a.get("tags", []))
        ]
    
    # Return summaries, not full content
    return [
        {
            "id": a["id"],
            "category": a["category"],
            "title": a["title"],
            "summary": a["summary"]
        }
        for a in articles
    ]

@router.get("/articles/{article_id}")
async def get_help_article(article_id: str):
    """Get a specific help article with full content"""
    for article in HELP_ARTICLES:
        if article["id"] == article_id:
            return article
    raise HTTPException(status_code=404, detail="Article not found")

@router.get("/categories")
async def get_help_categories():
    """Get all help article categories"""
    categories = list(set(a["category"] for a in HELP_ARTICLES))
    return sorted(categories)


# Support Ticket Endpoints
@router.post("/tickets", response_model=TicketResponse)
async def create_support_ticket(request: TicketCreateRequest):
    """Create a new support ticket"""
    ticket = await support_ticket_service.create_ticket(
        user_id=request.user_id,
        email=request.email,
        subject=request.subject,
        description=request.description,
        category=request.category
    )
    
    return TicketResponse(
        id=ticket["id"],
        status=ticket["status"],
        message=f"Ticket #{ticket['id']} created successfully. We'll respond within 24 hours."
    )

@router.get("/tickets")
async def get_user_tickets(user_id: str):
    """Get all tickets for a user"""
    tickets = await support_ticket_service.get_user_tickets(user_id)
    return tickets

@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    """Get a specific ticket"""
    ticket = await support_ticket_service.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket
