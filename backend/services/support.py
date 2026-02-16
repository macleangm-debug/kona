"""
AI Support Chatbot Service - Kona Assistant
Handles customer support queries using LLM
Stores tickets in MongoDB
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Knowledge base for the AI to reference
KONA_KNOWLEDGE_BASE = """
# Kona Streaming Platform - Support Knowledge Base

## About Kona
Kona is Africa's premier mini-series streaming platform featuring exclusive African content including romance, drama, thriller, action, comedy, and fantasy series. We offer original content produced by talented African creators.

## Account & Registration
- Sign up is FREE using email or phone number
- No credit card required to create an account
- First episode of every series is always free
- You can sign in on multiple devices but only stream on one at a time

## Coins & Currency
- Coins are Kona's virtual currency used to unlock episodes
- Ways to earn free coins:
  * Daily check-in rewards
  * Watching episodes (earn coins for completion)
  * Completing daily challenges
  * Referring friends (100 coins per referral)
  * Spinning the daily wheel
  * Maintaining watch streaks
  * Participating in prediction games
- Coins can also be purchased in the Store
- Coin packages: 100 coins, 500 coins, 1000 coins, 5000 coins

## Subscriptions
- FREE tier: Access to first episodes, earn coins through rewards
- PREMIUM ($4.99/month): Unlimited access to all episodes, ad-free viewing
- VIP ($9.99/month): Everything in Premium plus early access, exclusive content, downloads, priority support

## Watching & Streaming
- Stream on mobile, tablet, or desktop
- Install as app (PWA) for best experience
- Premium/VIP members can download for offline viewing
- Video quality adjusts automatically based on connection
- Supported browsers: Chrome, Safari, Firefox, Edge

## Payments
- Accepted methods: M-Pesa, Airtel Money, Visa, Mastercard, PayPal, Crypto
- Subscriptions auto-renew monthly
- Cancel anytime from Profile > Subscription
- Refunds available within 7 days if no content consumed

## Rewards & Gamification
- Daily Rewards: Check in daily for increasing rewards
- Spin Wheel: One free spin per day for bonus coins
- Watch Streaks: Maintain daily watching for multiplied rewards
- Challenges: Complete tasks for coin rewards
- Referrals: Share your code, earn when friends join
- Leaderboards: Compete with other viewers

## Troubleshooting
- Video not playing: Check internet connection, try refreshing, clear cache
- Can't log in: Use "Forgot Password" to reset, check spam folder for emails
- Coins not appearing: Refresh the app, coins may take a few minutes to credit
- Payment failed: Verify payment details, ensure sufficient balance, try different method
- App crashing: Update to latest version, reinstall if needed

## Creator Program
- Creators can upload and monetize their content
- Revenue sharing: 70% to creators, 30% to Kona
- Apply through Creator Portal
- Requirements: Original content, minimum 3 episodes, HD quality

## Contact & Support
- Help Center: Available 24/7 at /help
- AI Assistant: Available for instant support
- Support Tickets: For complex issues requiring human review
- Response time: Most tickets resolved within 24 hours
"""


class SupportChatService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        self.chats: Dict[str, any] = {}  # Store chat instances by session
    
    async def get_or_create_chat(self, session_id: str):
        """Get existing chat or create new one"""
        from emergentintegrations.llm.chat import LlmChat
        
        if session_id not in self.chats:
            system_message = f"""You are Kona Assistant, a helpful and friendly AI support agent for Kona, Africa's premier mini-series streaming platform.

Your role:
- Help users with account issues, billing questions, how to use features
- Answer questions about subscriptions, coins, rewards
- Guide users through troubleshooting steps
- Be warm, professional, and concise
- Use simple language, avoid technical jargon
- If you can't help, offer to create a support ticket

Knowledge Base:
{KONA_KNOWLEDGE_BASE}

Guidelines:
- Keep responses brief (2-3 sentences when possible)
- Use bullet points for step-by-step instructions
- Be empathetic if user is frustrated
- Never share internal system details or make up information
- If unsure, say "I'm not sure about that, but I can create a support ticket for you"
- Always end by asking if there's anything else you can help with
"""
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=system_message
            ).with_model("openai", "gpt-5.2")
            
            self.chats[session_id] = chat
        
        return self.chats[session_id]
    
    async def send_message(self, session_id: str, message: str) -> str:
        """Send a message and get AI response"""
        from emergentintegrations.llm.chat import UserMessage
        
        chat = await self.get_or_create_chat(session_id)
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        return response
    
    def clear_session(self, session_id: str):
        """Clear a chat session"""
        if session_id in self.chats:
            del self.chats[session_id]


# Help Center Articles
HELP_ARTICLES = [
    {
        "id": "getting-started",
        "category": "Getting Started",
        "title": "How to create your Kona account",
        "summary": "Sign up in seconds with email or phone - no credit card required",
        "content": """
# How to Create Your Kona Account

Creating your Kona account is quick and easy!

## Step 1: Visit Kona
Go to streamkona.com or open the Kona app

## Step 2: Click "Get Started" or "Sign Up"
You'll see this button in the top right corner

## Step 3: Enter Your Details
- **Email**: Enter a valid email address, OR
- **Phone**: Enter your phone number with country code

## Step 4: Create a Password
Choose a strong password (at least 8 characters)

## Step 5: Verify Your Account
- Check your email/phone for a verification code
- Enter the code to activate your account

## That's It!
You're now ready to start watching. Your first episode of every series is FREE!

### Tips:
- Use a password you'll remember
- Add your phone number for account recovery
- Download the app for the best experience
""",
        "tags": ["account", "signup", "register", "new user"]
    },
    {
        "id": "earn-coins",
        "category": "Coins & Rewards",
        "title": "How to earn free coins",
        "summary": "Multiple ways to earn coins without spending money",
        "content": """
# How to Earn Free Coins on Kona

Coins are your key to unlocking episodes. Here's how to earn them for FREE:

## Daily Rewards
- Check in every day for increasing rewards
- Day 1: 10 coins, Day 7: 100 coins!
- Don't break your streak

## Daily Spin Wheel
- One FREE spin every day
- Win 5 to 500 coins
- Come back daily!

## Watch & Earn
- Complete episodes to earn coins
- Bonus coins for finishing a series
- Watch streak bonuses

## Refer Friends
- Share your referral code
- Earn 100 coins per friend who joins
- No limit on referrals!

## Daily Challenges
- Complete simple tasks
- Examples: Watch 3 episodes, Like 5 series
- New challenges every day

## Prediction Games
- Guess what happens next in popular series
- Correct predictions = coins!

## Tips for Maximum Coins:
1. Log in every day (even just to check in)
2. Complete your daily challenges
3. Share your referral code on social media
4. Maintain your watch streaks
""",
        "tags": ["coins", "rewards", "free", "earn", "referral"]
    },
    {
        "id": "subscription-plans",
        "category": "Subscriptions",
        "title": "Understanding subscription plans",
        "summary": "Compare FREE, Premium, and VIP plans",
        "content": """
# Kona Subscription Plans

## FREE Plan
**Cost**: $0/month

**Includes**:
- First episode of every series FREE
- Earn coins through rewards
- Access to daily challenges
- Basic streaming quality

## PREMIUM Plan
**Cost**: $4.99/month

**Includes everything in FREE, plus**:
- Unlimited access to ALL episodes
- Ad-free viewing experience
- HD streaming quality
- Watch on 2 devices

## VIP Plan
**Cost**: $9.99/month

**Includes everything in PREMIUM, plus**:
- Early access to new releases
- Exclusive VIP-only content
- Download for offline viewing
- 4K streaming where available
- Priority customer support
- Exclusive badges and perks
- Watch on 4 devices

## How to Subscribe
1. Go to Profile > Subscription
2. Choose your plan
3. Select payment method
4. Confirm purchase

## Cancel Anytime
- No long-term commitment
- Cancel from Profile > Subscription
- Access continues until billing period ends
""",
        "tags": ["subscription", "premium", "vip", "plans", "pricing"]
    },
    {
        "id": "payment-methods",
        "category": "Billing & Payments",
        "title": "Accepted payment methods",
        "summary": "M-Pesa, Airtel Money, cards, PayPal, and crypto",
        "content": """
# Payment Methods on Kona

We accept various payment methods to make it easy for you:

## Mobile Money
- **M-Pesa** (Kenya, Tanzania)
- **Airtel Money** (Multiple countries)
- **MTN Mobile Money** (Ghana, Uganda)

## Cards
- Visa (Credit & Debit)
- Mastercard (Credit & Debit)

## Digital Wallets
- PayPal
- Apple Pay (on iOS)
- Google Pay (on Android)

## Cryptocurrency
- Bitcoin (BTC)
- Ethereum (ETH)
- USDT

## How Payments Work
1. Select content or subscription
2. Choose payment method
3. Complete payment on provider's page
4. Instant access upon confirmation

## Payment Issues?
- Ensure sufficient balance
- Check card is not expired
- Try a different payment method
- Contact your bank if declined repeatedly

## Refund Policy
- Request within 7 days
- Only if no content consumed
- Refunds processed in 5-7 business days
""",
        "tags": ["payment", "mpesa", "card", "billing", "refund"]
    },
    {
        "id": "video-not-playing",
        "category": "Troubleshooting",
        "title": "Video not playing - how to fix",
        "summary": "Quick fixes for streaming issues",
        "content": """
# Video Not Playing? Try These Fixes

## Quick Fixes (Try First)

### 1. Check Your Internet
- Minimum 5 Mbps for HD streaming
- Try switching between WiFi and mobile data
- Move closer to your router

### 2. Refresh the Page/App
- Close and reopen the app
- Or refresh your browser page

### 3. Clear Cache
**On Browser**:
- Press Ctrl+Shift+Delete
- Clear cached images and files
- Reload the page

**On App**:
- Go to Settings > Clear Cache
- Restart the app

## Still Not Working?

### 4. Update Your App
- Check for updates in App Store/Play Store
- Install latest version

### 5. Try a Different Browser
- Chrome works best
- Safari, Firefox, Edge also supported

### 6. Check Device Compatibility
- iOS 12+ required
- Android 8+ required
- Modern browsers only

### 7. Disable VPN
- VPNs can cause streaming issues
- Try disabling temporarily

## If Nothing Works
Create a support ticket with:
- Your device type
- Browser/app version
- Error message (if any)
- What you were trying to watch
""",
        "tags": ["video", "streaming", "buffering", "not working", "error"]
    },
    {
        "id": "cant-login",
        "category": "Troubleshooting",
        "title": "Can't log in to your account",
        "summary": "Solutions for login problems",
        "content": """
# Can't Log In? Here's How to Fix It

## Forgot Your Password?

1. Click "Forgot Password" on login screen
2. Enter your email or phone
3. Check for reset link/code
4. Create a new password

**Note**: Check spam/junk folder for reset email

## Wrong Password Error

- Make sure Caps Lock is off
- Try typing password in a text field first to check
- Use "Forgot Password" to reset

## Account Not Found

- Double-check your email spelling
- Try phone number if you registered with phone
- Make sure you're on the correct site (streamkona.com)

## Verification Code Not Received

- Wait 2-3 minutes
- Check spam folder
- Request a new code
- Try SMS if email isn't working

## Account Locked

Accounts lock after 5 failed attempts
- Wait 30 minutes and try again
- Or reset your password

## Logged Out Unexpectedly

- Session expires after 30 days
- Simply log in again
- Check "Remember Me" to stay logged in

## Still Can't Access?

Create a support ticket with:
- Email/phone used to register
- When you last successfully logged in
- Any error messages shown
""",
        "tags": ["login", "password", "locked", "access", "signin"]
    },
    {
        "id": "offline-viewing",
        "category": "Features",
        "title": "How to download for offline viewing",
        "summary": "Watch without internet connection (VIP feature)",
        "content": """
# Download Episodes for Offline Viewing

**Note**: This feature is available for VIP subscribers only.

## How to Download

1. **Find the Episode**
   - Browse to the series you want
   - Select the episode

2. **Tap Download Button**
   - Look for the download icon (arrow pointing down)
   - Tap to start download

3. **Choose Quality**
   - Standard: Smaller file, good quality
   - HD: Larger file, best quality

4. **Wait for Download**
   - Progress shown on the episode
   - Downloads work in background

## Accessing Downloads

1. Go to Profile > My Downloads
2. All downloaded episodes listed here
3. Tap to play offline

## Managing Storage

- Downloads expire after 30 days
- Delete watched downloads to save space
- Check storage in Profile > Settings

## Tips
- Download on WiFi to save data
- Download before trips/commutes
- Keep app updated for best performance

## Troubleshooting
- Ensure enough storage space
- Check you have active VIP subscription
- Try restarting download if stuck
""",
        "tags": ["download", "offline", "vip", "save", "watch later"]
    },
    {
        "id": "creator-program",
        "category": "Creators",
        "title": "Become a Kona Creator",
        "summary": "Upload content and earn money",
        "content": """
# Become a Kona Creator

Share your stories with millions of viewers and earn money!

## Why Create on Kona?

- **Massive Audience**: 1M+ active viewers
- **Fair Revenue**: 70% revenue share
- **Full Support**: Production guidance available
- **Creative Freedom**: Tell your stories your way

## Requirements

1. **Original Content**
   - Must own all rights
   - No copyrighted material

2. **Quality Standards**
   - Minimum 720p HD video
   - Clear audio
   - Professional editing

3. **Series Format**
   - Minimum 3 episodes to start
   - Episodes 3-15 minutes each
   - Complete story arc

## How to Apply

1. Visit /creators or click "Creator Portal"
2. Fill out application form
3. Submit sample content
4. Wait for review (5-7 days)
5. Get approved and start uploading!

## Revenue & Payments

- Earn 70% of all revenue from your content
- Paid monthly via M-Pesa, bank, or PayPal
- Minimum payout: $50
- Detailed analytics dashboard

## Creator Support

- Dedicated creator support team
- Production resources and guides
- Marketing support for top creators
- Creator community access
""",
        "tags": ["creator", "upload", "content", "earn", "monetize"]
    }
]


class SupportTicketService:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        self.tickets = self.db.support_tickets
    
    async def create_ticket(self, user_id: Optional[str], email: str, subject: str, description: str, category: str) -> dict:
        """Create a new support ticket"""
        ticket = {
            "ticket_id": str(uuid.uuid4())[:8].upper(),
            "user_id": user_id,
            "email": email,
            "subject": subject,
            "description": description,
            "category": category,
            "status": "open",
            "priority": "normal",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "closed_at": None,
            "resolution": None,
            "responses": []
        }
        
        result = await self.tickets.insert_one(ticket)
        ticket["_id"] = str(result.inserted_id)
        
        logger.info(f"Created support ticket {ticket['ticket_id']} for {email}")
        return ticket
    
    async def get_all_tickets(self, status: Optional[str] = None, limit: int = 50) -> List[dict]:
        """Get all tickets (for admin)"""
        query = {}
        if status:
            query["status"] = status
        
        cursor = self.tickets.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_user_tickets(self, user_id: str) -> List[dict]:
        """Get all tickets for a user"""
        cursor = self.tickets.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1)
        return await cursor.to_list(length=100)
    
    async def get_ticket(self, ticket_id: str) -> Optional[dict]:
        """Get a specific ticket"""
        ticket = await self.tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
        return ticket
    
    async def add_response(self, ticket_id: str, response_text: str, responder: str = "Support Team") -> Optional[dict]:
        """Add a response to a ticket"""
        response = {
            "id": str(uuid.uuid4())[:8],
            "text": response_text,
            "responder": responder,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await self.tickets.update_one(
            {"ticket_id": ticket_id},
            {
                "$push": {"responses": response},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        if result.modified_count > 0:
            return await self.get_ticket(ticket_id)
        return None
    
    async def close_ticket(self, ticket_id: str, resolution: str) -> Optional[dict]:
        """Close a ticket and trigger email notification"""
        from services.email_service import send_email
        
        # Get ticket first
        ticket = await self.get_ticket(ticket_id)
        if not ticket:
            return None
        
        # Update ticket status
        result = await self.tickets.update_one(
            {"ticket_id": ticket_id},
            {
                "$set": {
                    "status": "closed",
                    "resolution": resolution,
                    "closed_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.modified_count > 0:
            # Send resolution email to user
            await self._send_resolution_email(ticket, resolution)
            
            logger.info(f"Closed support ticket {ticket_id}")
            return await self.get_ticket(ticket_id)
        
        return None
    
    async def update_priority(self, ticket_id: str, priority: str) -> Optional[dict]:
        """Update ticket priority"""
        result = await self.tickets.update_one(
            {"ticket_id": ticket_id},
            {
                "$set": {
                    "priority": priority,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        if result.modified_count > 0:
            return await self.get_ticket(ticket_id)
        return None
    
    async def get_ticket_stats(self) -> dict:
        """Get ticket statistics for admin dashboard"""
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        stats = {"open": 0, "in_progress": 0, "closed": 0, "total": 0}
        async for doc in self.tickets.aggregate(pipeline):
            stats[doc["_id"]] = doc["count"]
            stats["total"] += doc["count"]
        
        return stats
    
    async def _send_resolution_email(self, ticket: dict, resolution: str):
        """Send email notification when ticket is resolved"""
        from services.email_service import send_email
        
        subject = f"Your Support Ticket #{ticket['ticket_id']} Has Been Resolved - Kona"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 32px; font-weight: bold; color: #a855f7; }}
                .card {{ background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; padding: 30px; margin-bottom: 20px; border: 1px solid rgba(168, 85, 247, 0.2); }}
                .ticket-id {{ font-size: 14px; color: #a855f7; margin-bottom: 10px; }}
                .subject {{ font-size: 20px; font-weight: 600; margin-bottom: 20px; }}
                .label {{ font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 5px; }}
                .content {{ font-size: 15px; line-height: 1.6; color: #ccc; }}
                .resolution {{ background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin-top: 20px; }}
                .resolution-header {{ color: #22c55e; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }}
                .footer {{ text-align: center; color: #666; font-size: 13px; margin-top: 30px; }}
                .btn {{ display: inline-block; background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">KONA</div>
                </div>
                
                <div class="card">
                    <div class="ticket-id">Ticket #{ticket['ticket_id']}</div>
                    <div class="subject">{ticket['subject']}</div>
                    
                    <div class="label">Your Original Request</div>
                    <div class="content">{ticket['description'][:300]}{'...' if len(ticket['description']) > 300 else ''}</div>
                    
                    <div class="resolution">
                        <div class="resolution-header">
                            ✓ Resolution
                        </div>
                        <div class="content">{resolution}</div>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="https://www.streamkona.com/home" class="btn">Continue Watching</a>
                </div>
                
                <div class="footer">
                    <p>If you have any further questions, feel free to open a new ticket or chat with our AI assistant.</p>
                    <p>© 2026 Kona Entertainment Ltd. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            result = await send_email(ticket['email'], subject, html_content)
            if result.get("success"):
                logger.info(f"Resolution email sent to {ticket['email']} for ticket {ticket['ticket_id']}")
            else:
                logger.warning(f"Failed to send resolution email: {result.get('error')}")
        except Exception as e:
            logger.error(f"Error sending resolution email: {str(e)}")


# Initialize services
support_chat_service = SupportChatService()
support_ticket_service = SupportTicketService()
