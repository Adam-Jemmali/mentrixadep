<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mentrixa agent context

**PROMPT 001 (master context)** is always applied via `.cursor/rules/mentrixa-master-context.mdc`.

Before any feature work, internalize:

1. **Identity** — every screen answers what is true about me now vs yesterday vs someone real
2. **Mechanic** — Verified First Attempt on `(user_id, skill_node_id)`, server enforced
3. **Scope** — AP Calculus AB only in practice picker until second subject passes the bar
4. **AI** — item bank only for quest/duel/diagnostic; Gemini only for Studio session package from transcript
5. **Output** — verdict sentence + next action on every surface; gold `#D4A017` only on verified truth

Architecture: vertical slices in `src/features/`, thin shells in `src/app/`, Supabase + numbered migrations (append only).
