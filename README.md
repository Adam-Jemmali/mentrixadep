# OTAMS - Online Tutoring and Management System

A full-stack Next.js 14 application for managing online tutoring sessions with role-based access control (Student, Tutor, Admin).

## Features

### Authentication & Authorization
- ✅ User registration with role selection (Student/Tutor)
- ✅ Admin approval required before login
- ✅ Role-based access control with middleware protection
- ✅ JWT metadata integration for user roles

### Admin Dashboard
- ✅ View and manage pending registration requests
- ✅ Approve/reject student and tutor registrations
- ✅ Access to all dashboards

### Student Dashboard
- ✅ View upcoming and past sessions
- ✅ Browse tutor availability by course
- ✅ Book 30-minute tutoring sessions
- ✅ Cancel sessions (only if >60 minutes before start)
- ✅ Rate completed sessions (only after session ends)

### Tutor Dashboard
- ✅ Create and manage 30-minute availability slots
- ✅ View upcoming and past sessions
- ✅ Approve/reject session requests
- ✅ Toggle auto-approve mode for session requests
- ✅ Cancel sessions
- ✅ Prevent double-booking automatically

### Session Lifecycle
- ✅ Student requests session
- ✅ Tutor approves OR auto-approves (if enabled)
- ✅ Session automatically created upon approval
- ✅ Sessions marked as completed after end_time
- ✅ Ratings unlocked only after session completion

### UI/UX
- ✅ Role-based navigation
- ✅ Loading states for all async operations
- ✅ Empty states for better UX
- ✅ Error boundaries for error handling
- ✅ Mobile-responsive design
- ✅ Dark mode support

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS
- **Deployment:** Ready for Vercel

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Get these values from your Supabase project settings.

### 4. Set Up Database

Run these SQL files in your Supabase SQL Editor (in order):

1. **`supabase-schema.sql`** - Creates all tables, constraints, and RLS policies
2. **`supabase-update-jwt-metadata.sql`** - Sets up JWT metadata updates
3. **`supabase-seed-admin.sql`** - Creates an admin user (update email/password)
4. **`supabase-session-lifecycle.sql`** - Sets up session lifecycle functions and triggers

### 5. Create Admin User

1. Update `supabase-seed-admin.sql` with your admin email
2. Run it in Supabase SQL Editor
3. Sign up with that email in the app (it will be auto-approved)

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. (Optional) Set Up Cron Job

To automatically mark sessions as completed, set up a cron job to call:

```
GET /api/cron/complete-sessions
```

You can use:
- **Vercel Cron Jobs** (if deploying to Vercel)
- **Supabase pg_cron** (if enabled in your project)
- **External cron service** (cron-job.org, etc.)

Recommended schedule: Every 5-10 minutes

## Project Structure

```
otams/
├── src/
│   ├── app/
│   │   ├── actions/          # Server actions
│   │   ├── admin/             # Admin dashboard
│   │   ├── auth/              # Authentication pages
│   │   ├── student/           # Student dashboard
│   │   ├── tutor/             # Tutor dashboard
│   │   └── api/               # API routes
│   ├── components/            # Reusable components
│   ├── lib/                   # Utilities and config
│   └── middleware.ts          # Route protection
├── supabase-*.sql             # Database setup scripts
└── README.md
```

## Security Features

- ✅ Row Level Security (RLS) on all tables
- ✅ Server-side validation for all operations
- ✅ No client-side trust - all business logic enforced server-side
- ✅ Role-based route protection
- ✅ Session cancellation time constraints
- ✅ Double-booking prevention
- ✅ Rating validation (only after completion)

## Database Constraints

- ✅ 30-minute session slots only
- ✅ No overlapping availability per tutor
- ✅ Students can cancel only if >60 min before start
- ✅ Sessions automatically completed after end_time
- ✅ Ratings only allowed for completed sessions

## Build for Production

```bash
npm run build
npm start
```

## Deployment

The app is ready to deploy to Vercel:

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## License

MIT
