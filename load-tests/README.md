# Load tests (k6)

Mentrixa runs on **Vercel Hobby + GitHub Actions free**. These scripts are tuned so
`workflow_dispatch` stays cheap, while full stress remains one env flip away.

## Profiles

| PROFILE | When | Arena | Symbolic |
|---------|------|-------|----------|
| `smoke` (default) | CI / weekly check | 8 VUs · 45s | 5 VUs · 30s |
| `full` | Manual staging capacity | 200 VUs · 5m · p95&lt;1s | 50 VUs · 3m · p95&lt;2s |

Smoke is enough to catch SSR and edge regressions that matter at ~1k users.
Full load against production on Hobby will throttle and burn quota — use staging.

## Scripts

- `smoke.js` — `/api/health`
- `arena-board.js` — `GET /arena` (+ optional Realtime)
- `symbolic-grader.js` — `POST …/functions/v1/grade-expression`
- `guest-diagnostic.js` — guest try start
- `track.js` / `landing.js` — marketing paths

## Index audit

Hot query plans live in `scripts/index-audit-hot-queries.sql`.
Apply `supabase/173-hot-path-indexes.sql`, then run that SQL in the Supabase editor.
Look for Seq Scan on tables that will exceed ~10k rows.

## Examples

```bash
# CI-equivalent
k6 run -e BASE_URL=https://mentrixa.one load-tests/arena-board.js

# Full arena stress (staging)
k6 run -e PROFILE=full -e BASE_URL=https://staging.example load-tests/arena-board.js

# Symbolic grader
k6 run -e SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL -e SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  load-tests/symbolic-grader.js
```
