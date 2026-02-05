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
- Content Approval Workflow for creators
- Subtitle support for videos (English, Swahili, French)

## Tech Stack
- **Frontend:** React.js, TailwindCSS, Framer Motion, PWA, Service Workers, Swiper.js, react-use-gesture, i18next/react-i18next
- **Backend:** FastAPI, Python, MongoDB
- **Video:** CDN optimization, ABR concepts, HLS, dynamic quality selection, VTT subtitles
- **Libraries:** Recharts

## Test Credentials
- **Demo User / Creator:** demo@kona.com / Demo123!
- **Super Admin:** superadmin@kona.com / SuperAdmin2025!

---

## What's Been Implemented

### Session: February 5, 2026

#### 1. Subtitle Upload UI for Creators (COMPLETED)
- Full subtitle upload interface in Creator Portal's episode editor
- Support for 3 languages: English, Swahili, French
- File picker for .vtt subtitle files
- Display of uploaded subtitles with delete functionality
- Language selector dropdown with (Replace) indicator for existing subtitles
- Helpful tip text about 40% reach increase with subtitles
- Backend endpoints already existed; UI was the final piece

#### 2. Creator Series Detail Page (COMPLETED)
- New route `/creator/series/:id` for viewing series details
- Episode list with edit functionality
- Series stats (views, earnings)
- Episode badges showing FREE, subtitle count (CC)
- Clickable episodes to open episode editor dialog

#### 3. Revenue from Rewarded Coins - Clarification (DOCUMENTED)
- **Policy:** Views paid for with rewarded/free coins do NOT generate creator revenue
- **Reason:** Only purchased coins represent actual revenue
- **Implementation:** Already coded in `/app/backend/routes/revenue.py`:
  - `free_coins_payout: False` setting
  - Separate tracking for `purchased_coin_earnings`
  - Note displayed in earnings dashboard: "Only purchased coins count"

#### 4. Video & Thumbnail Upload UI for Creators (COMPLETED - P1)
- **Series Editor Dialog:** Added thumbnail URL field with live preview
- **Episode Editor Dialog:** Added thumbnail URL and video URL fields
- URL-based input (industry standard - creators paste from Imgur, Cloudinary, Bunny.net)
- Preview images render when valid URL is entered
- Backend PATCH endpoints support `thumbnail_url` and `video_url` parameters

#### 5. Enhanced Creator Analytics (COMPLETED - P2)
- **Tab Navigation:** Dashboard and Analytics tabs in Creator Portal
- **Time Periods:** 7 Days, 30 Days, 90 Days, All Time, Custom date range
- **Custom Date Range:** Date picker with Apply button
- **Summary Cards with Trends:** Views, Earnings, Likes, Shares (with growth % indicators)
- **Additional Metrics:** Avg Daily Views/Earnings, Unique Viewers, Engagement Rate
- **Charts:** Views Over Time, Earnings Over Time (Recharts Area Charts)
- **Top Episodes:** Ranked list with views, earnings, likes, engagement rate
- **Series Performance:** Views and earnings breakdown by series
- **Peak Performance:** Best day highlight card
- **Growth Comparison API:** Compare current vs previous period with trends

#### 6. Creator Payout History System (COMPLETED)
- **Payouts Tab:** New tab in Creator Portal for payout management
- **Summary Cards:** Available Balance, Total Paid Out, Pending, Total Requested
- **Status Filters:** All, Pending, Processing, Completed, Failed
- **Request Payout Dialog:** Amount input, Method selector (M-Pesa, Bank, PayPal), Details field
- **Payout History List:** Shows all past requests with status, amount, method, timestamps
- **Backend Endpoints:** GET /api/creator/payouts with status filter, POST /api/creator/payout/request

#### 7. In-App Notification System (COMPLETED)
- **Notification Bell:** Icon with unread count badge in header
- **Notifications View:** Tab in Creator Portal showing all notifications
- **Filters:** All and Unread with counts
- **Bulk Actions:** Mark All Read, Clear All buttons
- **Individual Actions:** Mark Read, View Details, Delete per notification
- **Notification Types:** Series approved/rejected, Payout processed/failed, Milestone reached, Tier upgrade, Review feedback
- **Email Placeholders:** Email queue system ready for SendGrid/SES integration (MOCKED)
- **Backend Endpoints:** Full CRUD for notifications + email queue status

#### 8. CreatorPortal Refactoring (COMPLETED)
- **Before:** Single 970-line CreatorPortal.jsx handling all logic
- **After:** 275-line orchestration component using 6 modular sub-components
- **New Components Created:**
  - `CreatorHeader.jsx` - Tab navigation with notification bell
  - `CreatorStats.jsx` - Stats cards and tier progress visualization
  - `CreatorSeriesList.jsx` - Series list with thumbnails and status badges
  - `CreatorPendingSubmissions.jsx` - Pending submissions with status indicators
  - `PayoutHistory.jsx` - Full payout management with request dialog
  - `CreatorNotifications.jsx` - Notifications list with bulk/individual actions
- **Benefits:** Better maintainability, reusability, and testing
- **Summary Cards with Trends:** Views, Earnings, Likes, Shares (with growth % indicators)
- **Additional Metrics:** Avg Daily Views, Avg Daily Earnings, Unique Viewers, Engagement Rate
- **Charts:** Views Over Time (Area Chart), Earnings Over Time (Area Chart)
- **Top Episodes:** Ranked list with views, earnings, likes, engagement rate
- **Series Performance:** Views and earnings breakdown by series
- **Peak Performance:** Best day highlight card
- **Growth Comparison API:** Compare current vs previous period with trends

### Previous Session (February 3-4, 2026)

#### Content Approval Workflow (COMPLETED)
- Creators submit series with pilot episode for review
- Admin Review Panel with video preview
- Scoring system (content, market fit, technical)
- Approve/Reject/Request Changes functionality
- Email notification placeholders

#### Internationalization i18n (COMPLETED)
- i18next integration with react-i18next
- Language switcher in header
- Translation files for EN, SW, FR
- Key UI components translated

#### Subtitle System Foundation (COMPLETED)
- CC button in video player
- Subtitle track rendering
- Downloadable .vtt template for creators
- Backend endpoints for upload/get/delete subtitles

#### Desktop Hero Banner (COMPLETED)
- 3-column layout (info, carousel, top 10)
- Better screen real estate utilization

#### Like/Heart Feature (COMPLETED)
- Functional in video player and stories page
- Backend sync with optimistic UI

#### Stories Page (COMPLETED)
- TikTok-style vertical video viewer
- Swipe navigation for free episodes

---

## Pending/Blocked Tasks

### P1: Flutterwave Payment Integration (BLOCKED)
- **BLOCKED:** Awaiting Flutterwave API keys from user
- Will enable M-Pesa mobile money payments

---

## Upcoming Tasks

### P1: Flutterwave Payment Integration (BLOCKED)
- **BLOCKED:** Awaiting Flutterwave API keys from user
- Will enable M-Pesa mobile money payments

### P2: Fix Mock Video URLs
- Some mock videos fail to load
- Replace with working stock video URLs for testing

### P3: Email Service Integration
- Email queue system is ready (emails stored in `db.email_queue`)
- Needs SendGrid or AWS SES API keys to activate sending

---

## Future/Backlog

1. Auto-generated subtitles (Whisper integration)
2. Desktop responsive improvements for Creator Portal
3. PDF/CSV export for Investment Calculator
4. Watch Party push notifications
5. Real video hosting integration (Bunny.net configured but content mocked)

---

## Project Health

### Working
- All core features
- Desktop and Mobile responsive layouts
- Authentication (JWT)
- Coin economy
- Admin dashboard with submission review
- Creator portal with subtitle upload
- Stories/Free episodes viewer
- Like/Share functionality
- Internationalization (EN/SW/FR)
- Subtitle display in video player

### Mocked (Needs Real Implementation)
- Payment Gateways (Stripe, Flutterwave)
- Video Hosting/Streaming (Bunny.net)
- Push Notifications (Firebase)
- Email Service
- Advertising Content
- Video upload for creators (using URL input instead)

---

## Key API Endpoints

### Creator Portal
- `GET /api/creator/subtitle-template` - Download VTT template
- `POST /api/creator/episodes/{id}/subtitles` - Upload subtitle
- `GET /api/creator/episodes/{id}/subtitles` - Get subtitles
- `DELETE /api/creator/episodes/{id}/subtitles/{lang}` - Remove subtitle
- `POST /api/creator/series/submit` - Submit series for approval
- `GET /api/creator/submissions` - Get creator's submissions
- `PATCH /api/creator/series/{id}` - Update series (title, description, thumbnail_url, genre)
- `PATCH /api/creator/episodes/{id}` - Update episode (title, thumbnail_url, video_url, intro_duration, is_free, coins_required)

### Creator Analytics
- `GET /api/creator/analytics` - Get detailed analytics (period: 7d, 30d, 90d, all, custom)
- `GET /api/creator/analytics/compare` - Compare current vs previous period growth

### Admin Panel
- `GET /api/admin/submissions` - List pending submissions
- `POST /api/admin/submissions/{id}/review` - Approve/reject submission

### Stories & Social
- `GET /api/stories/feed` - Free first episodes
- `POST /api/episodes/like` - Like episode
- `GET /api/episodes/{id}/like-status` - Get like status
- `POST /api/episodes/share` - Track shares

---

## File Structure (Key Files)
```
/app
├── backend/
│   └── routes/
│       ├── creator.py (subtitle endpoints, series submission)
│       ├── admin.py (submission review)
│       ├── revenue.py (earnings, tier calculation)
│       └── users.py (likes, shares)
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── CreatorPortal.jsx (dashboard, submission form)
│       │   ├── CreatorSeriesDetailPage.jsx (NEW - episode list, subtitle upload)
│       │   ├── AdminDashboard.jsx (submission review panel)
│       │   ├── VideoPlayerPage.jsx (subtitle display, likes)
│       │   └── StoriesPage.jsx (vertical video viewer)
│       └── App.js (routes including /creator/series/:id)
├── public/
│   └── locales/ (en, sw, fr translation JSON files)
└── memory/
    └── PRD.md
```
