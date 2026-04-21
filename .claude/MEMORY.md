# EzRCM360 Frontend — Claude Code Memory

## Policies (org-wide)
- [memory/token_efficiency.md](memory/token_efficiency.md) — **ways to reduce token usage: surgical Reads, grep head_limit, sed for mass edits, subagents for exploration, /compact after PR merges, /clear between unrelated tasks, fast mode for mechanical work, terse responses, self-audit checklist. Never at cost of correctness.**

## Quick Reference
- **Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Font:** `font-['Aileron']` throughout
- **API envelope:** all responses wrapped `{ success, message, data }` — always unwrap via `.data`

## Topic Memory Files
- [memory/feedback_git_workflow.md](memory/feedback_git_workflow.md) — **always `git pull origin main` before any changes**
- [memory/ar-report.md](memory/ar-report.md) — AR Analysis report page, 3-layer categorization, service types

## Key Paths
- AR Analysis service types: `lib/services/insuranceArAnalysis.ts`
- AR Analysis report page: `app/rcm/insurance-ar-analysis/[sessionId]/report/page.tsx`
- AR Analysis session list/upload: `app/rcm/insurance-ar-analysis/`
