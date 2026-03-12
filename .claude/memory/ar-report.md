---
name: ar-report
description: AR Analysis report page structure, 3-layer claim categorization display, service interface types, styling conventions
type: project
---

# EzRCM360 Frontend — AR Analysis Report

## Route
`/rcm/insurance-ar-analysis/[sessionId]/report`
→ `app/rcm/insurance-ar-analysis/[sessionId]/report/page.tsx`

## Backend API
`GET api/RcmIntelligence/InsuranceArAnalysis/{sessionId}/report`
Response unwrapped from envelope: `response.data`

## Report Sections (in order)
1. **Analysis Summary** — session metadata (practice name, uploaded by, source files, total rows)
2. **Key Metrics** — total claims analyzed, total underpayment, risk-adjusted recovery
3. **Claim Categorization Breakdown** — 3 layers (see below)
4. **Underpayment by Priority** — High / Mid / Low
5. **Recovery Projection Summary** — max potential, risk-adjusted, historical rate
6. **Contingency Fee by Claim Age** — age bands with fee % and amount

## Claim Categorization — 3-Layer Display
`claimCategorisationBreakdown` items have `{ category, count, layer }`.
Render 3 labeled sub-sections, skip empty ones:

```tsx
{[
  { layer: 1, title: "Layer 1 — Payer Entity Type" },
  { layer: 2, title: "Layer 2 — Plan Category (Insurance Only)" },
  { layer: 3, title: "Layer 3 — Commercial Sub-Categorization" },
].map(({ layer, title }) => {
  const items = report.claimCategorisationBreakdown.filter((x) => x.layer === layer);
  if (!items.length) return null;
  return (
    <div key={layer}>
      <p className="text-[12px] font-['Aileron'] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        {items.map((item, i) => (...))}
      </div>
    </div>
  );
})}
```

## Key Service Types (`lib/services/insuranceArAnalysis.ts`)

```typescript
export interface ClaimCategoryBreakdownDto {
  category: string;
  count: number;
  layer: number;  // 1 = Payer Entity Type, 2 = Plan Category, 3 = Commercial OON/IN
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

## Styling Conventions
- Font: `font-['Aileron']` for all text
- Section sub-labels: `text-[12px] font-['Aileron'] font-semibold text-muted-foreground uppercase tracking-wide`
- Grid for metric/category lists: `grid grid-cols-2 gap-x-8 gap-y-2`
- Secondary text: `text-muted-foreground`
