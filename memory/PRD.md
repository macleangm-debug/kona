# Kona - Mini-Series Streaming App

## Product Overview
Kona is a mobile-first mini-series streaming platform with a coin-based economy for unlocking episodes. The app targets African and international markets with geo-targeted payment gateways.

## Core Features

### 1. Streaming Platform
- **Netflix-style UI** with hero carousel (Swiper.js), category tabs, and horizontal scrolling sections
- **Full-screen vertical video player** with quality settings, playback speed control, and episode navigation
- **Guest viewing** for Episode 1 (free), with sign-up prompts for subsequent episodes
- **Continue Watching** and **My List** functionality

### 2. Coin-Based Economy
- **Coin Packages**: 100, 300, 600, 1200 coins at various price points
- **Episode Unlocking**: Spend coins to unlock locked episodes
- **Welcome Bonus**: 50 coins for new users
- **Daily Rewards**: 10 coins per day

### 3. Payment Integration
- **Stripe**: For international card payments
- **Flutterwave**: For African markets (M-Pesa, mobile money)
- **Geo-detection**: Automatic payment gateway selection based on user location

### 4. Referral System
- **Referral Codes**: Unique 8-character codes for each user
- **Referral Bonus**: 30 coins for referred user, 20 coins for referrer
- **Milestone Rewards**: Bronze (5 refs, 100 coins), Silver (10 refs, 250 coins), Gold (25 refs, 500 coins), Platinum (50 refs, 1000 coins)

### 5. Creator Partnership System
- **Application Process**: Creators apply with bio and content type
- **Revenue Share**: 60-70% based on creator tier
- **Video Hosting**: Bunny.net integration for upload, transcoding, and streaming
- **Dashboard**: Real-time analytics for views, earnings, and payouts

### 6. Admin Panel
- **User Management**: View and manage user accounts
- **Content Management**: Approve/reject creator content
- **Analytics**: Platform-wide stats (users, revenue, subscriptions)
- **Transaction History**: Payment tracking

### 7. Subscription Plans
- **Basic**: $4.99/month - 100 coins
- **Premium**: $9.99/month - 250 coins
- **VIP**: $19.99/month - 600 coins + HD quality + downloads

## Technical Architecture

### Frontend (React)
```
/app/frontend/src/
├── components/        # Reusable UI components
│   ├── AuthModal.jsx
│   ├── BottomNav.jsx
│   ├── CoinBalance.jsx
│   ├── SeriesCard.jsx
│   ├── PromoPopup.jsx
│   ├── MilestoneAlert.jsx
│   └── ...
├── pages/            # Route components
│   ├── HomePage.jsx
│   ├── SeriesDetailPage.jsx
│   ├── VideoPlayerPage.jsx
│   ├── StorePage.jsx
│   ├── ProfilePage.jsx
│   ├── CreatorPortal.jsx
│   ├── CreatorLoginPage.jsx
│   ├── AdminPage.jsx
│   └── AdminLoginPage.jsx
├── hooks/            # Custom React hooks
│   ├── usePromoManager.js
│   └── useMilestoneNotifications.js
├── contexts/         # React Context providers
│   └── AuthContext.jsx
└── config.js         # App configuration
```

### Backend (FastAPI)
```
/app/backend/
├── routes/
│   ├── auth.py       # Authentication endpoints
│   ├── series.py     # Series and episode management
│   ├── payments.py   # Store, subscriptions, geo-detection
│   ├── creator.py    # Creator portal APIs
│   └── admin.py      # Admin panel APIs
├── models/           # Pydantic models
├── services/         # Business logic
│   ├── bunny.py      # Bunny.net integration
│   └── ...
└── server.py         # Main FastAPI app
```

### Database (MongoDB)
- **users**: User accounts, coins, referrals, subscriptions
- **series**: Series metadata, thumbnails, genres
- **episodes**: Episode data, video URLs, unlock requirements
- **creators**: Creator profiles, tiers, earnings
- **transactions**: Payment records

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Series
- `GET /api/series` - List all series
- `GET /api/series/{id}` - Get series details
- `GET /api/series/{id}/episodes` - Get episodes

### Episodes
- `GET /api/episodes/{id}` - Get episode details
- `POST /api/episodes/unlock` - Unlock episode with coins
- `POST /api/episodes/progress` - Save watch progress

### Store
- `GET /api/store/packages` - Get coin packages
- `POST /api/store/checkout` - Create checkout session
- `GET /api/geo/detect` - Detect user location
- `GET /api/geo/countries` - Get supported countries

### Referral
- `GET /api/referral/stats` - Get referral statistics
- `GET /api/referral/milestones` - Get milestone progress
- `POST /api/referral/milestones/{id}/claim` - Claim milestone reward

### Creator
- `POST /api/creator/apply` - Apply to become creator
- `GET /api/creator/status` - Get creator status
- `GET /api/creator/dashboard` - Get creator dashboard
- `POST /api/creator/series` - Create new series

### Admin
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - List users
- `GET /api/admin/transactions` - Transaction history

## Completed Work

### January 2026
- ✅ Initial MVP with coin system and video player
- ✅ Stripe and Flutterwave payment integration
- ✅ Referral system with milestone rewards
- ✅ Creator partnership system with Bunny.net
- ✅ Backend refactoring to modular architecture
- ✅ **Frontend refactoring** - Broke down monolithic App.js (4500+ lines) into:
  - 10+ page components
  - 15+ reusable components
  - Custom hooks for promo and milestone management
  - Separate config and context files
- ✅ Creator Login page (`/creator/login`)
- ✅ Admin Login page (`/admin/login`)
- ✅ **Local Payouts System (P1)**
  - Flutterwave Payouts API integration for bank transfers
  - **KwikPay Mock Integration** (ready to connect when developed)
  - Mobile Money support: M-Pesa, MTN, Airtel Money, Vodafone Cash
  - Bank Transfer support for NG, KE, GH, TZ, UG
  - Payout webhooks for status updates
- ✅ **Admin Dashboard (P1)** - Desktop-optimized portal with:
  - Revenue charts (area/line charts with Recharts)
  - User growth analytics (bar charts)
  - Content by genre (pie charts)
  - Top performing content table
  - Creator application management
  - Real-time stats overview
- ✅ **Responsive Web View** - Netflix/YouTube-style layout:
  - Desktop: Full-width with top navigation, hero billboard, horizontal scroll rows with hover effects
  - Mobile: Original mobile-first design with bottom nav and Swiper carousel
  - Responsive breakpoint at 1024px

## Test Credentials
- **Admin**: `admin@kona.com` / `Admin123!`
- **Creator**: `milestone_test@test.com` / `test123` (creator application needed)

## Deployment
- Preview URL: https://miniseriesapp-1.preview.emergentagent.com
- Backend: FastAPI on port 8001
- Frontend: React on port 3000
- Database: MongoDB

## Future Roadmap

### P2 - Medium Priority
- Watch Party feature (WebSocket-based sync with live chat & reactions)
- AI-powered content moderation
- Push notifications via PWA

### P3 - Low Priority
- Multi-language support (English, Swahili, French)
- Offline downloads for VIP users (Service Worker + IndexedDB)
- Social features (comments, reactions)
- Creator verification badges
