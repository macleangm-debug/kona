# MiniSeries App - Product Requirements Document

## Original Problem Statement
Build a mini series app like ReelShort/Pocket FM where users purchase coins as credits to watch episodic video series. Support geo-based payment routing for East/Central Africa with local payment methods. Implement referral system for growth.

## Target Audience
Young adults 18-35 in East/Central Africa who enjoy binge-watching short-form drama series on mobile

## Core Requirements (Static)
- User authentication (JWT)
- Browse series catalog by genre
- Watch video episodes
- Coin-based monetization
- Daily rewards system
- Multi-region payment support (Africa + International)
- Referral system for viral growth

## What's Been Implemented

### Phase 1 - MVP (Jan 26, 2026)
- [x] User registration with 50 coin welcome bonus
- [x] JWT authentication (72hr expiry)
- [x] Series & Episodes CRUD with sample content
- [x] Coin packages (4 tiers: $0.99-$9.99)
- [x] Stripe checkout integration
- [x] Daily reward system (10 coins/day)
- [x] Episode unlocking with coins
- [x] Watch progress tracking
- [x] Mobile-first dark theme (Neon Noir)

### Phase 2 - Geo-Payment Routing (Jan 26, 2026)
- [x] IP-based geolocation detection
- [x] Manual country selection
- [x] East/Central Africa support (KE, TZ, UG, RW, CD, BI, SS)
- [x] M-Pesa, MTN MoMo, Airtel Money integration (Flutterwave)
- [x] Local currency display with exchange rates
- [x] International card payments (Stripe)

### Phase 3 - Referral System (Jan 26, 2026)
- [x] Unique referral codes per user (8 characters)
- [x] Referral code validation API
- [x] Referral rewards: 20 coins for referrer, 30 bonus for referee
- [x] New users with referral get 80 coins (50 + 30 bonus)
- [x] Referral stats tracking (count, earnings)
- [x] Referral leaderboard API
- [x] Profile page with referral card
- [x] Copy referral code button
- [x] Share button (Web Share API / clipboard fallback)
- [x] Signup form with referral code input
- [x] Real-time referral code validation with green checkmark
- [x] URL parameter support (?ref=CODE)
- [x] Recent referrals display in profile

### Phase 4 - UI/UX Enhancements (Jan 26, 2026)
- [x] Netflix-style UI overhaul with grid layout
- [x] App rebranded to "Kona" with custom logo
- [x] Hero Carousel - 3D curved card scroll with depth effect
  - [x] Side cards appear smaller, lower, and darker
  - [x] Touch swipe gesture support with snap scrolling
  - [x] Red dot indicators for navigation
  - [x] Smooth CSS transitions with 3D transforms
- [x] Horizontal scroll carousels for all genre sections
- [x] 25+ series with thumbnails for testing
- [x] Coming Soon section with "Remind Me" feature
  - [x] Release date badges
  - [x] Reserved count display (e.g., "8.5K Reserved")
  - [x] Reminder success modal with notification prompt

### Phase 5 - PWA & Push Notifications (Jan 26, 2026)
- [x] Progressive Web App (PWA) setup
  - [x] Web App Manifest with app icons
  - [x] Service Worker for caching and push
  - [x] Apple touch icons for iOS
- [x] Install App banner for mobile
  - [x] Android: "Install Now" with beforeinstallprompt
  - [x] iOS: Instructions to "Add to Home Screen"
- [x] Push notification permission flow
  - [x] Browser permission request
  - [x] Denied state with settings instructions
  - [x] Test notification on grant

### Phase 6 - Core Features (Jan 26, 2026)
- [x] Search functionality
  - [x] Real-time search as you type
  - [x] Search results with thumbnails and EP1 FREE badge
  - [x] Recent searches saved in localStorage
  - [x] Browse by genre options
- [x] Add to My List functionality
  - [x] Add/remove from list API endpoints
  - [x] Bookmark icon on series cards
  - [x] My List section on homepage (for logged-in users)
- [x] Continue Watching
  - [x] Backend API to track watch progress
  - [x] Real continue watching data from user's watch history
- [x] First Episode Free
  - [x] EP1 FREE badge on all series cards
  - [x] First episode always has coins_required: 0 in database

### Phase 7 - Monetization (Jan 26, 2026)
- [x] Subscription Plans
  - [x] Basic: $4.99/month - 100 coins
  - [x] Premium: $9.99/month - 300 coins (Popular)
  - [x] VIP: $14.99/month - 500 coins
  - [x] Stripe checkout integration
  - [x] Subscription page UI
- [x] Admin Panel
  - [x] Dashboard with stats (users, revenue, series, subscribers)
  - [x] User management (view all users, see coins/subscription)
  - [x] Series management (view all series)
  - [x] Transaction history

### Phase 8 - Navigation & UI Polish (Jan 26, 2026)
- [x] Top 10 Number Styling (Netflix-style)
  - [x] Large 144px font numbers on homepage
  - [x] Stroke outline effect (3px #5a5a5a)
  - [x] Numbers positioned behind thumbnails with z-index
  - [x] 96px numbers on category page grid
- [x] "See All" Navigation
  - [x] All category "See All" buttons navigate to /category/{category-name}
  - [x] CategoryPage component with back button and title
  - [x] Grid layout for standard categories (3-column)
  - [x] Special 2-column numbered grid for Top 10 category
  - [x] Support for: trending, top-10, my-list, romance, thriller, drama, action, coming-soon, new-releases

### Database Collections
- users, series, episodes, coming_soon, payment_transactions, referrals

## API Endpoints

### Search & My List APIs (New)
- GET /api/search?q={query} - Search series by title/description
- POST /api/user/my-list/add - Add series to My List
- POST /api/user/my-list/remove - Remove from My List
- GET /api/user/my-list - Get user's My List with series data
- GET /api/user/continue-watching - Get real watch progress

### Subscription APIs (New)
- GET /api/subscriptions/plans - Get all subscription plans
- POST /api/subscriptions/subscribe - Create Stripe subscription checkout
- GET /api/user/subscription - Get user's current subscription

### Admin APIs (New)
- GET /api/admin/stats - Dashboard statistics
- GET /api/admin/users - List all users
- PUT /api/admin/users/{id} - Update user (coins, subscription)
- GET /api/admin/series - List all series
- POST /api/admin/series - Create new series
- DELETE /api/admin/series/{id} - Delete series
- GET /api/admin/transactions - List all transactions
- POST /api/admin/make-admin?email={email}&secret={secret} - Make user admin

### Referral APIs
- GET /api/referral/validate/{code} - Validate referral code
- GET /api/referral/stats - Get user's referral statistics
- GET /api/referral/leaderboard - Get top referrers

### User Registration (Updated)
- POST /api/auth/register - Now accepts optional referral_code

## Reward Configuration
- Welcome bonus: 50 coins
- Daily reward: 10 coins
- Referrer reward: 20 coins
- Referee bonus: 30 coins

## Subscription Plans
| Plan | Price | Coins/Month | Features |
|------|-------|-------------|----------|
| Basic | $4.99 | 100 | 1 device, Standard quality |
| Premium | $9.99 | 300 | 2 devices, HD, Early access |
| VIP | $14.99 | 500 | 4 devices, 4K, Ad-free, Exclusive |

## Environment Variables Required
- STRIPE_API_KEY (pre-configured)
- FLUTTERWAVE_SECRET_KEY (needed for Africa payments)
- FLUTTERWAVE_PUBLIC_KEY (needed for Africa payments)

## Prioritized Backlog

### P0 (Critical) - None remaining

### P1 (High Priority)
- Add Flutterwave API keys for live Africa payments
- Video player with actual video content
- Episode unlock flow testing

### P2 (Nice to Have)
- Update favicon to Kona logo
- Social sharing to specific platforms
- User reviews/ratings
- Frontend refactoring (App.js still 4000+ lines - contexts extracted, pages pending)

### P3 (Future)
- Watch Party feature (synchronized viewing)

## Completed This Session (Jan 27, 2026)

### Backend Refactoring (Complete ✅)
Refactored monolithic `server.py` (2215 lines) into modular structure:
```
/app/backend/
├── server.py          # Main app entry (150 lines)
├── config/
│   └── settings.py    # Constants, packages, milestones config
├── models/
│   └── schemas.py     # Pydantic models for all endpoints
├── services/
│   ├── auth.py        # JWT, password hashing, user auth
│   ├── database.py    # MongoDB connection
│   └── geo.py         # Geolocation, payment config
└── routes/
    ├── auth.py        # Login, register, /auth/*
    ├── referral.py    # Stats, milestones, /referral/*
    ├── series.py      # Series, episodes, search
    ├── users.py       # Rewards, lists, progress, unlock
    ├── payments.py    # Store, checkout, subscriptions
    ├── notifications.py # Push subscription, settings
    ├── admin.py       # Admin CRUD operations
    └── promos.py      # Featured promos
```

### Frontend Refactoring (Started)
- Created `/contexts/AuthContext.jsx` - extracted auth provider
- Created `/config.js` - app configuration
- App.js still functional (4000+ lines) - incremental extraction recommended

### Milestone Notifications (New - Complete)
- In-app alert banner when user is within 3 referrals of next milestone
- Two notification types:
  - **Proximity**: "Only X more referrals to unlock 🥇 Gold!" (purple gradient)
  - **Claimable**: "🎉 You can claim your milestone reward!" (yellow gradient)
- Alert appears 8-13 seconds after login (staggered to avoid popup overlap)
- "Later" button dismisses, "Invite Friends"/"Claim Now!" navigates to profile
- Session storage prevents repeat alerts for same milestone
- Backend APIs for push notification subscriptions:
  - GET/PUT /api/notifications/settings
  - POST/DELETE /api/notifications/subscribe

### Referral Milestone Rewards (P2 - Complete)
- Implemented 5-tier milestone system for referral gamification:
  - 🥉 Bronze: 10 referrals → 100 coins
  - 🥈 Silver: 25 referrals → 300 coins  
  - 🥇 Gold: 50 referrals → 600 coins
  - 💎 Platinum: 100 referrals → 1500 coins
  - 👑 Diamond: 200 referrals → 4000 coins
- Backend APIs: GET /api/referral/milestones, POST /api/referral/milestones/{id}/claim
- Profile page shows milestones card with:
  - Progress bar to next milestone
  - All tiers with lock/claimable/claimed status
  - Yellow pulsing "Claim!" button for unlocked milestones
  - Green checkmark for claimed milestones
- Coins automatically added to user balance on claim
- Prevents double-claiming and claiming unreached milestones

### Promotional Popup Feature (P0 - Complete)
- Added promotional popup with admin-managed "featured_promos" collection
- Two triggers: App open (1.5s delay, once per session) and Timed (10-15s after browsing)
- Beautiful UI with promo image, title, subtitle, tags, description
- "Watch Now" button navigates to series page
- Session storage prevents re-showing popup in same session
- Backend APIs: GET /api/promos/active, Admin CRUD at /api/admin/promos

### Hero Carousel Fix (P0 - Complete)
- Replaced brittle custom 3D CSS implementation with Swiper.js coverflow effect
- Much more stable, professional feel with smooth animations
- Features: Auto-play (4s), Touch swipe, Pagination dots, Loop mode
- Side cards show with proper depth and opacity effects

### Bug Fixes
- Fixed guest viewing from series page - Episode 1 now plays without login
- Fixed promo popup timed trigger to respect session storage

## Previous Session
- Fixed Top 10 number styling (Netflix-style large outlined numbers behind thumbnails)
- Implemented "See All" navigation to dedicated category pages
- Created CategoryPage component with grid layouts
