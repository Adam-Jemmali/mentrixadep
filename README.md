# Mentrixa — Online Tutoring & Management System

A full-stack Next.js application for managing online tutoring sessions with role-based access control, WebRTC video calling, and session recording.

## Features

### Authentication & Authorization
- User registration with role selection (Student / Tutor)
- Admin approval workflow before login is allowed
- JWT-based role metadata for fast middleware checks
- Row Level Security (RLS) on every table

### Admin Dashboard
- Approve / reject registrations
- View all users and system state

### Student Dashboard
- Browse tutor availability by course
- Book 30-minute sessions (auto-approve or manual)
- Cancel sessions (only > 60 min before start)
- Rate completed sessions (1–5 stars + comment)

### Tutor Dashboard
- Create / delete 30-minute availability slots
- Approve / reject session requests (or toggle auto-approve)
- View upcoming and past sessions
- Cancel sessions

### Video Calling
- WebRTC peer-to-peer video & audio
- Supabase Realtime signaling (no third-party APIs)
- Automatic room creation with time-window enforcement
- Session recording (tutor only, saved to Supabase Storage)

### UI / UX
- Dark-mode design with glassmorphism
- Framer Motion animations
- Role-based navigation
- Responsive mobile layout
- Loading / empty / error states

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT metadata |
| Realtime | Supabase Realtime (signaling) |
| Storage | Supabase Storage (recordings) |
| Styling | Tailwind CSS + Framer Motion |
| Video | WebRTC + MediaRecorder API |

## Project Structure

```
mentrixa/
├── src/
│   ├── app/
│   │   ├── actions/           # Server actions (admin, auth, recordings, sessions, student, tutor, video)
│   │   ├── admin/             # Admin dashboard + registration actions
│   │   ├── api/cron/          # Cron endpoint (auto-complete sessions)
│   │   ├── auth/              # Sign in, sign up, OAuth callback
│   │   ├── dashboard/         # Shared dashboard page
│   │   ├── pending-approval/  # Waiting screen for unapproved users
│   │   ├── student/           # Student dashboard pages
│   │   ├── tutor/             # Tutor dashboard pages
│   │   ├── video/             # Video call page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css        # Global styles + theme
│   ├── components/
│   │   ├── landing/           # Landing page sections (Header, Hero, HowItWorks, etc.)
│   │   ├── ui/                # Primitives (Button, Card, Input, Label, Tabs)
│   │   ├── video-call.tsx     # WebRTC video call + recording component
│   │   ├── join-video-call-button.tsx
│   │   ├── navigation.tsx     # Authenticated nav bar
│   │   ├── error-boundary.tsx
│   │   ├── loading.tsx
│   │   └── empty-state.tsx
│   ├── lib/
│   │   ├── supabase/          # Supabase clients (client, server, admin)
│   │   ├── auth.ts            # getCurrentUser, requireAuth, requireRole
│   │   ├── cache.ts           # Simple in-memory cache (availability data)
│   │   ├── database.types.ts  # TypeScript interfaces for all tables
│   │   ├── env.ts             # Type-safe env variable access
│   │   ├── security.ts        # Validation, sanitization, rate limiting, headers
│   │   ├── time-format.ts     # Date/time formatting helpers
│   │   ├── utils.ts           # cn() utility (clsx + tailwind-merge)
│   │   └── webrtc.ts          # WebRTC config, peer connection, media helpers
│   └── middleware.ts          # Auth redirects, role gating, security headers
├── supabase/
│   ├── 001-schema.sql         # Complete schema, RLS, triggers, indexes
│   └── 002-seed-admin.sql     # Seed admin user after auth signup
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
CRON_SECRET=<generate-a-random-32-char-string>
```

### 3. Run SQL migrations

In the Supabase SQL Editor, run in order:

1. `supabase/001-schema.sql` — tables, functions, triggers, RLS, indexes
2. `supabase/002-seed-admin.sql` — create admin user (update UUID first)
3. `supabase/003-quest-tables.sql` — quest and XP tables
4. `supabase/004-autopilot-tables.sql` — AI session packages
5. `supabase/005-divisions-tables.sql` — divisions and course mapping
6. `supabase/006-sessions-price.sql` — session pricing
7. `supabase/007-auto-approve-registrations.sql` — system settings and auto-approve

### 4. Create Supabase Storage bucket

Create a bucket named `video-recordings` in Supabase Storage for session recordings.

### 5. Run the dev server

```bash
npm run dev
```

### 6. (Optional) Cron job

Add `CRON_SECRET` to `.env.local` (required if you use the cron endpoint). Generate a random value, e.g. `openssl rand -hex 16`. Auto-complete past sessions by calling:

```
GET /api/cron/complete-sessions
Authorization: Bearer <CRON_SECRET>
```

### 7. Multi-account development (separate sessions per tab)

To sign in with different accounts (student, tutor, admin) in different tabs on the same machine, use subdomains. Each subdomain has isolated cookies:

| Tab | URL | Use for |
|-----|-----|---------|
| 1 | `http://student.localhost:3000` | Student account |
| 2 | `http://tutor.localhost:3000` | Tutor account |
| 3 | `http://admin.localhost:3000` | Admin account |

**Setup:** In Supabase Dashboard → Authentication → URL Configuration → Redirect URLs, add:

```
http://localhost:3000/auth/callback
http://student.localhost:3000/auth/callback
http://tutor.localhost:3000/auth/callback
http://admin.localhost:3000/auth/callback
```

Then open each URL in a separate tab and sign in with the desired account. Sessions stay separate because cookies are scoped per hostname.

## Build & Deploy

```bash
npm run build
npm start
```

Ready for Vercel — add env variables and deploy.

For production go-live steps, use `PRELAUNCH.md`.
