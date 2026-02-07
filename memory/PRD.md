# Kona Streaming Platform - Product Requirements Document

## Original Problem Statement
Build and enhance Kona, a streaming platform for mini-series content. The platform should support:
- User authentication with demo accounts for prospect presentations
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
3. **Investors/Prospects**: Demo accounts for presentations
4. **Admins**: Platform management, content seeding, user management

## Core Requirements

### Authentication
- [x] JWT-based authentication
- [x] Multi-device login support (fixed - allows concurrent sessions)
- [x] Demo accounts for prospects
- [ ] Device limits/session management (future)

### Content Management
- [x] Series and episodes CRUD
- [x] Category browsing
- [x] Search functionality
- [x] Engagement seeding (likes/views) via Admin Dashboard

### Monetization
- [x] Coin system
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
- [x] Store page with coin packages
- [x] Creator portal
- [x] Admin dashboard

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, react-helmet-async
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT tokens

## What's Been Implemented (as of Feb 2026)
- Full-width cinematic hero banner on homepage
- Multi-device login fix in backend/routes/auth.py
- SEO implementation (sitemap, robots.txt, meta tags, structured data)
- About page created and linked in footer
- Country-specific phone prefix detection for payments
- Engagement seeding UI in Admin Dashboard
- Demo accounts created (viewer, creator, investor, superadmin)
- Footer "About Us" link added

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
- [x] Footer "About Us" link - COMPLETED
- [ ] Re-deploy application to production

### P1 (High Priority)
- [ ] Submit sitemap to Bing Webmaster Tools (after re-deploy)
- [ ] Verify demo accounts on production

### P2 (Medium Priority)
- [ ] Device limits/session management
- [ ] Live payment gateway integration

### P3 (Low Priority/Enhancements)
- [ ] Social media links in footer
- [ ] Additional SEO optimizations
