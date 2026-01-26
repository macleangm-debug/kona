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
- Referral milestone rewards
- Social sharing to specific platforms
- User reviews/ratings
- Subscription plans
- Admin panel

## Next Tasks
1. Implement "Add to My List" functionality
2. Connect Continue Watching section to real user data
3. Add search bar for series
