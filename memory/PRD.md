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
- [x] Device limits/session management - COMPLETED (Feb 10, 2026)
  - 5 devices per user (configurable per subscription tier)
  - View all active sessions with device info (browser, OS, location)
  - Logout from specific devices or all devices at once
  - Session tracking with JWT tokens

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
- [x] Dynamic meta tags per page
- [x] Open Graph tags for social sharing
- [x] Twitter Card support
- [x] Sitemap.xml
- [x] Robots.txt
- [x] JSON-LD structured data for series/episodes
- [x] PWA manifest and icons
- [x] Custom 404 page
- [x] Breadcrumb schema for navigation - COMPLETED (Feb 10, 2026)
- [x] Video schema for episodes - COMPLETED (Feb 10, 2026)
- [x] Organization schema - COMPLETED (Feb 10, 2026)
- [x] Website search action schema - COMPLETED (Feb 10, 2026)
- [ ] Submit sitemap to Bing Webmaster Tools
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
- **Enhanced Advertiser Analytics Dashboard** (as of Feb 9, 2026):
  - Three-tab layout: Overview, Performance, Campaigns
  - Overview Tab: Performance AreaChart (14 days), Campaign Status PieChart, Daily Spend BarChart, Account Summary
  - Performance Tab: Key metrics cards (CTR, View Rate, CPV, ROI), Engagement LineChart, Campaign Comparison BarChart
  - Campaigns Tab: Campaign list with status badges, budget progress bars, Ad formats sidebar
  - Backend endpoints: /api/advertiser/analytics/daily, /campaigns, /placements, /geo
- **Advanced Ad Targeting**:
  - Country targeting: All Africa, Kenya, Nigeria, South Africa, Ghana, Tanzania, Uganda, Rwanda, Ethiopia
  - Genre targeting: All Genres, Romance, Drama, Action, Comedy, Thriller, Horror, Documentary, Family
  - Age range targeting: 18-65, 18-24, 25-34, 35-44, 45-65
- **Creator Monetization Dashboard** (verified existing):
  - CreatorAnalytics component with Views/Earnings charts, top episodes, series performance
  - PayoutHistory component with M-Pesa, Bank Transfer, PayPal payout methods
  - Payout request with minimum 100 coins threshold

- **Email & Phone Verification System** (as of Feb 9, 2026):
  - **Resend Integration**: Beautiful HTML email templates with Kona branding
  - **Non-Blocking for Viewers**: No verification banner, users can browse/watch/buy coins freely
  - **Mandatory for Business Portal**: Advertisers MUST verify email before accessing dashboard
  - **Mandatory for Creator Portal**: Creators MUST verify email before accessing Creator Studio
  - **5 Coin Reward**: Awarded on verification (only if user seeks verification for rewards)
  - **Feature-Gating for Viewers**: Unverified blocked from: payouts, referral claims, password changes
  - **Password Reset**: Secure token-based reset via email (1-hour expiry) at /forgot-password
  - **Forgot Password Link**: Added to auth modal for easy access
  - **Test Mode**: Resend API returns code in response for development
  - **Domain Verification Needed**: Add DNS records to send from custom domain

- **Vertical Video Validation** (as of Feb 9, 2026):
  - "Validate" button in Episode Editor checks video dimensions from URL
  - Episode 1 MUST be vertical (9:16) for Stories feed - save is blocked if horizontal
  - Visual feedback: green checkmark for vertical, red X for horizontal on Episode 1
  - Toast notifications guide creators on format requirements
- **Live Campaign Performance Alerts** (as of Feb 9, 2026):
  - Automatic alerts when campaigns hit view milestones: 1K, 5K, 10K, 50K, 100K, 500K, 1M views
  - Budget threshold alerts at: 25%, 50%, 75%, 90%, 100% spent
  - Advertiser Dashboard: Bell icon with popover showing alerts, mark-as-read
  - Admin Dashboard: Alerts section in Ads tab showing all campaign alerts
  - Polling every 30 seconds for real-time updates
  - Backend endpoints: /api/advertiser/alerts, /api/admin/ads/alerts

## Code Cleanup Completed (Feb 9, 2026)
- Removed temporary CoinAnimationDemo page (`/demo/coins` route and component)
- CoinAnimation component still available in `/app/frontend/src/components/CoinAnimation.jsx` for use in Store and Rewards pages

## UI/UX Improvements (Feb 10, 2026)
- **Typewriter Animation for KONA**: Changed splash screen "KONA" text animation from slide-up reveal to typewriter effect
  - Each letter fades in sequentially with 0.18s delay between letters
  - Uses CSS keyframes `typewriterFade` for opacity and subtle translateY transition
  - Removed the animated underline beneath the text as per user request
  - Maintains the purple gradient text styling with drop shadow
- **Standardized Loading Indicators**: Replaced generic Loader2 spinners with Kona-branded loaders across all key pages
  - Added `KonaLoader` component: Spinning Kona logo icon with pulsing play button
  - Added `PageLoader` component: Full-page loader with KonaLoader and custom message
  - Updated pages: HomePage, BusinessDashboard, AdminDashboard, CreatorPortal, SeriesDetailPage, StorePage, RewardsPage, DownloadsPage, WatchPartyPage
  - Consistent branding throughout the loading experience

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
- [x] **Splash Screen Persistence Fix** - COMPLETED (Feb 11, 2026)
  - Fixed bug where splash screen appeared on every page navigation
  - Now uses `sessionStorage` to show splash only once per browser session
  - Splash shows on first visit, then bypassed for all subsequent navigations
  - Clears on browser/tab close (new sessions will see splash again - intentional)
- [x] **Promo Popup Rotation & Cleanup** - COMPLETED (Feb 11, 2026)
  - Removed "CHRISTMAS" placeholder text from promo popups
  - Added 5 different promos that rotate randomly: Love in the City (FEATURED), Revenge of the Rejected (TRENDING), The Secret Heir (MUST WATCH), My CEO Husband (FAN FAVORITE), The Dragon Prince (EPIC SERIES)
  - Updated usePromoManager hook to randomly select from eligible promos
  - Made promo title labels visible with white pill/badge styling
- [x] **Landing Page + PWA Flow** - COMPLETED (Feb 11, 2026)
  - Created new marketing landing page at `/` for first-time web visitors
  - Landing page shows hero section, features, stats, testimonials, and CTAs
  - Clicking "Start Watching Free" navigates to `/home` (app area) with splash screen
  - PWA install prompt only shows in app area (not on landing page)
  - Returning visitors (who clicked "Start Watching") go directly to `/home`, skip landing
  - PWA manifest `start_url` set to `/home` so installed PWA opens directly to watching area
  - Header and bottom navigation only show in app area, not on landing page
- [x] **Landing Page Enhancements** - COMPLETED (Feb 11, 2026)
  - Added "How It Works" section with 4-step sign-up process showing ease of getting started
  - Added FAQ section with 7 expandable questions covering common user queries
  - Added comprehensive footer with:
    - Company links (About, Careers, Press, Contact)
    - Support links (Help Center, Safety, Guidelines, Accessibility)
    - Legal links (Terms, Privacy, Cookies, DMCA)
    - Creator links (Portal, Guidelines, Revenue, Apply)
    - Social media icons (Twitter, Instagram, Facebook, YouTube)
    - Location badges (Nairobi, Lagos, Johannesburg)
    - Payment method badges (M-Pesa, Airtel Money, Visa, Mastercard, PayPal, Crypto)
- [x] **Netflix-Style Support System** - COMPLETED (Feb 11, 2026)
  - **AI Chatbot (Kona Assistant)**: GPT-5.2 powered floating chat widget available 24/7
    - Answers FAQs, guides users through issues
    - Quick action buttons for common queries
    - Maintains conversation context per session
  - **Help Center**: Searchable knowledge base at /help
    - Categories: Getting Started, Coins & Rewards, Subscriptions, Billing, Features, Troubleshooting, Creators
    - 8+ detailed help articles with full markdown content
  - **Support Tickets**: Async ticket system at /help/tickets/new
    - Tickets stored in MongoDB (persistent)
    - Admin dashboard section for ticket management
    - View, respond, update priority, close tickets
    - Automated resolution email sent when ticket is closed
    - Stats dashboard: Total, Open, In Progress, Closed
  - **Footer Content Pages**: All footer links now have full content
    - /careers - Open positions and benefits
    - /press - Media kit and press releases
    - /safety - Safety center and reporting
    - /guidelines - Community guidelines
    - /accessibility - Accessibility features
    - /cookies - Cookie policy
    - /dmca - Copyright/DMCA info
    - /creator-guidelines - Creator best practices
    - /revenue - Revenue sharing details
- [x] Geo-location tracking for users - COMPLETED (Feb 9, 2026)
- [x] Typewriter animation for KONA splash screen - COMPLETED (Feb 10, 2026)
- [x] Standardized loading indicators with Kona branding - COMPLETED (Feb 10, 2026)
- [x] Device limits/session management - COMPLETED (Feb 10, 2026)
- [x] Enhanced SEO with breadcrumbs and video schema - COMPLETED (Feb 10, 2026)
- [x] Advanced geo-targeting for ad campaigns - COMPLETED (Feb 10, 2026)
- [x] VIP subscription tiers with variable device limits - COMPLETED (Feb 10, 2026)
- [x] VIP subscription flow with KwikPay (MOCKED) - COMPLETED (Feb 10, 2026)
  - Tiers: Free ($0, 3 devices), Basic ($2.99, 5), Premium ($5.99, 7), VIP ($9.99, 10)
  - Local pricing: KES, NGN, GHS, TZS, UGX, RWF, ZAR
  - Payment providers: M-Pesa, Airtel Money, MTN Mobile Money, Card, Bank
  - Full upgrade flow with simulate-success demo endpoint
- [x] Subscription Management UI - COMPLETED (Feb 10, 2026)
- [x] Email Verification Gating for Gamification - COMPLETED (Feb 11, 2026)
  - **Ungated features** (accessible to unverified users): Daily Rewards, Spin Wheel, Referral (share + claim)
  - **Gated features** (require email verification): Scratch Card, Mystery Box, Watch Streak, Streak Shield, Daily Challenges, Character Cards, Prediction Games
  - New `EmailVerificationGate` component with soft prompt modal
  - Shows blurred overlay with "Verify Email to Unlock" + "Verify Now" button
  - Verification flow: send 6-digit code → enter code → unlock features + earn 5 bonus coins
- [x] Dynamic Exchange Rate System with Configurable Margins - COMPLETED (Feb 11, 2026)
  - Live rates from free fawazahmed0/exchange-api (no API key needed)
  - Supports 7 African currencies: KES, TZS, UGX, RWF, GHS, NGN, ZAR
  - **Admin-configurable margin** (default 5%) - goes to Kona as revenue
  - Per-country margin overrides for custom pricing strategies
  - Admin UI: `/admin` → "Exchange Rates" tab
  - Shows market rate, effective rate, $10 example, Kona profit per transaction
  - **Creators see payout amounts WITHOUT margin info** (hidden from their view)
  - Revenue tracking and analytics for margin income
- [x] Local Currency Display with Smart Rounding - COMPLETED (Feb 11, 2026)
  - Display format: "KES 449 (~$2.99 USD)" - local currency prominent, USD reference
  - **Smart rounding** to psychologically appealing numbers (ends in 9 or 0)
  - Examples: 389 → 399, 1,287 → 1,399, 25,830 → 25,999
  - Never rounds down - always rounds up to nice number
  - Admin dashboard shows breakdown: Margin Profit + Rounding Profit = Total Kona Profit
  - **Creator payouts use exact conversion** (no rounding markup applied to their share)
- [x] Psychological Pricing Presets - COMPLETED (Feb 11, 2026)
  - Three pricing styles: Value (ends in 9), Premium (ends in 0), Exact (no rounding)
  - Pre-configured defaults: Basic/Premium → Value, VIP → Premium
  - Admin UI to override per tier (Admin → Exchange Rates → Pricing Styles)
  - APIs: GET/PUT/DELETE `/admin/exchange-rates/pricing-styles/{tier_id}`
  - Rounding profit tracked and displayed in admin dashboard
- [x] A/B Testing for Pricing Styles - COMPLETED (Feb 11, 2026)
  - Create experiments with multiple pricing style variants
  - Consistent user assignment via MD5 hashing
  - Impression and conversion tracking per variant
  - Statistical analysis with z-score and confidence levels (90%, 95%, 99%)
  - Admin UI: Admin → A/B Testing tab
  - Features: Create test, view live results, declare winner, apply winner as default
  - Integration: `/subscriptions/tiers?user_id=xxx` returns user's assigned variant
- [ ] Re-deploy application to production
- [ ] Integrate real KwikPay/Flutterwave API (currently MOCKED)
- [ ] Integrate real OTP provider (Africa's Talking/Twilio) for SMS/WhatsApp/FlashCall

- [x] **AI Support Icon Positioning Fix** - COMPLETED (Feb 11, 2026)
  - Repositioned support chat widget to avoid overlap with bottom navigation
  - Mobile: `bottom-[72px]` places button 8px above the 64px bottom nav
  - Desktop: `bottom-6` (standard positioning)
  - Increased z-index to `z-[60]` to ensure visibility
  - Chat window opens above the button with proper spacing
- [x] **Landing Page Mobile Optimization** - COMPLETED (Feb 11, 2026)
  - Header: Responsive sizing with `sm:` breakpoints for logo and buttons
  - Hero section: Smaller text on mobile (`text-3xl`), full-width buttons
  - How It Works: 2x2 grid on mobile (`grid-cols-2`), smaller cards and icons
  - Features section: Single column on mobile, stacked cards
  - Testimonials: Single column on mobile
  - FAQ: Smaller padding and text on mobile
  - Footer: Better grid layout, locations wrap properly, reduced payment methods on mobile

### P1 (High Priority)
- [x] Admin UI for Ad Approval - COMPLETED (Feb 9, 2026)
- [x] Enhanced Advertiser Analytics Dashboard - COMPLETED (Feb 9, 2026)
- [x] Creator Monetization Dashboard - VERIFIED EXISTING
- [x] Advanced Ad Targeting using Geo Data - VERIFIED EXISTING
- [x] Vertical video validation in Creator Portal - COMPLETED (Feb 9, 2026)
- [x] Live Campaign Performance Alerts - COMPLETED (Feb 9, 2026)
- [ ] Submit sitemap to Bing Webmaster Tools (after re-deploy)
- [ ] Verify demo accounts on production

### P2 (Medium Priority)
- [ ] Device limits/session management
- [ ] Stripe integration for wallet top-up (Advertisers)

### P3 (Low Priority/Enhancements)
- [ ] Social media links in footer
- [ ] Additional SEO optimizations

## API Endpoints

### Auth
- `POST /api/auth/register` - Register with email or phone (returns geo data)
- `POST /api/auth/login` - Login with email or phone (returns geo and last_login_geo)
- `POST /api/auth/send-otp` - Send OTP via WhatsApp/FlashCall/SMS
- `POST /api/auth/verify-otp` - Verify OTP code
- `GET /api/auth/me` - Get current user (includes geo fields)

### Content
- `GET /api/series` - List all series
- `GET /api/series/:id/episodes` - Get episodes for a series
- `POST /api/episodes/like` - Like an episode
- `POST /api/episodes/unlike` - Unlike an episode
- `GET /api/episodes/:id/like-status` - Check like status

### Admin - Ads Management (NEW)
- `GET /api/admin/ads/pending` - Get pending ad creatives for approval
- `GET /api/admin/campaigns/pending` - Get pending campaigns for approval  
- `GET /api/admin/ads/stats` - Get advertising statistics
- `POST /api/admin/ads/{id}/approve` - Approve an ad creative
- `POST /api/admin/ads/{id}/reject` - Reject an ad creative
- `POST /api/admin/campaigns/{id}/approve` - Approve and activate a campaign
- `POST /api/admin/campaigns/{id}/reject` - Reject campaign and refund budget

### Advertiser
- `POST /api/advertiser/register` - Register business account
- `POST /api/advertiser/login` - Login as advertiser
- `POST /api/advertiser/campaigns` - Create campaign (requires wallet balance)
- `GET /api/ads/serve` - Serve ads for video playback
- `POST /api/ads/track` - Track ad events (impressions, views, clicks)

## Notes
- OTP sending is currently MOCKED (prints to console)
- Payment gateway is UI-only, not connected to real provider
- African countries supported: Kenya, Tanzania, Uganda, Nigeria, Ghana, South Africa, Rwanda, Ethiopia, Senegal, Ivory Coast, Cameroon, Zambia, Zimbabwe, Malawi, Botswana
