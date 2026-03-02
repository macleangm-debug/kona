# KONA - Complete Feature List

## Platform Overview
**Kona** is an African mini-series streaming platform with a full ecosystem for viewers, creators, and administrators.

**Tech Stack:** React, FastAPI, MongoDB, Bunny.net CDN, Multi-Language (English, Swahili, French)

---

## VIEWER FEATURES

### Content Discovery & Streaming
- **Netflix-style UI** with lazy-loading carousels and smooth animations
- **Video streaming** with multi-quality fallback (HLS → MP4 720p/480p/360p → Embed)
- **"Watch Free NOW"** section with animated CTA for free first episodes
- **Stories/Reels Mode** - TikTok-style vertical video viewing for free content
- **Personalized "For You"** recommendations based on viewing history
- **"Because You Watched"** suggestions
- **Trending content** based on real-time watch activity
- **Genre-based discovery** (Romance, Drama, Thriller, Action, Comedy, Mystery, Fantasy, Historical)
- **Enhanced search** with auto-complete, filters, trending searches, and search history
- **Series detail pages** with episode list, ratings, and related content
- **Watch party** feature for synchronized viewing with friends

### User Account & Economy
- **Coin-based economy** - earn and spend virtual coins
- **Rewards system** with daily check-ins and achievements
- **Leaderboard** showing top viewers
- **Profile customization** with avatar and preferences
- **Watch history** tracking
- **My List** - save series to watchlist
- **Referral program** with unique codes and rewards

### Monetization & Support
- **Subscription tiers** with device limits
- **Coin store** to purchase coins
- **Tip creators** with 5 tiers (10/50/100/500/1000 coins) with visual effects
- **Contribute to tip goals** - fundraising campaigns by creators
- **Early access subscriptions** - Basic (24h), Premium (48h), VIP (72h) early content
- **Creator shop purchases** - buy digital and physical merchandise

### Social Features
- **Like/heart** episodes
- **Social sharing** to WhatsApp, Twitter/X, Facebook, Telegram
- **Copy link** with referral code injection
- **Vote on polls** created by creators
- **Ask questions** in Q&A sessions
- **Follow creators**

### Multi-Language & Accessibility
- **3 languages:** English, Swahili (Kiswahili), French (Français)
- **Language selector** in header (globe icon)
- **Subtitles support** (WebVTT format)

---

## CREATOR FEATURES

### Creator Portal Dashboard
- **Grouped navigation** with collapsible sections:
  - **Overview:** Dashboard
  - **Revenue:** Earnings, Analytics, Tips, Tip Goals, Shop, Payouts
  - **Content Tools:** Scheduler, Trailers, AI Thumbnails
  - **Growth:** Early Access, Merchandise, Sponsorships, Milestones, Polls & Q&A

### Content Management
- **Series creation** with title, description, genre, thumbnail
- **Batch episode upload** with drag-and-drop
- **Season management** - organize episodes into seasons
- **Drag & drop reordering** of episodes within and across seasons
- **Bulk episode editing** - select multiple episodes for batch updates
- **Episode preview** before publishing (HLS player)
- **Video format validation** (vertical-only enforced)
- **Bunny.net CDN integration** for video hosting
- **Publishing flow** - publish when encoding is "ready"
- **Subtitle upload** with template download (WebVTT)

### AI & Automation Tools
- **AI Thumbnail Generator** - multi-provider (OpenAI GPT Image 1, Gemini Nano Banana)
  - Custom prompts with style options (cinematic, dramatic, colorful, minimalist, anime)
  - Genre-based auto-generation
  - Multiple variations for A/B testing
  - Apply directly to series/episodes
- **Quick Generate** button in series editor
- **Trailer Creator** - compile highlights from episodes
  - AI scene detection
  - Background music library
  - Multiple export formats (1080p, 720p, vertical, square)
- **Create Shorts** - clip episodes for TikTok/Instagram/YouTube

### Analytics & Insights
- **Real-time dashboard** with live viewers and hourly breakdown
- **Audience analytics** - geographic distribution, device breakdown, audience segments
- **Content performance** - genre analysis, episode retention, AI insights
- **"Best Time to Post"** recommendation
- **Earnings breakdown** - daily/weekly/monthly with charts
- **Export to CSV/PDF**

### Monetization
- **Earnings Dashboard** - live coin ticker, transaction history
- **Tip Jar** - receive tips with 5 tiers (creator receives 75%)
- **Tip Goals** - create up to 3 fundraising campaigns (100-1M coins)
- **Creator Shop** - sell digital and physical items
  - Image upload (PNG/JPG/WEBP)
  - Stock management for physical items
  - Order fulfillment with tracking
  - Creator receives 75% of sales
- **Early Access** - charge for early episode access
  - Configure per-series or per-episode
  - 3 tiers: Basic (24h), Premium (48h), VIP (72h)
- **Merchandise Store** - physical and digital products
- **Sponsorship Marketplace** - connect with brands
  - Browse campaigns
  - Apply with pitch and asking price
  - Receive brand outreach

### Payouts
- **Tiered payout system:**
  - Instant ($100+): 2% fee
  - Weekly ($50-99): 1.5% fee
  - Bi-weekly ($25-49): 1% fee
  - Monthly ($10-24): 0.5% fee
- **Auto-payout** when balance reaches threshold
- **Payment methods:** M-Pesa, MTN Mobile Money, Bank Transfer, PayPal
- **Payout history** with status tracking

### Engagement Tools
- **Episode Scheduler** - queue episodes for timed release
  - Timezone selection (EAT, WAT, EET, UTC)
  - Subscriber notifications
  - Early access hours for premium
- **Fan Polls & Q&A**
  - Poll types: Multiple choice, Yes/No, 1-5 Rating
  - Pin polls, close polls, allow multiple votes
  - Q&A with upvoting system
- **Milestones & Badges** - achievement system
  - 5 categories: Views, Episodes, Earnings, Series, Streak
  - Multiple tiers with coin rewards
  - Celebration animations

### Notifications
- Creator notifications for tips, new followers, milestones

---

## ADMIN FEATURES

### Admin Dashboard
- **Grouped navigation** with 6 sections:
  - **Overview:** Dashboard
  - **Operations:** Users, Content, Submissions, Creators, Ads
  - **Finance:** Revenue, Revenue Settings, Exchange Rates
  - **Engagement:** Notifications, A/B Testing, Thumbnail A/B, Seeding
  - **Business:** Job Applications, Press & News, Support
  - **Super Admin:** Platform Settings, Launch Checklist, Investment Calculator, Infrastructure, Docs

### User Management
- View all users with search and filters
- Edit user details, coins, subscription status
- Ban/unban users
- View user activity and watch history

### Content Moderation
- **Series management** - approve, feature, or reject
- **Episode review** queue
- **Submissions** pending approval
- **Creator applications** review

### Revenue & Finance
- **Revenue dashboard** with platform-wide analytics
- **Revenue settings** - configure platform fees
- **Exchange rate management** for multi-currency
- **Commission settings** (configurable, default 75% creator / 25% platform)

### Platform Settings (Super Admin)
- **Global pricing** - default episode price, first episode free toggle
- **Video format** - vertical only / landscape / both
- **Per-series pricing override** - mark exclusive, custom price
- **Commission rates** - configure tip and shop creator percentages

### Notifications Management
- **Broadcast notifications** to segments:
  - All Users, VIP, Creators, Inactive, New Users, High Spenders
- **Notification types:** Info, Success, Warning, Promo, New Content
- **Automated triggers:** new episode, coin balance low, inactive user, weekly digest
- **Campaign history** and analytics

### A/B Testing
- **Thumbnail A/B Testing**
  - Create tests with multiple variants
  - Traffic allocation weights
  - Impression and click tracking with CTR
  - Declare winners and auto-apply

### Contract Management
- **Creator contracts** with full CRUD
- **Revenue split calculator** (60% creator / 40% platform after 25% platform fee)
- **Tax handling:** Self-assessment, Platform withholds, Gross-up
- **Contract workflow:** Draft → Sent → Signed → Active → Terminated/Expired
- **Super Creator contracts** with territory exclusivity
- **Sub-creator commission** (configurable %, negotiable terms)
- **HTML contract generation** with signature blocks

### Infrastructure (Super Admin)
- **Launch checklist** for deployment readiness
- **Investment calculator**
- **Production scaling documentation**
- **Bunny.net configuration** - manage allowed referrer domains

### Support
- **Support tickets** management
- **Job applications** review
- **Press & news** management

---

## BUSINESS/ADVERTISER FEATURES

### Advertiser Portal
- Business authentication flow
- Campaign creation and management
- Ad creative upload
- Targeting options
- Analytics and reporting

---

## TECHNICAL FEATURES

### Security
- JWT-based authentication with session management
- Configurable CORS origins
- Token expiration checks
- Rate limiting
- Device limit enforcement for subscriptions

### Performance
- Netflix-style lazy loading for carousels
- React.memo optimization for components
- Debounced API calls
- Cache invalidation on updates
- Skeleton loading animations

### Video Infrastructure
- **Bunny.net CDN** integration
- Multi-tier video fallback: HLS → MP4 (720p/480p/360p) → Embed
- Auto-configuration of allowed referrer domains
- Video encoding status tracking

### Internationalization
- i18next integration
- 3 languages: English, Swahili, French
- Browser language detection
- Language persistence in localStorage

### Mobile-First Design
- Responsive layouts for all screen sizes
- Touch-friendly interactions
- Bottom navigation for mobile
- Swipe gestures for Stories mode

---

## API ENDPOINTS SUMMARY

### Public APIs
- Series listing, search, recommendations
- Episode streaming
- User authentication

### Creator APIs
- Series/episode management
- Analytics and earnings
- Payout requests
- Shop management

### Admin APIs
- User management
- Content moderation
- Platform settings
- Revenue analytics
- Contract management

---

## MONETIZATION SUMMARY

| Revenue Stream | Creator Share | Platform Share |
|---------------|---------------|----------------|
| Tips | 75% | 25% |
| Shop Sales | 75% | 25% |
| Episode Coins | 60% (after 25% platform fee) | 40% + 25% |
| Early Access | 70% | 30% |
| Subscriptions | Platform revenue | N/A |

---

## DEMO CREDENTIALS

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@kona.com | SuperAdmin2025! |
| Test Creator | testcreator@gmail.com | TestCreator2025! |

---

*Last Updated: March 2026*
