"""
Support API Routes
- AI Chatbot
- Help Center Articles
- Support Tickets (User & Admin)
"""
from fastapi import APIRouter, HTTPException, Depends
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

class TicketResponseAdd(BaseModel):
    response_text: str
    responder: Optional[str] = "Support Team"

class TicketCloseRequest(BaseModel):
    resolution: str

class TicketPriorityRequest(BaseModel):
    priority: str  # low, normal, high, urgent


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


# Support Ticket Endpoints (User)
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
        id=ticket["ticket_id"],
        status=ticket["status"],
        message=f"Ticket #{ticket['ticket_id']} created successfully. We'll respond within 24 hours."
    )

@router.get("/tickets/user/{user_id}")
async def get_user_tickets(user_id: str):
    """Get all tickets for a user"""
    tickets = await support_ticket_service.get_user_tickets(user_id)
    # Convert datetime objects to strings
    for ticket in tickets:
        for key in ['created_at', 'updated_at', 'closed_at']:
            if ticket.get(key) and hasattr(ticket[key], 'isoformat'):
                ticket[key] = ticket[key].isoformat()
    return tickets

@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    """Get a specific ticket"""
    ticket = await support_ticket_service.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    # Convert datetime objects
    for key in ['created_at', 'updated_at', 'closed_at']:
        if ticket.get(key) and hasattr(ticket[key], 'isoformat'):
            ticket[key] = ticket[key].isoformat()
    return ticket


# Admin Ticket Endpoints
@router.get("/admin/tickets")
async def admin_get_all_tickets(status: Optional[str] = None, limit: int = 50):
    """Get all tickets (admin only)"""
    tickets = await support_ticket_service.get_all_tickets(status=status, limit=limit)
    # Convert datetime objects
    for ticket in tickets:
        for key in ['created_at', 'updated_at', 'closed_at']:
            if ticket.get(key) and hasattr(ticket[key], 'isoformat'):
                ticket[key] = ticket[key].isoformat()
    return tickets

@router.get("/admin/tickets/stats")
async def admin_get_ticket_stats():
    """Get ticket statistics (admin only)"""
    stats = await support_ticket_service.get_ticket_stats()
    return stats

@router.post("/admin/tickets/{ticket_id}/respond")
async def admin_respond_to_ticket(ticket_id: str, request: TicketResponseAdd):
    """Add a response to a ticket (admin only)"""
    ticket = await support_ticket_service.add_response(
        ticket_id=ticket_id,
        response_text=request.response_text,
        responder=request.responder
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    # Convert datetime objects
    for key in ['created_at', 'updated_at', 'closed_at']:
        if ticket.get(key) and hasattr(ticket[key], 'isoformat'):
            ticket[key] = ticket[key].isoformat()
    return ticket

@router.post("/admin/tickets/{ticket_id}/close")
async def admin_close_ticket(ticket_id: str, request: TicketCloseRequest):
    """Close a ticket and send resolution email (admin only)"""
    ticket = await support_ticket_service.close_ticket(
        ticket_id=ticket_id,
        resolution=request.resolution
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    # Convert datetime objects
    for key in ['created_at', 'updated_at', 'closed_at']:
        if ticket.get(key) and hasattr(ticket[key], 'isoformat'):
            ticket[key] = ticket[key].isoformat()
    return {"status": "success", "message": f"Ticket #{ticket_id} closed. Resolution email sent.", "ticket": ticket}

@router.post("/admin/tickets/{ticket_id}/priority")
async def admin_update_priority(ticket_id: str, request: TicketPriorityRequest):
    """Update ticket priority (admin only)"""
    if request.priority not in ["low", "normal", "high", "urgent"]:
        raise HTTPException(status_code=400, detail="Invalid priority. Use: low, normal, high, urgent")
    
    ticket = await support_ticket_service.update_priority(
        ticket_id=ticket_id,
        priority=request.priority
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket
