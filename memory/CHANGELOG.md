# Kona Streaming Platform - Changelog

## [Feb 19, 2026]

### Added
- **Bulk Episode Editing** - Select multiple episodes and edit at once
  - "Bulk Edit" button toggles selection mode
  - Checkboxes replace drag handles when in selection mode
  - Green checkmarks for selected episodes
  - Bulk action bar with options:
    - Move to Season (dropdown with existing + new season option)
    - Make Free / Make Paid buttons
    - Set coin price input (1-50 coins)
  - "Select All" and "Cancel" buttons
  - Backend endpoint: `POST /api/creator/series/{id}/bulk-edit-episodes`

- **Drag & Drop Episode Reordering** - Reorganize episodes within and between seasons
  - Drag handle (grip icon) on each episode card
  - Visual feedback: lifted card effect during drag with floating DragOverlay
  - Reorder within same season or move to different season
  - Episode codes auto-update (S01E01, S01E02, etc.)
  - Backend endpoint: `POST /api/creator/series/{id}/reorder-episodes`
  - S01E01 automatically made free when episode moved to first position
  - Success toast notification after reorder

- **Upload Progress Panel** - Persistent indicator showing real-time upload status with thumbnail previews
  - Visible in bottom-right corner during uploads (outside modal)
  - Shows uploading/encoding/ready/failed status for each video
  - Thumbnail preview extracted from video file
  - Dismiss individual uploads or clear all when done

- **Season Management UI** - Modern accordion-style interface for organizing episodes
  - Collapsible season sections with expand/collapse functionality
  - Episodes automatically grouped by season number
  - Episode count and total views displayed per season
  - Quick "Add Episode" button per season
  - "Add New Season" button to create new seasons
  - Season Creator dialog with custom title input

- **Batch Upload Enhancements**
  - Season selector dropdown to choose which season to upload to
  - Option to create new season directly from upload modal
  - Video thumbnails auto-generated from first frame
  - Bunny.net CDN messaging for performance awareness

### Fixed
- **Creator Episode Upload Bug** - Episodes now upload correctly via batch upload feature
  - Added new endpoint `POST /api/creator/series/{series_id}/episodes` to match frontend expectations
  - Updated video upload endpoint to auto-initialize Bunny.net video placeholder if missing
  - Response structure includes `episode.id` for frontend compatibility
  - Full flow verified: series creation → episode creation → video upload to Bunny.net CDN

- **HTML Nesting Warning** - Fixed nested button elements in season accordion header

### Modified
- `/app/frontend/src/pages/CreatorSeriesDetailPage.jsx` - Complete rewrite with DndContext, SeasonAccordion, and UploadProgressPanel
- `/app/backend/routes/creator.py` - Added episode reorder endpoint and series-specific episode creation

### Dependencies Added
- `@dnd-kit/core@6.3.1` - Core drag and drop primitives
- `@dnd-kit/sortable@10.0.0` - Sortable preset for list reordering
- `@dnd-kit/utilities@3.2.2` - Utility functions for transforms

---

## [Feb 11, 2026]

### Added
- **Email Verification Gating for Gamification Features**
  - New `EmailVerificationGate` component (`/app/frontend/src/components/EmailVerificationGate.jsx`)
  - Soft prompt modal for unverified users trying to access locked features
  - Blurred overlay with "Verify Email to Unlock" message and "Verify Now" button
  - Verification modal with 6-digit code input
  - 5 bonus coins awarded on successful verification

### Modified
- **RewardsPage.jsx** - Wrapped gamification features with verification gates:
  - Gated: Mystery Box, Watch Streak, Streak Shield, Scratch Card, Prediction Games, Daily Challenges, Character Cards
  - Ungated: Daily Rewards, Spin Wheel, Referral

### Fixed
- **auth.py** - Fixed registration session bug: sessions weren't being created during registration, causing "Session expired" errors immediately after signup

---

## [Feb 10, 2026]

### Added
- Device/Session Management UI
- VIP Subscription Tiers with variable device limits
- KwikPay mock payment integration
- Subscription Management page
- Advanced geo-targeting for ad campaigns
- Breadcrumb and Video schema for SEO
- Global country support for registration

### UI/UX
- Typewriter animation for KONA splash screen
- Standardized KonaLoader across all pages
- Country picker modal with search

---

## [Feb 9, 2026]

### Added
- Email & Phone Verification System with Resend integration
- Live Campaign Performance Alerts
- Vertical video validation in Creator Portal
- Enhanced Advertiser Analytics Dashboard

---

## [Feb 8, 2026]

### Added
- Full-width cinematic hero banner
- Creators and Advertisers landing pages
- Demo accounts
- Phone/Email auth with OTP (mocked)
