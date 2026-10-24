# 🌿 GIT_WORKFLOW.md — Agent Git & Version Control Guidelines
> Rules of engagement for AI agents committing code, creating branches, and shipping changes.
> Last Updated: 2026-10-21

---

## 1. Branch Strategy

| Branch | Purpose | Protection |
|---|---|---|
| `main` | Production branch, deployed automatically via Cloudflare Pages and Render. | Protected. All code must pass CI. |
| `feature/*` | Feature development (e.g., `feature/leitner-notebook`). | Deleted after merge. |
| `fix/*` | Hotfixes and bug corrections (e.g., `fix/katex-ltr-dir`). | Deleted after merge. |
| `docs/*` | Documentation updates (e.g., `docs/agent-context-files`). | Fast-tracked merges. |

---

## 2. Commit Message Standards

Conventional Commits format:
```
<type>(<scope>): <short description in Arabic or English>

[optional body]
```

### Allowed Types
- `feat`: New user-facing feature (e.g., `feat(gamification): add streak freeze powerup`)
- `fix`: Bug fix (e.g., `fix(audio): resolve autoplay audio context error`)
- `refactor`: Code restructuring with no behavior change
- `docs`: Documentation updates or agent context files
- `chore`: Dependency updates, tooling, configuration
- `test`: Adding or correcting tests

---

## 3. Agent Rules of Conduct Before Committing

1. **Verify No Broken Imports:** Run `npm run build` or typecheck in `frontend/` before pushing code.
2. **Never Commit Secrets:** `.env`, `.env.local`, API keys, Telegram session files, or service role keys must NEVER be staged.
3. **Database Migration Safety:** Never edit an existing migration file that has already been applied. Always create a new dated migration file in `supabase/migrations/` (e.g., `YYYYMMDD_feature_name.sql`).
4. **Preserve Comments:** Keep docstrings and architectural notes intact when making changes.
