# EzRCM360 Frontend — Claude Code Context

> This file is git-tracked so Claude Code has full context on any machine.
> Keep it up to date when architecture or conventions change.

---

## Global Rules (apply to ALL projects, ALL machines)

### Pre-Commit Recheck (MANDATORY)
Before EVERY git commit, re-read ALL changed files and verify:
- All existing API calls are identical to before (no accidental removal/alteration)
- All existing methods, computed properties, watchers, event handlers are still present
- Property/method names match what the framework template expects
- All imports and component registrations are intact
- ONLY the explicitly requested changes are present — no accidental scope creep

### Standard Date Format
All projects use **MMM DD, YYYY** as default date format (e.g. "Mar 30, 2026").
For date-time: **MMM DD, YYYY - h:mm A** (e.g. "Mar 30, 2026 - 3:10 PM").

---

## Memory System (Git-Tracked)

**Memory files live in `.claude/memory/` in this repo — NOT in the local `~/.claude/projects/` folder.**

### At the start of every session:
1. Read `.claude/MEMORY.md` (index)
2. Load relevant topic files from `.claude/memory/`

### When saving new memories:
1. Write the memory file to `.claude/memory/<type>_<topic>.md` (with frontmatter)
2. Update `.claude/MEMORY.md` with a pointer to it
3. Commit and push:
   ```bash
   git add .claude/ && git commit -m "Update Claude memory: <topic>" && git push origin main
   ```

This keeps memory in sync across all machines via git.

---

## Git Workflow (MANDATORY)

**Always pull from remote before making any changes:**
```bash
git pull origin main
```
Apply to every session — code edits, new components, service updates, etc.

---

## Stack

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- Font: `font-['Aileron']` used throughout
- Component library: shadcn/ui conventions

---

## Key File Paths

| Area | Path |
|------|------|
| AR Analysis service types | `lib/services/insuranceArAnalysis.ts` |
| AR Analysis report page | `app/rcm/insurance-ar-analysis/[sessionId]/report/page.tsx` |
| AR Analysis session list/upload | `app/rcm/insurance-ar-analysis/` |
| Claude Memory Index | `.claude/MEMORY.md` |
| Claude Memory Files | `.claude/memory/` |

---

## AR Analysis Report Page

Route: `/rcm/insurance-ar-analysis/[sessionId]/report`

The report page fetches from the backend `GET api/RcmIntelligence/InsuranceArAnalysis/{sessionId}/report` and renders:

1. **Analysis Summary** — session metadata (practice name, uploaded by, source files, etc.)
2. **Key Metrics** — total claims analyzed, total underpayment, risk-adjusted recovery
3. **Claim Categorization Breakdown** — 3 layers (see below)
4. **Underpayment by Priority** — High / Mid / Low
5. **Recovery Projection Summary** — max potential, risk-adjusted, historical rate
6. **Contingency Fee by Claim Age** — age bands with fee % and amount

### Claim Categorization — 3-Layer Display

The `claimCategorisationBreakdown` array contains items with `{ category, count, layer }`.
The report renders 3 labeled sub-sections:

```tsx
{ layer: 1, title: "Layer 1 — Payer Entity Type" }
{ layer: 2, title: "Layer 2 — Plan Category (Insurance Only)" }
{ layer: 3, title: "Layer 3 — Commercial Sub-Categorization" }
```

Filter by `x.layer === layer` for each section. Skip empty sections (`if (!items.length) return null`).

---

## Service Types (`lib/services/insuranceArAnalysis.ts`)

Key interfaces:

```typescript
export interface ClaimCategoryBreakdownDto {
  category: string;
  count: number;
  layer: number;          // 1 = Payer Entity Type, 2 = Plan Category, 3 = Commercial OON/IN
}

export interface ArAnalysisReportDto {
  analysisSummary: ArAnalysisSummaryDto;
  totalClaimsAnalyzed: number;
  totalUnderpayment: number;
  riskAdjustedRecovery: number;
  claimCategorisationBreakdown: ClaimCategoryBreakdownDto[];
  underpaymentByPriority: UnderpaymentByPriorityDto[];
  recoveryProjectionSummary: RecoveryProjectionSummaryDto;
  contingencyFeeByClaimAge: ContingencyFeeByAgeDto[];
}
```

---

## API Response Envelope

All backend responses are wrapped:
```json
{ "success": true, "message": null, "data": <body> }
```
Always unwrap via `.data` when consuming API responses.

---

## Styling Conventions

- Font: `font-['Aileron']` for all text
- Section labels / sub-headers: `text-[12px] font-['Aileron'] font-semibold text-muted-foreground uppercase tracking-wide`
- Use `text-muted-foreground` for secondary labels
- Grid layouts: `grid grid-cols-2 gap-x-8 gap-y-2` for category/metric lists
