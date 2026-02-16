# Kona - API Documentation

## Overview

This document provides comprehensive API documentation for the Kona streaming platform. All APIs are RESTful and return JSON responses.

---

## Base URL

```
Production: https://api.kona.app/api
Staging: https://staging-api.kona.app/api
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## Authentication APIs

### POST /auth/register
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "referral_code": "ABC12345"  // optional
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "coins": 50,
    "referral_code": "XYZ98765"
  }
}
```

### POST /auth/login
Authenticate existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "coins": 150
  }
}
```

### GET /auth/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "coins": 150,
  "referral_code": "XYZ98765",
  "referral_count": 5,
  "subscription": {
    "plan": "premium",
    "expires_at": "2026-02-15T00:00:00Z"
  }
}
```

---

## Series APIs

### GET /series
List all series with pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Items per page |
| genre | string | null | Filter by genre |
| featured | bool | null | Show featured only |

**Response (200):**
```json
[
  {
    "id": "series-1",
    "title": "Love in the City",
    "description": "A romantic drama...",
    "genre": "Romance",
    "thumbnail": "https://cdn.kona.app/series/1/thumb.jpg",
    "total_episodes": 12,
    "featured": true,
    "rating": 4.5,
    "views": 125000
  }
]
```

### GET /series/{series_id}
Get series details with episodes.

**Response (200):**
```json
{
  "id": "series-1",
  "title": "Love in the City",
  "description": "A romantic drama set in Nairobi...",
  "genre": "Romance",
  "thumbnail": "https://cdn.kona.app/series/1/thumb.jpg",
  "banner": "https://cdn.kona.app/series/1/banner.jpg",
  "total_episodes": 12,
  "rating": 4.5,
  "episodes": [
    {
      "id": "ep-1",
      "number": 1,
      "title": "First Meeting",
      "duration": "8:30",
      "coins_required": 0,
      "is_free": true,
      "thumbnail": "https://cdn.kona.app/episodes/1/thumb.jpg"
    },
    {
      "id": "ep-2",
      "number": 2,
      "title": "The Coffee Date",
      "duration": "9:15",
      "coins_required": 5,
      "is_free": false,
      "thumbnail": "https://cdn.kona.app/episodes/2/thumb.jpg"
    }
  ]
}
```

### GET /episodes/{episode_id}
Get episode details and video URL.

**Headers:** `Authorization: Bearer <token>` (optional)

**Response (200):**
```json
{
  "id": "ep-2",
  "series_id": "series-1",
  "number": 2,
  "title": "The Coffee Date",
  "description": "Sarah and James meet for coffee...",
  "duration": "9:15",
  "coins_required": 5,
  "is_free": false,
  "is_unlocked": true,
  "video_url": "https://cdn.kona.app/videos/ep-2/playlist.m3u8",
  "qualities": ["480p", "720p", "1080p"]
}
```

---

## Payment APIs

### GET /coins/packages
Get available coin packages.

**Response (200):**
```json
[
  {
    "id": "pack-100",
    "coins": 100,
    "price": 0.99,
    "currency": "USD",
    "bonus_coins": 0
  },
  {
    "id": "pack-600",
    "coins": 600,
    "price": 4.99,
    "currency": "USD",
    "bonus_coins": 50
  }
]
```

### POST /payments/stripe/create-intent
Create Stripe payment intent.

**Request Body:**
```json
{
  "package_id": "pack-600"
}
```

**Response (200):**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "amount": 499,
  "currency": "usd"
}
```

### POST /payments/mpesa/initiate
Initiate M-Pesa STK Push.

**Request Body:**
```json
{
  "package_id": "pack-600",
  "phone_number": "+254712345678"
}
```

**Response (200):**
```json
{
  "checkout_request_id": "ws_CO_xxx",
  "merchant_request_id": "xxx",
  "response_description": "Success. Request accepted for processing"
}
```

### POST /episodes/unlock
Unlock an episode with coins.

**Request Body:**
```json
{
  "episode_id": "ep-2"
}
```

**Response (200):**
```json
{
  "success": true,
  "coins_spent": 5,
  "remaining_coins": 145,
  "episode_id": "ep-2"
}
```

---

## User APIs

### GET /user/my-list
Get user's saved series.

**Response (200):**
```json
[
  {
    "id": "series-1",
    "title": "Love in the City",
    "thumbnail": "https://cdn.kona.app/series/1/thumb.jpg",
    "added_at": "2026-01-15T10:30:00Z"
  }
]
```

### POST /user/my-list/add
Add series to My List.

**Request Body:**
```json
{
  "series_id": "series-1"
}
```

### POST /user/my-list/remove
Remove series from My List.

**Request Body:**
```json
{
  "series_id": "series-1"
}
```

### GET /user/watch-history
Get watch history with progress.

**Response (200):**
```json
[
  {
    "episode_id": "ep-2",
    "series_id": "series-1",
    "series_title": "Love in the City",
    "episode_title": "The Coffee Date",
    "progress": 65,
    "watched_at": "2026-01-20T15:45:00Z"
  }
]
```

### POST /episodes/progress
Save episode watch progress.

**Request Body:**
```json
{
  "episode_id": "ep-2",
  "progress": 75
}
```

---

## Rewards APIs

### GET /rewards/status
Get daily reward status.

**Response (200):**
```json
{
  "can_claim": true,
  "hours_until_next": 0,
  "reward_amount": 10,
  "watch_requirement_met": true,
  "episodes_watched_today": 2
}
```

### POST /rewards/claim
Claim daily reward.

**Response (200):**
```json
{
  "message": "Claimed 10 coins!",
  "coins": 160
}
```

### GET /spin/status
Get spin wheel status.

**Response (200):**
```json
{
  "can_spin": true,
  "spins_remaining": 2,
  "max_spins": 3
}
```

### POST /spin
Execute spin.

**Response (200):**
```json
{
  "prize": 25,
  "spins_remaining": 1
}
```

---

## Referral APIs

### GET /referral/stats
Get referral statistics.

**Response (200):**
```json
{
  "referral_code": "XYZ98765",
  "total_referrals": 12,
  "coins_earned": 240,
  "milestones": [
    {"name": "Bronze", "required": 5, "reward": 100, "claimed": true},
    {"name": "Silver", "required": 10, "reward": 250, "claimed": true},
    {"name": "Gold", "required": 25, "reward": 500, "claimed": false}
  ]
}
```

### POST /referral/claim-milestone
Claim milestone reward.

**Request Body:**
```json
{
  "milestone": "Silver"
}
```

---

## Watch Party APIs

### POST /watch-party/create
Create a watch party.

**Request Body:**
```json
{
  "episode_id": "ep-2"
}
```

**Response (201):**
```json
{
  "party_code": "ABCD1234",
  "host_id": "user-uuid",
  "episode_id": "ep-2",
  "status": "waiting"
}
```

### POST /watch-party/join
Join a watch party.

**Request Body:**
```json
{
  "party_code": "ABCD1234"
}
```

### POST /watch-party/{party_code}/sync
Sync playback (host only).

**Query Parameters:**
- `action`: play, pause, seek
- `timestamp`: current video time in seconds

---

## Error Responses

All error responses follow this format:

```json
{
  "detail": "Error message description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |

---

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 10/minute |
| General API | 100/minute |
| Payments | 5/minute |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1643723400
```

---

## Webhooks

### Payment Webhook
```
POST /webhooks/stripe
POST /webhooks/mpesa
```

**Stripe Event Types:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

**M-Pesa Callback:**
```json
{
  "ResultCode": 0,
  "ResultDesc": "The service request is processed successfully",
  "CheckoutRequestID": "ws_CO_xxx"
}
```

---

## SDKs & Libraries

- **JavaScript:** `npm install @kona/sdk`
- **Python:** `pip install kona-sdk`
- **React Native:** `npm install @kona/react-native`

---

*API Version: 2.0*
*Last Updated: January 2026*
