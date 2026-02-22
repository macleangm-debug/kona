# Kona Platform - Creator & Video Architecture

> Complete technical documentation of the video streaming infrastructure, creator workflows, and system architecture.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Video Infrastructure (Bunny.net)](#video-infrastructure-bunnynet)
3. [Creator Portal Architecture](#creator-portal-architecture)
4. [Video Upload Flow](#video-upload-flow)
5. [Video Playback Flow](#video-playback-flow)
6. [Admin Controls](#admin-controls)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Troubleshooting](#troubleshooting)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KONA PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   VIEWERS    │    │   CREATORS   │    │    ADMIN     │                   │
│  │              │    │              │    │              │                   │
│  │ • Watch      │    │ • Upload     │    │ • Settings   │                   │
│  │ • Search     │    │ • Manage     │    │ • Approvals  │                   │
│  │ • Purchase   │    │ • Analytics  │    │ • Analytics  │                   │
│  │ • Subscribe  │    │ • Payouts    │    │ • Payouts    │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                            │
│         └───────────────────┼───────────────────┘                            │
│                             │                                                │
│                    ┌────────▼────────┐                                       │
│                    │  FASTAPI BACKEND │                                       │
│                    │                  │                                       │
│                    │ • Authentication │                                       │
│                    │ • Series/Episodes│                                       │
│                    │ • Payments       │                                       │
│                    │ • Streaming      │                                       │
│                    └────────┬─────────┘                                       │
│                             │                                                │
│              ┌──────────────┼──────────────┐                                 │
│              │              │              │                                 │
│      ┌───────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐                           │
│      │   MONGODB    │ │ BUNNY.NET │ │   REDIS   │                           │
│      │              │ │   (CDN)   │ │  (Cache)  │                           │
│      │ • Users      │ │           │ │           │                           │
│      │ • Series     │ │ • Videos  │ │ • Sessions│                           │
│      │ • Episodes   │ │ • HLS     │ │ • Rate    │                           │
│      │ • Payments   │ │ • MP4     │ │   Limiting│                           │
│      └──────────────┘ └───────────┘ └───────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Video Infrastructure (Bunny.net)

### Overview
Bunny.net provides video hosting, transcoding, and global CDN delivery. Videos are automatically transcoded into multiple formats and qualities.

### Configuration Keys

| Environment Variable | Purpose | Required For |
|---------------------|---------|--------------|
| `BUNNY_LIBRARY_ID` | Video library identifier | All operations |
| `BUNNY_API_KEY` | Stream API key for uploads | Creator uploads |
| `BUNNY_CDN_HOSTNAME` | CDN URL prefix (vz-xxx.b-cdn.net) | Video playback |
| `BUNNY_ACCOUNT_API_KEY` | Account-level API (optional) | Embed player domain config |

### Video URL Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VIDEO URL HIERARCHY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIMARY: HLS (Adaptive Bitrate Streaming)                                   │
│  ├── URL: https://vz-xxx.b-cdn.net/{video_id}/playlist.m3u8                 │
│  ├── Best quality, adapts to bandwidth                                       │
│  └── Requires HLS.js in browser                                              │
│                                                                              │
│  FALLBACK 1: MP4 720p                                                        │
│  ├── URL: https://vz-xxx.b-cdn.net/{video_id}/play_720p.mp4                 │
│  ├── Direct download, highest quality MP4                                    │
│  └── Works everywhere, no special player needed                              │
│                                                                              │
│  FALLBACK 2: MP4 480p                                                        │
│  ├── URL: https://vz-xxx.b-cdn.net/{video_id}/play_480p.mp4                 │
│  └── Medium quality, smaller file size                                       │
│                                                                              │
│  FALLBACK 3: MP4 360p                                                        │
│  ├── URL: https://vz-xxx.b-cdn.net/{video_id}/play_360p.mp4                 │
│  └── Low quality, works on slow connections                                  │
│                                                                              │
│  FALLBACK 4: Embed Player (Last Resort)                                      │
│  ├── URL: https://iframe.mediadelivery.net/embed/{library_id}/{video_id}    │
│  ├── Bunny's built-in player                                                 │
│  └── Requires domain configuration (may fail with 403)                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why MP4 URLs Always Work
- CDN returns `access-control-allow-origin: *` (CORS enabled for all domains)
- No domain configuration required
- Direct file download from edge servers
- Works on any device/browser

---

## Creator Portal Architecture

### User Roles & Permissions

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           USER ROLES                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  VIEWER (Default)                                                         │
│  ├── Watch free episodes                                                  │
│  ├── Purchase episodes with coins                                         │
│  ├── Subscribe to creators                                                │
│  └── Daily rewards & referrals                                            │
│                                                                           │
│  CREATOR (Approved)                                                       │
│  ├── All viewer permissions                                               │
│  ├── Create series & upload episodes                                      │
│  ├── View analytics & earnings                                            │
│  ├── Request payouts                                                      │
│  └── Auto-payout configuration                                            │
│                                                                           │
│  ADMIN (Super)                                                            │
│  ├── All creator permissions                                              │
│  ├── Approve creators                                                     │
│  ├── Set platform pricing                                                 │
│  ├── Configure video rules                                                │
│  ├── Process payouts                                                      │
│  ├── A/B testing & analytics                                              │
│  └── Send notifications                                                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Creator Dashboard Features

| Tab | Features |
|-----|----------|
| **Dashboard** | Overview stats, recent uploads, earnings summary |
| **Series** | Create/edit series, manage episodes, seasons |
| **Analytics** | Views, revenue, subscriber growth, geographic data |
| **Payouts** | Request payouts, auto-payout settings, history |
| **Settings** | Profile, payment methods, notification preferences |

---

## Video Upload Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VIDEO UPLOAD WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CREATOR INITIATES UPLOAD                                                 │
│     ├── Select video file (validates format from admin settings)            │
│     ├── Enter episode details (title, description, season)                  │
│     └── Frontend validates: format, duration, file size                     │
│                                                                              │
│  2. CREATE VIDEO ON BUNNY.NET                                                │
│     POST /api/creator/upload/init                                            │
│     ├── Creates video entry in Bunny library                                 │
│     ├── Returns: bunny_video_id, upload_url                                  │
│     └── Stores metadata in MongoDB                                           │
│                                                                              │
│  3. CHUNKED UPLOAD TO CDN                                                    │
│     PUT {upload_url}                                                         │
│     ├── Direct upload to Bunny.net (bypasses our server)                    │
│     ├── Progress tracked in frontend                                         │
│     └── Large files uploaded in chunks                                       │
│                                                                              │
│  4. TRANSCODING (Automatic)                                                  │
│     ├── Bunny.net automatically transcodes to:                              │
│     │   ├── HLS playlist (adaptive bitrate)                                 │
│     │   ├── MP4 720p                                                        │
│     │   ├── MP4 480p                                                        │
│     │   └── MP4 360p                                                        │
│     └── Webhook notification when complete                                   │
│                                                                              │
│  5. PUBLISH EPISODE                                                          │
│     POST /api/creator/episodes/{id}/publish                                  │
│     ├── Admin settings applied (pricing, first-free, format)                │
│     ├── Episode marked as "published"                                        │
│     └── Appears in viewer catalog                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Upload Validation Rules (Admin-Controlled)

```python
# Fetched from: GET /api/creator/upload-settings
{
    "video": {
        "allowed_formats": ["vertical"],  # vertical, horizontal, square
        "max_duration_minutes": 60,
        "min_duration_seconds": 30,
        "max_file_size_mb": 500
    },
    "episode": {
        "default_price": 10,
        "min_price": 0,
        "max_price": 1000,
        "first_episode_free": true
    }
}
```

---

## Video Playback Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VIDEO PLAYBACK WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. USER CLICKS PLAY                                                         │
│     GET /api/episodes/{episode_id}                                           │
│     ├── Returns: video_url, hls_url, mp4_url, mp4_urls, embed_url           │
│     └── Returns: unlocked (true/false), is_free                              │
│                                                                              │
│  2. CHECK ACCESS                                                             │
│     ├── Free episode? → Play immediately                                     │
│     ├── Unlocked? → Play immediately                                         │
│     └── Locked? → Show purchase modal                                        │
│                                                                              │
│  3. INITIALIZE PLAYER (HLS.js)                                               │
│     ├── Try HLS playlist first (adaptive quality)                            │
│     └── If HLS fails → Fallback chain                                        │
│                                                                              │
│  4. FALLBACK CHAIN (Netflix/YouTube Style)                                   │
│     ┌──────────────────────────────────────────────────────────┐             │
│     │  HLS Fails?                                               │             │
│     │     ↓                                                     │             │
│     │  Try MP4 720p ─────→ Works? ─────→ PLAY                  │             │
│     │     ↓ Fails                                               │             │
│     │  Try MP4 480p ─────→ Works? ─────→ PLAY                  │             │
│     │     ↓ Fails                                               │             │
│     │  Try MP4 360p ─────→ Works? ─────→ PLAY                  │             │
│     │     ↓ Fails                                               │             │
│     │  Try Embed Player ─→ Works? ─────→ PLAY                  │             │
│     │     ↓ Fails                                               │             │
│     │  Show Error Message                                       │             │
│     └──────────────────────────────────────────────────────────┘             │
│                                                                              │
│  5. TRACK VIEW                                                               │
│     POST /api/streaming/track                                                │
│     ├── Records watch time                                                   │
│     ├── Updates analytics                                                    │
│     └── Credits creator earnings                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Admin Controls

### Platform Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `default_episode_price` | Base coin price for episodes | 10 |
| `first_episode_free` | Auto-free first episode of each series | true |
| `allowed_video_formats` | Vertical, horizontal, square | ["vertical"] |
| `max_video_duration` | Maximum upload duration | 60 min |
| `creator_revenue_share` | % of coins going to creator | 70% |

### Admin Dashboard Tabs

1. **Overview** - Platform analytics, revenue, user growth
2. **Users** - User management, creator approvals
3. **Content** - Series/episode approval, moderation
4. **Revenue** - Payment processing, payout management
5. **Creators** - Creator analytics, performance
6. **Ads Approval** - Review and approve advertisements
7. **Notifications** - Send targeted notifications, manage triggers
8. **A/B Testing** - Thumbnail testing, conversion optimization
9. **Platform Settings** - Video rules, pricing, features

---

## API Reference

### Creator APIs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CREATOR API ENDPOINTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SERIES MANAGEMENT                                                           │
│  ├── GET    /api/creator/series              - List creator's series        │
│  ├── POST   /api/creator/series              - Create new series            │
│  ├── GET    /api/creator/series/{id}         - Get series details           │
│  ├── PUT    /api/creator/series/{id}         - Update series                │
│  └── DELETE /api/creator/series/{id}         - Delete series                │
│                                                                              │
│  EPISODE MANAGEMENT                                                          │
│  ├── GET    /api/creator/series/{id}/episodes    - List episodes            │
│  ├── POST   /api/creator/episodes                - Create episode           │
│  ├── PUT    /api/creator/episodes/{id}           - Update episode           │
│  ├── POST   /api/creator/episodes/{id}/publish   - Publish episode          │
│  └── POST   /api/creator/episodes/reorder        - Reorder episodes         │
│                                                                              │
│  VIDEO UPLOAD                                                                │
│  ├── GET    /api/creator/upload-settings     - Get upload rules             │
│  ├── POST   /api/creator/upload/init         - Initialize upload            │
│  └── POST   /api/creator/upload/complete     - Mark upload complete         │
│                                                                              │
│  ANALYTICS                                                                   │
│  ├── GET    /api/creator/dashboard           - Dashboard stats              │
│  ├── GET    /api/creator/analytics           - Detailed analytics           │
│  └── GET    /api/creator/earnings            - Earnings breakdown           │
│                                                                              │
│  PAYOUTS                                                                     │
│  ├── GET    /api/payouts/history             - Payout history               │
│  ├── POST   /api/payouts/request             - Request payout               │
│  ├── GET    /api/payouts/auto/settings       - Auto-payout settings         │
│  └── PUT    /api/payouts/auto/settings       - Update auto-payout           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Video Playback APIs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PLAYBACK API ENDPOINTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  GET /api/episodes/{episode_id}                                              │
│  ├── Returns video URLs for playback                                         │
│  └── Response:                                                               │
│      {                                                                       │
│        "id": "ep-001",                                                       │
│        "title": "Episode 1",                                                 │
│        "bunny_video_id": "uuid-here",                                        │
│        "video_url": "https://vz-xxx.b-cdn.net/{id}/playlist.m3u8",          │
│        "hls_url": "https://vz-xxx.b-cdn.net/{id}/playlist.m3u8",            │
│        "mp4_url": "https://vz-xxx.b-cdn.net/{id}/play_720p.mp4",            │
│        "mp4_urls": {                                                         │
│          "720p": "https://vz-xxx.b-cdn.net/{id}/play_720p.mp4",             │
│          "480p": "https://vz-xxx.b-cdn.net/{id}/play_480p.mp4",             │
│          "360p": "https://vz-xxx.b-cdn.net/{id}/play_360p.mp4"              │
│        },                                                                    │
│        "embed_url": "https://iframe.mediadelivery.net/embed/...",           │
│        "unlocked": true,                                                     │
│        "is_free": true                                                       │
│      }                                                                       │
│                                                                              │
│  POST /api/streaming/track                                                   │
│  ├── Track view progress                                                     │
│  └── Body: { episode_id, watch_time, completed }                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Episodes Collection

```javascript
{
  "id": "series-1-ep1",
  "series_id": "series-1",
  "season": 1,
  "episode_number": 1,
  "episode_code": "S01E01",
  "title": "Pilot",
  "description": "First episode...",
  
  // Video Storage
  "bunny_video_id": "8eff1bf0-cdc1-4fac-a5e3-b0e75f1007e4",
  "video_url": "https://vz-xxx.b-cdn.net/.../playlist.m3u8",
  "thumbnail": "https://vz-xxx.b-cdn.net/.../thumbnail.jpg",
  "duration": 1320,  // seconds
  
  // Monetization
  "price": 10,
  "is_free": true,
  "is_exclusive": false,
  
  // Status
  "status": "published",  // draft, published, archived
  "created_at": "2026-02-20T10:00:00Z",
  "published_at": "2026-02-20T12:00:00Z",
  
  // Analytics
  "views": 15000,
  "likes": 450,
  "watch_time_total": 198000  // seconds
}
```

### Series Collection

```javascript
{
  "id": "series-1",
  "creator_id": "user-123",
  "title": "The Secret Heir",
  "description": "A billionaire discovers...",
  "genre": "Drama",
  "thumbnail": "https://...",
  "cover_image": "https://...",
  
  // Seasons
  "seasons": [
    { "number": 1, "title": "Season 1" },
    { "number": 2, "title": "The Return" }
  ],
  "total_episodes": 30,
  
  // Pricing
  "is_exclusive": false,
  "custom_episode_price": null,  // Override default if set
  
  // Status
  "status": "published",
  "is_featured": true,
  "created_at": "2026-01-15T08:00:00Z",
  
  // Analytics
  "total_views": 250000,
  "rating": 4.6,
  "subscribers": 12500
}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Video shows black screen | Codec not supported | Automatic MP4 fallback should work |
| 403 on embed player | Domain not configured | Uses MP4 fallback (no config needed) |
| Upload fails | File too large | Check admin max file size setting |
| HLS doesn't play | Safari/iOS quirks | MP4 fallback handles this |
| Slow video loading | CDN edge not cached | First play caches globally |

### Health Check Endpoints

```bash
# Check backend status
curl https://your-domain.com/api/health

# Check video URLs are accessible
curl -I "https://vz-xxx.b-cdn.net/{video_id}/play_720p.mp4"
# Should return: HTTP 200, access-control-allow-origin: *

# Check episode API
curl "https://your-domain.com/api/episodes/{episode_id}"
# Should return all video URL formats
```

---

## File Structure

```
/app/
├── backend/
│   ├── routes/
│   │   ├── series.py         # Series & episode APIs
│   │   ├── creator.py        # Creator portal APIs
│   │   ├── streaming.py      # Video streaming & tracking
│   │   ├── payouts.py        # Payout management
│   │   └── admin.py          # Admin controls
│   ├── services/
│   │   ├── bunny.py          # Bunny.net integration
│   │   └── payout_automation.py
│   └── server.py             # FastAPI application
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── VideoPlayerPage.jsx    # Video player with fallbacks
│       │   ├── CreatorPortal.jsx      # Creator dashboard
│       │   └── CreatorSeriesDetailPage.jsx
│       └── components/
│           └── creator/
│               ├── PayoutHistory.jsx  # Payouts & auto-payout
│               └── UploadModal.jsx    # Video upload UI
│
└── docs/
    └── CREATOR_VIDEO_ARCHITECTURE.md  # This document
```

---

*Last Updated: February 2026*
*Version: 1.0*
