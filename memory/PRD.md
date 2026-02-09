# Kona Streaming Platform - Product Requirements Document

## Original Problem Statement
Build and enhance Kona, a streaming platform for mini-series content targeting African audiences. The platform should support:
- User authentication with email OR phone number (African-friendly)
- Creator portal for content management
- Admin dashboard for platform management
- Content browsing with categories, search, and personalized recommendations
- Coin-based payment system with country-specific mobile money support
- VIP subscriptions
- SEO optimization for search engine visibility
- Custom domain support (www.streamkona.com)

## User Personas
1. **Viewers**: Watch content, earn/purchase coins, interact with series
2. **Creators**: Upload and manage content, view analytics
3. **Advertisers**: Run ad campaigns on the platform
4. **Investors/Prospects**: Demo accounts for presentations
5. **Admins**: Platform management, content seeding, user management

## Core Requirements

### Authentication
- [x] JWT-based authentication
- [x] Multi-device login support
- [x] Demo accounts for prospects
- [x] Phone number registration with OTP (WhatsApp/FlashCall/SMS)
- [x] Email registration option
- [x] Country selector with 15 African countries
- [ ] Device limits/session management (future)

### Content Management
- [x] Series and episodes CRUD
- [x] Category browsing
- [x] Search functionality
- [x] Engagement seeding (likes/views) via Admin Dashboard
- [x] Like button always visible on video player

### Monetization
- [x] Coin system with updated packages:
  - Starter: 50 coins @ $0.99
  - Basic: 120 + 5 bonus @ $1.99
  - Value: 350 + 15 bonus @ $4.99 (Popular)
  - Premium: 800 + 30 bonus @ $9.99
- [x] Episode cost: 15 coins
- [x] Country-specific phone prefixes for mobile payments
- [x] VIP subscription UI
- [ ] Live payment gateway (Stripe/Flutterwave) - UI only, not connected

### SEO
- [x] Meta tags in index.html
- [x] sitemap.xml
- [x] robots.txt
- [x] Structured data (JSON-LD)
- [x] Dynamic SEO components

### Pages
- [x] Homepage with cinematic hero banner
- [x] About page (/about)
- [x] Terms of Service (/terms)
- [x] Privacy Policy (/privacy)
- [x] Creators landing page (/creators)
- [x] Advertisers landing page (/advertisers)
- [x] Store page with coin packages
- [x] Creator portal
- [x] Admin dashboard

### Partner Pages
- [x] Creators page with CTAs, testimonials, FAQ
- [x] Advertisers page with ad formats, pricing tiers, contact form

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, react-helmet-async
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT tokens + OTP verification

## What's Been Implemented (as of Feb 8, 2026)
- Full-width cinematic hero banner on homepage
- Multi-device login fix
- SEO implementation (sitemap, robots.txt, meta tags, structured data)
- About, Terms, Privacy pages
- Creators and Advertisers landing pages
- Country-specific phone prefix detection for payments
- Engagement seeding UI in Admin Dashboard
- Demo accounts created
- Footer updated with "Partners" section
- Phone/Email auth with OTP verification (MOCKED - needs SMS provider)
- Like button always visible on video player (fixed)
- Reduced coin package bonuses (Option B)
- **Cinematic splash screen with sound** - Multi-stage animation with:
  - Pre-splash screen with animated, clickable logo (pulsing rings)
  - Main cinematic animation (logo zoom, particles, "KONA" text reveal)
  - Signature "Magic Chime" sound (plays after user interaction to comply with browser autoplay policies)
  - Smooth transition to home page after animation completes
- **Adaptive/Hybrid Video Player** - Automatically adjusts for any video format:
  - Auto-detects video aspect ratio (vertical 9:16, horizontal 16:9, square 1:1, etc.)
  - Vertical videos fill the screen when phone is held vertically
  - Horizontal videos show with "Rotate for fullscreen" hint
  - Fullscreen toggle button for horizontal videos
  - Screen orientation detection (portrait/landscape)
  - No restrictions on creator content format
- **Gesture Controls** for intuitive video interaction:
  - Double-tap center: Like/unlike video (with heart animation)
  - Double-tap left: Rewind 10 seconds
  - Double-tap right: Forward 10 seconds
  - Swipe left: Skip to next episode
  - Swipe right: Go to previous episode
  - Swipe down: Minimize to mini-player
- **Video Library Variety**: Episodes now use varied sample videos from Google's CDN for better testing experience
- **Stories Content System**: Separate "Stories" feed from "Free Access" for flexible content management:
  - Episode 1 of every series is automatically "Story Content" (appears in Stories feed)
  - Stories feed requires/recommends vertical (9:16) format for TikTok-style experience
  - Admin can make entire seasons free WITHOUT adding them to Stories feed
  - Creator Portal shows "STORIES" badge and vertical format guidance for Episode 1
  - API: `/api/stories/feed` returns only story content (Episode 1s + bonus stories)
  - Admin APIs: `/api/admin/series/{id}/make-free` and `/api/admin/series/{id}/make-paid`
- **Upload Validation for Vertical Videos**: Creator Portal shows vertical format requirements for Episode 1:
  - Visual badge "📱 Vertical (9:16) Required" on Episode 1 video uploads
  - Guidance panel explaining Stories feed requirement with recommended dimensions
  - Video dimension detection feedback (validates after video upload)
- **Business/Advertiser Portal**: Full advertising platform for businesses:
  - **4-tier pricing model**:
    - Basic (CPV): $0.02/view - Pay only for actual eyeballs
    - Pro (Monthly + CPV): $500/mo + $0.01/view - Lower rates with commitment
    - Premium (Sponsorship): From $2,000 - Series/genre exclusivity
    - Enterprise (Takeover): From $5,000 - Story takeover, full exclusivity
  - **Ad placements**: Pre-roll, mid-roll, overlay banner, story ads, sponsorships
  - **Campaign wizard**: 5-step creation (type → placement → budget/targeting → creative → review)
  - **Targeting options**: Genres, countries, age ranges
  - **Admin approval workflow**: Ads require approval before going live
  - **Analytics dashboard**: Impressions, views, clicks, CTR, cost tracking
  - **Billing system**: Add funds, transaction history
  - Routes: `/business/auth`, `/business/dashboard`, `/business/campaigns/new`
- **Prepay Wallet System** (Industry Standard):
  - 100% prepay model - no payment defaults
  - Minimum $50 balance to create campaigns
  - Budget reserved from wallet when campaign created
  - Automatic campaign pause when funds exhausted
  - Transaction history tracking
- **Hybrid Ad Placement Rules** (Platform-controlled):
  - Short videos (< 3 min): Pre-roll only (1 ad max)
  - Medium videos (3-10 min): Pre-roll + 1 mid-roll
  - Long videos (10+ min): Pre-roll + 2 mid-rolls + overlay
  - Free content only - paid episodes are ad-free
  - Premium subscribers see no ads
  - API: `/api/ads/serve`, `/api/ads/track`, `/api/ads/placement-rules`
- **Ad Serving Integration in Video Player**:
  - Fetches real ads from server via `/api/ads/serve`
  - Pre-roll ads play before video starts (on free episodes only)
  - Mid-roll ads play at 50% of video (for videos > 3 min)
  - Overlay ads show randomly during playback
  - Ad tracking: impressions (on load), views (at 75% completion), clicks
  - CPV charges automatically when view is tracked
  - Skip button appears after configured delay (default 3s for pre-roll, 5s for mid-roll)
  - "AD" badge and advertiser name shown during ad playback
  - Call-to-action button links to advertiser URL
  - Admin approval required before ads go live
- **Catchy Coin Animation**: Beautiful reward celebration effects:
  - 3D gold coins with "K" branding flying/falling
  - Animated number counter with gold gradient
  - Sparkle particles and radial glow effects
  - Three variants: "reward" (daily rewards), "topup" (purchases), "burst" (big wins)
  - Blurred backdrop overlay for focus
  - "Tap to continue" dismissal
  - Integrated into: Store page (top-ups), Rewards page (claims/spins)
- **Geo-location Tracking** (as of Feb 9, 2026):
  - Detects user's country from IP address on registration and login
  - Stores `geo` field on registration with country_name, country_code, is_african flag
  - Updates `last_login_geo` on each login with login timestamp
  - Data available in API responses for personalization and analytics
  - Uses GeoJS.io public API for IP-based country detection
- **Admin Ads Approval Tab** (as of Feb 9, 2026):
  - New "Ads Approval" section in Admin Dashboard
  - Stats cards showing pending ads, pending campaigns, active campaigns, total ad revenue
  - Approve/Reject buttons for ad creatives with preview
  - Approve/Reject buttons for campaigns with budget refund on rejection
  - Campaign rejection automatically refunds reserved budget to advertiser wallet
  - Backend endpoints: GET /api/admin/ads/pending, GET /api/admin/campaigns/pending, GET /api/admin/ads/stats
  - Action endpoints: POST /api/admin/ads/{id}/approve, POST /api/admin/ads/{id}/reject
  - Action endpoints: POST /api/admin/campaigns/{id}/approve, POST /api/admin/campaigns/{id}/reject

## Code Cleanup Completed (Feb 9, 2026)
- Removed temporary CoinAnimationDemo page (`/demo/coins` route and component)
- CoinAnimation component still available in `/app/frontend/src/components/CoinAnimation.jsx` for use in Store and Rewards pages

## Deployment Status
- **Preview Environment**: Contains all latest changes
- **Production (streamkona.com)**: Requires re-deployment to sync

## Demo Credentials
| Account | Email | Password | Access Level |
|---|---|---|---|
| Viewer | viewer@kona.demo | KonaDemo2025! | Regular user with 500 coins |
| Creator | creator@kona.demo | KonaDemo2025! | Approved creator with analytics |
| Investor | investor@kona.demo | KonaDemo2025! | Admin dashboard access |
| Super Admin | superadmin@kona.com | SuperAdmin2025! | Full platform control |

## Prioritized Backlog

### P0 (Critical)
- [x] Like button fix - COMPLETED
- [x] Phone/Email auth system - COMPLETED
- [x] Cinematic splash screen with sound - COMPLETED
- [ ] Re-deploy application to production
- [ ] Integrate real OTP provider (Africa's Talking/Twilio) for SMS/WhatsApp/FlashCall

### P1 (High Priority)
- [ ] Submit sitemap to Bing Webmaster Tools (after re-deploy)
- [ ] Verify demo accounts on production

### P2 (Medium Priority)
- [ ] Device limits/session management
- [ ] Live payment gateway integration

### P3 (Low Priority/Enhancements)
- [ ] Social media links in footer
- [ ] Additional SEO optimizations

## API Endpoints

### Auth
- `POST /api/auth/register` - Register with email or phone
- `POST /api/auth/login` - Login with email or phone
- `POST /api/auth/send-otp` - Send OTP via WhatsApp/FlashCall/SMS
- `POST /api/auth/verify-otp` - Verify OTP code
- `GET /api/auth/me` - Get current user

### Content
- `GET /api/series` - List all series
- `GET /api/series/:id/episodes` - Get episodes for a series
- `POST /api/episodes/like` - Like an episode
- `POST /api/episodes/unlike` - Unlike an episode
- `GET /api/episodes/:id/like-status` - Check like status

## Notes
- OTP sending is currently MOCKED (prints to console)
- Payment gateway is UI-only, not connected to real provider
- African countries supported: Kenya, Tanzania, Uganda, Nigeria, Ghana, South Africa, Rwanda, Ethiopia, Senegal, Ivory Coast, Cameroon, Zambia, Zimbabwe, Malawi, Botswana
