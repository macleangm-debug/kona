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
│   ├── BottomNav.jsx       # Mobile navigation (Home, Discover, Rewards, Store, Profile)
│   ├── DesktopHeader.jsx   # Desktop navigation (Home, Discover, Rewards, My List, Coming Soon)
│   ├── CoinBalance.jsx
│   ├── SeriesCard.jsx
│   ├── SeriesCardDesktop.jsx
│   ├── PromoPopup.jsx
│   ├── MilestoneAlert.jsx
│   └── ...
├── pages/            # Route components
│   ├── HomePage.jsx
│   ├── HomePageResponsive.jsx
│   ├── DiscoverPage.jsx    # Content discovery with recommendations
│   ├── RewardsPage.jsx     # Gamification hub (daily rewards, spin wheel, missions)
│   ├── SeriesDetailPage.jsx
│   ├── VideoPlayerPage.jsx
│   ├── StorePage.jsx
│   ├── ProfilePage.jsx
│   ├── CreatorPortal.jsx
│   ├── CreatorLoginPage.jsx
│   ├── AdminDashboard.jsx
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
- ✅ **Discover & Rewards Navigation Tabs (P0)**
  - **Mobile Navigation (BottomNav):** Home | Discover | Rewards (highlighted) | Store | Profile
  - **Desktop Navigation (DesktopHeader):** Home | Discover | Rewards (highlighted) | My List | Coming Soon
  - **Discover Page (`/discover`):**
    - Personalized content discovery hub
    - Quick category cards: Trending Now, Top Rated, New Releases, Quick Bites
    - Content sections: Picked For You, Trending This Week, Highest Rated, If You Like Romance, Just Added
    - "Because You Watched" recommendations (for logged-in users)
    - Refresh button to regenerate recommendations
  - **Rewards Page (`/rewards`):**
    - Coin balance display
    - Daily Login Bonus with streak counter
    - Lucky Spin wheel for bonus coins
    - Daily Missions with progress tracking (Watch 3 Episodes, Add to List, Refer a Friend, First Purchase)
    - Referral CTA linking to profile
- ✅ **Multi-Language Support (P2)**
  - Languages: English (en), Swahili (sw), French (fr)
  - i18next library integration with browser language detection
  - Language selector dropdown in header (flag icons)
  - Translations for: Navigation, Auth, Rewards, Leaderboard, Profile, Notifications
  - Language preference persists via localStorage
  - Translated mobile bottom nav labels
- ✅ **Referral Leaderboard Gamification (P2)**
  - **Route:** `/leaderboard`
  - **Period Tabs:** Weekly, Monthly, All Time
  - **Prestige-Based Rewards:**
    - #1: Gold Badge + 3-day VIP Trial + "Top Referrer" title
    - #2: Silver Badge + 1-day VIP Trial
    - #3: Bronze Badge + Early Access to new episodes
    - Top 10: "Rising Star" badge
  - Top referrers list with anonymized names, referral counts, and badges
  - User's own rank highlighted
  - CTA for non-logged-in users
- ✅ **Push Notifications via PWA (P2)**
  - Service Worker with push notification handlers (`/public/sw.js`)
  - NotificationService for subscribing/unsubscribing to push
  - VAPID key endpoint for push subscription
  - Notification Settings UI in Profile page:
    - Enable/Disable push notifications
    - Notification type toggles: New Episodes, Daily Rewards, Milestone Alerts, Promotions
  - Local notification testing support
- ✅ **Achievement Badges System**
  - **Route:** `/api/badges/*`
  - **10 Badges:**
    - 🔥 Marathon Master - Watch 10+ episodes in one day
    - ⭐ Early Adopter - Joined in first 3 months
    - 👑 Super Referrer - Refer 10+ friends
    - 🎬 Series Slayer - Complete 5 full series
    - 💎 VIP Member - Subscribe to any VIP plan
    - 🎯 Mission Ace - Complete 50 daily missions
    - 🌙 Night Owl - Watch 5+ episodes after midnight
    - 💰 Big Spender - Purchase 1000+ coins total
    - 🔄 Loyal Viewer - 30-day login streak
    - ✨ First Steps - Watch first episode
  - **Features:**
    - Badge showcase (select up to 3 featured badges)
    - Progress tracking for incomplete badges
    - Coin rewards when badges are earned
    - "Check for New Badges" button
    - Badge leaderboard

## Test Credentials
- **Admin**: `admin@kona.com` / `Admin123!`
- **Super Admin**: `superadmin@kona.com` / `SuperAdmin2025!`
  - Access to Production Deployment Guide
  - System Health monitoring
  - Full platform management
- **Demo User**: `demo@kona.com` / `Demo123!`
- **Creator**: `milestone_test@test.com` / `test123` (creator application needed)

## Deployment
- Preview URL: https://viewflix-725.preview.emergentagent.com
- Backend: FastAPI on port 8001
- Frontend: React on port 3000
- Database: MongoDB

## Documentation

### Production Deployment Guide
- **Location:** `/app/docs/production_guide.md`
- **Created:** January 2026
- **Contents:**
  - Architecture diagram for 10M+ users
  - Infrastructure requirements by tier (Startup → Enterprise)
  - Detailed cost estimates: $230/month (100K users) → $45,000/month (10M users)
  - Deployment checklist (pre-launch, launch day, post-launch)
  - Monitoring & alerting configuration
  - Scaling strategy (HPA, database sharding)
  - Security checklist
  - Disaster recovery procedures

### Complete Business Documentation Suite (12 Documents)
All accessible via Super Admin → Docs & System tab:

**P0 - Launch Critical:**
1. 🚀 Production Deployment Guide - Infrastructure & scaling
2. ✅ Launch Checklist - Pre-launch, launch day, post-launch tasks
3. 📈 Marketing & Go-to-Market Plan - User acquisition strategy
4. 💰 Monetization & Pricing Strategy - Revenue model, coin economics
5. ⚖️ Legal & Compliance Checklist - GDPR, regional laws, ToS, Privacy

**P1 - First Month:**
6. 📊 KPI & Metrics Dashboard - Success metrics, benchmarks
7. 🎬 Content Strategy & Pipeline - Content calendar, creator guidelines
8. 🎧 Customer Support Playbook - FAQ, templates, escalation
9. 🚨 Crisis Management Plan - Incident response, communication

**P2 - Scale to 10M:**
10. 🌱 Growth & Retention Playbook - Viral loops, churn prevention
11. 🌍 Localization & Expansion Guide - Multi-region rollout
12. 🤝 Creator Partnership Program - Revenue share, onboarding
13. 🔒 Security & Data Protection - Policies, compliance

### January 31, 2026 - Investment Calculator & Business Documents
- ✅ **Investment Calculator** - Full financial projection tool at `/investment`:
  - User growth projections with 24-month forecasts
  - Revenue vs Costs comparison charts
  - Cumulative profit tracking
  - ROI over time analysis
  - Key unit economics (LTV, CAC, LTV:CAC ratio, churn, margin, ARPU, payback)
  - Risk assessment with HIGH/MEDIUM/LOW indicators
  - Strategic recommendations
  - Industry benchmarks comparison
  - African streaming market size data
- ✅ **7 New Business Documents** added to Admin Docs & System:
  1. Investor Pitch Deck (funding presentation)
  2. Financial Projections (3-5 year forecasts)
  3. Competitor Analysis (Netflix, ReelShort, Showmax comparison)
  4. API Documentation (complete endpoint reference)
  5. Disaster Recovery Plan (backup & failover procedures)
  6. Content Moderation Guidelines (policies & enforcement)
  7. Creator Payout Schedule (payment terms & processes)

### January 31, 2026 - Major Feature Implementation
- ✅ **Watch Party with Video Sync** - Complete implementation:
  - Real-time video playback synchronization (2-second polling)
  - Host-controlled playback (play/pause/seek)
  - Actual video player with controls (volume, progress bar, fullscreen)
  - Participant list with host badge
  - Live chat with reactions (8 emoji reactions with floating animation)
  - Video sync threshold to prevent constant seeking
  - Non-host wait screen when paused
- ✅ **Offline Downloads with Service Worker & IndexedDB**:
  - Created `offlineManager.js` service for IndexedDB storage
  - Created `sw.js` Service Worker for caching and offline playback
  - Download progress tracking with real-time UI updates
  - Storage usage monitoring
  - Offline/Online status indicator
  - Local downloads list with play/delete actions
  - Device registration and limits management
  - Download expiry countdown display
- ✅ **Interactive Launch Checklist UI**:
  - 24 launch readiness items across 6 categories
  - Category progress cards with visual indicators
  - Toggle functionality with persistent backend storage
  - Overall progress percentage with progress bar
  - "Ready for Launch" indicator at 100%
  - Category icons (Server, Film, DollarSign, Shield, TrendingUp, Users)
- ✅ **Issue 1: Promo Popup Fix** - Now requires scroll (400px) AND 5+ seconds on page before showing. No more aggressive popups on initial load.
- ✅ **Issue 2: Animated Modals Integration** - NEW: LoginSuccessModal (confetti), SignupSuccessModal (coins), RewardClaimedModal (coins). Used in AuthModal and RewardsPage. LogoutConfirmModal already in ProfilePage.
- ✅ **Issue 3: Picture-in-Picture (PiP) Support** - Added PiP button to video player controls. Shows when browser supports it.
- ✅ **Issue 4: Profile & Notifications Desktop Layout** - Profile page uses 2-column grid layout on desktop (lg:grid-cols-2). Notifications page uses 2-3 column grid (lg:grid-cols-2 xl:grid-cols-3).
- ✅ **Issue 5: Search Modal Desktop Fix** - Search overlay is now smaller and centered on desktop (lg:max-h-[500px] lg:w-[600px]).
- ✅ **Free Episode Abuse Prevention** - Daily rewards now require watching at least 1 episode (10%+ progress) before claiming. Episodes watched today are tracked via `/api/episodes/progress` endpoint.

### January 31, 2026 - Round 2 UI/UX Fixes
- ✅ **Search Contained in Card** - Search modal is now a Dialog (not Sheet), contained in a card with max-width 600px on desktop, scrollable results area.
- ✅ **Notifications as Dropdown** - Removed dedicated NotificationsPage route. Notifications now show in a dropdown modal from header bell icon.
- ✅ **Login/Signup Animated Modals Working** - Fixed modal rendering issues. "Welcome back, Demo User! 🎉" with green checkmark animation.
- ✅ **Save/Bookmark Button Working** - Added `/api/user/my-list/add` and `/api/user/my-list/remove` alias routes. My List now persists and displays correctly.

## Future Roadmap

### P1 - High Priority
- ~~Watch Party feature (WebSocket-based sync with live chat & reactions)~~ ✅ COMPLETED
- ~~Integrate `ConfirmationModal.jsx` for critical user actions~~ ✅ COMPLETED
- ~~Animated Confirmation Modals~~ ✅ COMPLETED
- Watch Party video sync - Integrate Bunny.net or real-time provider for synchronized video playback

### P2 - Medium Priority
- AI-powered content moderation
- ~~Offline downloads for VIP users (Service Worker + IndexedDB)~~ ✅ COMPLETED (with revenue protection)
- Full service worker implementation for offline downloads
- Interactive Launch Checklist in Admin Dashboard

### P3 - Low Priority
- Social features (comments, reactions)
- Creator verification badges
- Referral link sharing to specific social platforms
