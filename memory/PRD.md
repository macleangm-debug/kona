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

### Database Collections
- users, series, episodes, payment_transactions, referrals

## API Endpoints

### Referral APIs (New)
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

## Environment Variables Required
- STRIPE_API_KEY (pre-configured)
- FLUTTERWAVE_SECRET_KEY (needed for Africa payments)
- FLUTTERWAVE_PUBLIC_KEY (needed for Africa payments)

## Prioritized Backlog

### P0 (Critical) - None remaining

### P1 (High Priority)
- Add Flutterwave API keys for live Africa payments
- Search functionality
- Continue watching section

### P2 (Nice to Have)
- Push notifications
- Social sharing to specific platforms
- User reviews/ratings
- Subscription plans
- Admin panel

## Next Tasks
1. Obtain Flutterwave API keys for production
2. Add search bar for series
3. "Continue Watching" rail on home page
