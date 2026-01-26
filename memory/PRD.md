# MiniSeries App - Product Requirements Document

## Original Problem Statement
Build a mini series app like ReelShort/Pocket FM where users purchase coins as credits to watch episodic video series.

## Target Audience
Young adults 18-35 who enjoy binge-watching short-form drama series on mobile

## Core Requirements (Static)
- User authentication (JWT)
- Browse series catalog by genre
- Watch video episodes
- Coin-based monetization
- Daily rewards system
- Stripe payment integration

## What's Been Implemented (Jan 26, 2026)

### Backend (FastAPI + MongoDB)
- [x] User registration with 50 coin welcome bonus
- [x] JWT authentication (72hr expiry)
- [x] Series & Episodes CRUD
- [x] Coin packages (4 tiers: $0.99-$9.99)
- [x] Stripe checkout integration
- [x] Daily reward system (10 coins/day)
- [x] Episode unlocking with coins
- [x] Watch progress tracking
- [x] Payment transaction logging

### Frontend (React + Tailwind)
- [x] Mobile-first dark theme (Neon Noir)
- [x] Bottom navigation
- [x] Home page with trending & genre sections
- [x] Series detail with episode list
- [x] Video player with progress tracking
- [x] Coin store with Stripe checkout
- [x] Profile page with stats
- [x] Auth modal (login/register)
- [x] Daily reward popup
- [x] Episode unlock sheet

### Database Collections
- users, series, episodes, payment_transactions

## Prioritized Backlog

### P0 (Critical)
- None remaining

### P1 (High Priority)
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
1. Add search bar for series
2. "Continue Watching" rail on home page
3. Episode recommendations
