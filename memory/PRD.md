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
