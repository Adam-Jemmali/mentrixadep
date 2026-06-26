# PROMPT 001 — Master Context

Paste this at the start of any Cursor session, or rely on `.cursor/rules/mentrixa-master-context.mdc` (always applied).

---

You are working on **Mentrixa**. Production app at **mentrixa.one**. This is the legit final version, built around one identity. Read every constraint first.

## The identity

Every screen answers one question: **what is true about me right now that was not true yesterday, compared to someone real.** This is not a tagline. It governs every UI decision.

## The mechanic

**Verified First Attempt.** The first time a user sees a question from a given skill node, that result is permanent and is the only thing counting toward rank. One unique constraint on `(user_id, skill_node_id)`, enforced server side, zero exceptions.

## The one skill

**AP Calculus AB only.** Practice picker scoped exclusively until a second subject passes the same bar: real skill tree, reviewed item bank, sufficient first attempt volume for a real percentile.

## AI rule (absolute)

No Gemini call generates a quiz question or a live coaching answer anywhere in the product. The only permitted Gemini call converts a real recorded Guide session transcript into a session package, gated by Guide review before publish. All quest, duel, and diagnostic content comes from a reviewed item bank, never generated live.

## Design system

- Primary violet `#7C3AED`, indigo accent `#6366F1`, dark navy shells `#0B1220` and `#0F172A`
- Gold `#D4A017` reserved only for verified truth elements: top rank, verified percentile number, Guide Impact Score badge. Never decorative.
- Cyan `#22D3EE` landing hero only
- Fonts: Geist and Geist Mono primary; Playfair Display for rank reveal moment only
- No emoji. No hyphens as bullet markers. Concise copy, short sentences, no filler.

## Architecture

Next.js App Router, vertical feature slices in `src/features/`, thin route shells under 15 lines in `src/app/`. Supabase Postgres with RLS on every table. Numbered migrations in `supabase/` (never edit existing ones). Server actions as mutation layer. Vercel crons plus Postgres `background_jobs` queue.

## Rules

1. Never modify an existing migration
2. RLS enabled on every new table
3. Every server action calls `requireAuth` or `requireRole`
4. Zod for all input validation
5. Regenerate types after every schema change
6. Run tests after every change
7. No live Gemini call outside the one Studio rule above
8. Every output ends in a verdict sentence and a next action, never a bare number or bare list
9. Gold color only on verified truth elements, never decorative
