# Kona Streaming Platform - PRD

## Original Problem Statement
Pull GitHub repository `https://github.com/macleangm-debug/kona` for code quality and security review, then add analytics for creators dashboard and fix security issues.

## Project Overview
**Kona** is an African mini-series streaming platform with features including:
- Video streaming for mini-series and drama content
- Coin-based economy for creators and viewers
- Creator portal with analytics and earnings
- Subscription tiers with device limits
- Admin dashboard for content moderation
- Ad platform integration
- Multi-language support (i18n)

## Tech Stack
- **Frontend:** React, Tailwind CSS, Recharts, Swiper
- **Backend:** FastAPI, Python
- **Database:** MongoDB (Motor async driver)
- **Auth:** JWT-based authentication with sessions

## What's Been Implemented

### Session 1 (2026-02-16)
1. **Repository Review & Setup**
   - Cloned and configured the Kona repository
   - Set up environment variables (MONGO_URL, DB_NAME, JWT_SECRET)
   - Fixed React hooks error in SupportChatWidget.jsx

2. **Security Fixes**
   - ✅ Removed hardcoded fallback for JWT_SECRET (now required env var)
   - ✅ Removed hardcoded fallback for MONGO_URL (now required env var)
   - ✅ Removed hardcoded fallback for DB_NAME (now required env var)
   - ✅ Made CORS origins configurable via CORS_ORIGINS env variable

3. **Enhanced Creator Analytics Dashboard**
   - Added 4 tabbed sections: Overview, Audience, Content, Episodes
   - **New Backend Endpoints:**
     - `GET /api/creator/analytics/audience` - Geographic distribution, device breakdown, audience segments
     - `GET /api/creator/analytics/realtime` - Live stats, hourly breakdown, trending content
     - `GET /api/creator/analytics/content` - Genre performance, episode retention analysis, AI insights
   - **Frontend Enhancements:**
     - Real-time stats banner with live viewers
     - Pie chart for device distribution
     - Bar charts for genre performance
     - Progress bars for country rankings
     - Episode retention analysis
     - "Best Time to Post" recommendation
     - Audience segment breakdown (highly engaged, moderate, casual)

## User Personas
1. **Viewer** - Watches content, earns rewards, uses coins
2. **Creator** - Uploads series, tracks analytics, earns money
3. **Admin** - Moderates content, manages users
4. **Super Admin** - Full platform access

## Core Requirements (Static)
- Secure authentication with device limits
- Content streaming with quality options
- Creator monetization (60% revenue share)
- Coin economy for viewers
- Analytics and reporting
- Mobile-first responsive design

## Prioritized Backlog

### P0 (Critical)
- [x] Security fixes (env vars)
- [x] Creator analytics enhancements

### P1 (High)
- [ ] Real payment gateway integration (Flutterwave/Stripe for Africa)
- [ ] Real SMS provider for OTP (Africa's Talking)
- [ ] Video encoding/CDN integration

### P2 (Medium)
- [ ] Push notifications
- [ ] Social sharing features
- [ ] Creator payout automation

### P3 (Low)
- [ ] Analytics export (CSV/PDF)
- [ ] A/B testing for thumbnails
- [ ] Recommendation engine improvements

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Test Creator | testcreator@gmail.com | TestCreator2025! |
| Super Admin | superadmin@kona.com | SuperAdmin2025! |

## API Endpoints Added
```
GET /api/creator/analytics/audience?period=30d
GET /api/creator/analytics/realtime
GET /api/creator/analytics/content?period=30d
```

## Environment Variables
```
# Backend (.env)
MONGO_URL=mongodb://localhost:27017  # Required
DB_NAME=kona_db                       # Required
JWT_SECRET=<secure-random-string>     # Required
CORS_ORIGINS=*                        # Optional, comma-separated

# Frontend (.env)
REACT_APP_BACKEND_URL=<backend-url>
```
