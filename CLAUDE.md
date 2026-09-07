# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
```

## Environment

Copy `.env` variables needed locally:
- `MONGODB_URI` — MongoDB Atlas connection string
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox GL API key
- `CLOUDINARY_*` / `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — Image CDN
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `RESEND_TO_EMAIL` — Transactional email
- `JWT_SECRET` — Legacy JWT signing (NextAuth also uses this)
- `NEXTAUTH_SECRET` — Required for NextAuth in production
- `NEXT_PUBLIC_BASE_URL` — Base URL for absolute links

## Architecture

**Stack:** Next.js App Router + React 19 + Tailwind CSS v4 + Radix UI + MongoDB/Mongoose + NextAuth

### Routing & Pages

All pages live under `src/app/` using file-based App Router conventions. API routes are in `src/app/api/`. Client components are marked with `"use client"` — most page-level components are client components due to auth state and interactivity.

Key route groups:
- Auth: `/login`, `/signup`, `/forgot-password`, `/reset-password`
- Content: `/gallery`, `/articles`, `/mushroom` (explore & submit)
- Community: `/programs`, `/join-us`, `/contact`, `/donate`
- User: `/dashboard`, `/account`
- Admin: `/admin` (dashboard, import, user management)

### Authentication

Two-layer auth system:
1. **NextAuth** (`src/lib/auth.js`) — primary session management with Credentials and Google OAuth providers. Session includes user role, points, and profile data.
2. **AuthContext** (`src/context/AuthContext.jsx`) — wraps the app in `src/app/layout.js`, exposes `login()`, `logout()`, `updateUser()`, `isAuthenticated()`, `isWriterOrAdmin()`. Most components consume this context instead of calling NextAuth directly.

Roles: `user`, `writer`, `admin`. Role checks happen both in API routes (middleware-style) and client components.

### Database

MongoDB via Mongoose. Connection helper at `src/lib/mongodb.js` uses global caching in development and fresh connections in production (serverless-safe).

Models in `src/models/`:
- `User` — auth, roles, points, ban status
- `Mushroom` — crowdsourced fungal discoveries with coordinates
- `Gallery` — photo uploads with Cloudinary metadata
- `Article` — blog/educational content
- `Trail` — guided walks with waypoints
- `Zone` — geographic areas
- `JoinUsApplication` — volunteer/membership requests
- `PointLog` — gamification activity log
- `ApprovalLog` — content moderation audit

### Media Uploads

Images go to Cloudinary via `src/lib/cloudinary.js` and `src/lib/uploadToCloudinary.js`. Upload API routes handle multipart form data. The `next.config.mjs` whitelists Cloudinary's CDN domain for `next/image`.

### Maps & Location

Mapbox GL JS (`mapbox-gl`) renders interactive maps. EXIF metadata is extracted from uploaded photos (`exifr`) to auto-populate GPS coordinates on mushroom submissions. Geocoding utilities are in `src/lib/geocoding.js`.

### UI Components

`src/components/ui/` contains thin wrappers around Radix UI primitives (button, dialog, dropdown, form, input, etc.) styled with Tailwind and composed via `clsx` + `class-variance-authority`. Feature components live directly in `src/components/`.

Path alias `@/*` maps to `src/*` — use `@/components/...`, `@/lib/...`, etc.
