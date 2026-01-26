# MiniSeries App - Product Requirements Document

## Original Problem Statement
Build a mini series app like ReelShort/Pocket FM where users purchase coins as credits to watch episodic video series. Support geo-based payment routing for East/Central Africa with local payment methods.

## Target Audience
Young adults 18-35 in East/Central Africa who enjoy binge-watching short-form drama series on mobile

## Core Requirements (Static)
- User authentication (JWT)
- Browse series catalog by genre
- Watch video episodes
- Coin-based monetization
- Daily rewards system
- Multi-region payment support (Africa + International)

## What's Been Implemented

### Phase 1 - MVP (Jan 26, 2026)
- [x] User registration with 50 coin welcome bonus
- [x] JWT authentication (72hr expiry)
- [x] Series & Episodes CRUD
- [x] Coin packages (4 tiers: $0.99-$9.99)
- [x] Stripe checkout integration
- [x] Daily reward system (10 coins/day)
- [x] Episode unlocking with coins
- [x] Watch progress tracking
- [x] Mobile-first dark theme (Neon Noir)

### Phase 2 - Geo-Payment Routing (Jan 26, 2026)
- [x] IP-based geolocation detection
- [x] Manual country selection
- [x] East/Central Africa support:
  - Kenya (M-Pesa + Card) - KES
  - Tanzania (M-Pesa + Card) - TZS
  - Uganda (MTN MoMo + Airtel + Card) - UGX
  - Rwanda (MTN MoMo + Card) - RWF
  - DR Congo (Airtel + Card) - CDF
  - Burundi (Card) - BIF
  - South Sudan (Card) - SSP
- [x] International card payments (Stripe) - USD
- [x] Flutterwave integration for African mobile money
- [x] Local currency display with exchange rates
- [x] Phone number input for mobile money
- [x] Payment method routing (Flutterwave Africa, Stripe Intl)

### Database Collections
- users, series, episodes, payment_transactions

## API Endpoints

### Geo/Payment APIs
- GET /api/geo/detect - Auto-detect country from IP
- GET /api/geo/countries - List supported countries
- GET /api/geo/payment-methods/{country_code} - Get payment methods

### Store APIs
- GET /api/store/packages - List coin packages
- POST /api/store/checkout - Create payment (routes to Stripe or Flutterwave)
- GET /api/store/checkout/status/{id} - Check payment status

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
- Push notifications

### P2 (Nice to Have)
- Social sharing
- User reviews/ratings
- Subscription plans
- Referral system
- Admin panel

## Next Tasks
1. Obtain Flutterwave API keys for production
2. Add search bar for series
3. "Continue Watching" rail on home page
