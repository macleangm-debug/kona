# Kona Mini-Series App - Product Requirements Document

## Original Problem Statement
Build a "mini-series app" called "Kona," where users purchase coins to watch series. Similar to industry standards like Netflix and ReelShort.

## Core Features
- Coin-based economy for unlocking episodes
- Geo-targeted payment gateways (M-Pesa via Flutterwave, Stripe, mock KwikPay)
- Viral referral system with milestone-based rewards
- Netflix-style UI with grid layout, hero banners, content categories
- Responsive web view for desktop
- 3D rotating/swipeable hero banner
- "Add to My List" and "Continue Watching" functionality
- Search feature
- Admin panel with analytics
- Subscription plans
- First episode of each series is free
- Installable PWA with push notifications
- Promotional popup system
- Creator Portal for content partners
- Multi-language support (English, Swahili, French)
- Navigation tabs: Discover and Rewards
- Investment Calculator for financial projections
- Infrastructure Calculator for technical requirements
- Advertising system (pre-roll, mid-roll, post-roll, overlays)
- "Skip Intro" and "Swipe Down to Mini-Player" video player features

## Tech Stack
- **Frontend:** React.js, TailwindCSS, Framer Motion, PWA, Service Workers, Swiper.js, react-use-gesture
- **Backend:** FastAPI, Python, MongoDB
- **Video:** CDN optimization, ABR concepts, HLS, dynamic quality selection
- **Libraries:** Recharts, i18next/react-i18next

## Test Credentials
- **Demo User:** demo@kona.com / Demo123!
- **Super Admin:** superadmin@kona.com / SuperAdmin2025!

---

## What's Been Implemented

### Session: February 3, 2026

#### 1. Desktop Hero Banner Enhancement (COMPLETED)
- Redesigned desktop 3D carousel with 3-column layout
- **Left Panel:** Active series info (title, rating, description, Play/Details buttons)
- **Center:** Larger 3D carousel cards with coverflow effect
- **Right Panel:** "Top 10 This Week" list with clickable series, "Watch Free Episodes" button
- Removed blank space, better utilization of screen real estate

#### 2. Video Player Like/Heart Feature (COMPLETED)
- Functional Heart button with like count
- Optimistic UI updates with backend sync
- Visual feedback (red fill, scale animation when liked)
- API Endpoints:
  - POST /api/episodes/like
  - POST /api/episodes/unlike
  - GET /api/episodes/{id}/like-status

#### 3. Stories Page - TikTok-Style Free Episodes (COMPLETED)
- Full-screen vertical video viewer at /stories route
- Swipe up/down navigation between 25 free first episodes
- UI Components:
  - Close button (X)
  - Story counter (1/25)
  - Heart/Like button with count
  - Share button with modal (WhatsApp, Twitter, Facebook, Copy Link)
  - Episodes button (navigate to series)
  - Mute toggle
  - Series info at bottom
  - "Watch Full Series" CTA button
  - Navigation dots (right side)
- Double-tap to like feature
- Share tracking API: POST /api/episodes/share

#### 4. Mobile Floating "Free Episodes" Button (COMPLETED)
- Animated floating button at bottom-right on mobile
- Pink-to-purple gradient with pulse animation
- Navigates to /stories page

### Previous Session Completed Work
- **CDN Cost Optimization:** ABR, data-saver mode, quality selector, tier-based restrictions
- **PWA Install Prompt:** Custom "Install App" banner and profile settings option
- **Tiered Daily Rewards:** 1 coin for free episode, 3 coins for paid episode
- **Video Player Feature Suite:**
  - Swipe-Down Mini-Player
  - Skip Intro button
  - Creator-defined intro duration
  - Mocked Advertising System (pre/mid/post-roll, overlays)
- **Bug Fixes:** Hero banner autoplay, Spin wheel UI, Video player play button

---

## Pending/Blocked Tasks

### P1: Flutterwave Payment Integration (BLOCKED)
- Basic routes added to /app/backend/routes/payments.py
- **BLOCKED:** Awaiting Flutterwave API keys from user
- Will enable M-Pesa mobile money payments for Tanzania market

### P1: User Verification Pending
- Spin Wheel prize calculation fix (landed on 3, gave 2 points)
- Video Player play button fix (ad fallback implemented)

---

## Upcoming Tasks

### P0: Full Regression Test of Video Player Features
- Mini-Player, Skip Intro, and Ads features need thorough testing

### P1: Promo Video Creation
- Blocked by Universal Key budget for video generation

---

## Future/Backlog

1. PDF/CSV export for Investment Calculator results
2. Watch Party invitations via push notifications
3. Creator Portal with fully automated payouts (currently mocked)
4. Further gamify referral leaderboard
5. Full internationalization with Swahili and French translations
6. Real video hosting integration (Bunny.net configured but content mocked)

---

## Project Health

### Working
- All core features
- Desktop and Mobile responsive layouts
- Authentication (JWT)
- Coin economy
- Admin dashboard
- Creator portal
- Stories/Free episodes viewer
- Like/Share functionality

### Mocked (Needs Real Implementation)
- Payment Gateways (Stripe, Flutterwave)
- Video Hosting/Streaming (Bunny.net)
- Push Notifications (Firebase)
- Email Service
- Advertising Content

---

## File Structure (Key Files)
```
/app
├── backend/
│   ├── routes/
│   │   ├── users.py (likes, shares, stories endpoints)
│   │   ├── streaming.py (CDN config)
│   │   └── creator.py (intro duration)
│   └── server.py (seed data)
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── HomePageResponsive.jsx (desktop hero, mobile floating btn)
│       │   ├── VideoPlayerPage.jsx (like feature, ads, mini-player)
│       │   └── StoriesPage.jsx (NEW - TikTok-style viewer)
│       └── App.js (routes)
└── memory/
    └── PRD.md
```

## API Endpoints (New)
- `GET /api/stories/feed` - All free first episodes for stories mode
- `POST /api/episodes/like` - Like an episode
- `POST /api/episodes/unlike` - Unlike an episode
- `GET /api/episodes/{id}/like-status` - Get like status
- `POST /api/episodes/share` - Track episode shares
