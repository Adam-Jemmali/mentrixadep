# Coding agent session export — Mentrixa

**Context:** experimental prompt — attach a coding agent session you’re particularly proud of.  
**Tool:** Cursor (Composer agent) + repo tools (`grep`, `read`, `search`, `tsc`, file edits).  
**Stack:** Next.js App Router (canary), React, TypeScript, Supabase.

---

## Session A — Waitlist role: “Guide” was selecting “Mentrixer”

### Problem

Marketing CTAs sent users to `/auth/signup` (Mentrixer) vs `/auth/signup?role=tutor` (Guide). With the waitlist on, signup redirected to `/join` but **dropped the `role` query**. The join form always defaulted to **student**. Guides landed on the wrong waitlist choice.

### What the agent did

1. **Traced the full path:** `home-page-client.tsx` / hero → `auth/signup/page.tsx` → `join/page.tsx` → `waitlist-join-form.tsx`.
2. **Found the root cause:** waitlist redirect was `redirect("/join")` with no `role`; `WaitlistJoinForm` used `useState("student")` only.
3. **Implemented a clean fix:**
   - Signup page reads `role`, maps aliases (`tutor` / `guide`, `student` / `mentrixer`), redirects to `/join?role=…`.
   - Join page reads `role` from `searchParams`, passes `initialRole`.
   - Form accepts `initialRole` + `useEffect` to sync when URL-driven props change.
   - Shared **`waitlistRoleFromQuery`** in `src/lib/waitlist-role.ts` so the **server** join page never imports from a `"use client"` module (avoids Next/RSC boundary mistakes).

### Outcome

One coherent data path: CTA → signup → join with explicit role → correct waitlist segment. Typecheck clean.

**Why I’m proud of it:** Narrow scope, no drive-by refactors, and an explicit fix for a classic “query param lost on redirect” bug — plus catching the server/client import footgun early.

---

## Session B — Account delete crashed with “Minified React error #441”

### Problem

Deleting an account from profile (student + tutor) surfaced **React #441** in production — scary, opaque UI.

### What the agent did

1. **Didn’t guess from the screenshot alone.** Looked up React’s **error code dictionary** (`facebook/react` `codes.json`): **#441** is the _generic_ production wrapper for **Server Components render failures** (message intentionally vague), not necessarily a specific hook name.
2. **Reasoned about timing:** `deleteAccount()` removed the user and called `signOut()`, then the client did `window.location.assign(...)`. In the window before a full navigation, Next could **refetch RSC** for the current route; with the user gone, that render could throw → **#441**.
3. **Fix:**
   - End `deleteAccount` with **`redirect(getSiteUrl(), "replace")`** so the server action completes with a **hard navigation** off the broken tree.
   - Client `catch` blocks must **rethrow** Next’s redirect “error” (digest `NEXT_REDIRECT…`), not treat it as failure — small helper `isNextRedirectError` in `src/lib/is-next-redirect-error.ts`.

### Outcome

Delete path exits via server-driven redirect; student profile, tutor profile, and `/settings` all share the same action. `tsc --noEmit` clean.

**Why I’m proud of it:** Turning a misleading minified code into a **concrete systems hypothesis** (RSC refetch vs session/user deletion), then fixing it the way the framework expects (`redirect` from a server action + correct client handling).

---

## Skills this session shows

| Skill                | Example                                                          |
| -------------------- | ---------------------------------------------------------------- |
| End-to-end tracing   | URL → redirect → page → form state                               |
| Framework boundaries | Server vs `"use client"` imports, server actions + `redirect`    |
| Production debugging | Decoding minified React errors from source-of-truth `codes.json` |
| Minimal diffs        | Targeted files only; shared lib for one concept                  |

---

## Files touched (reference)

- `src/app/auth/signup/page.tsx` — preserve `role` on waitlist redirect
- `src/app/(app)/join/page.tsx` — read `role`, pass `initialRole`
- `src/components/waitlist-join-form.tsx` — `initialRole` + sync
- `src/lib/waitlist-role.ts` — shared role parsing
- `src/app/actions/settings.ts` — `redirect` after successful delete
- `src/lib/is-next-redirect-error.ts` — client rethrow helper
- `src/components/account-security-panel.tsx`, `src/app/(app)/settings/settings-client.tsx` — catch / rethrow

---

_Exported narrative from a real Cursor agent session on this repository; technical details condensed for readability._
