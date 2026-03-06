# AR Analysis Report — Calculations & Formulas

This document describes how every value on the **Insurance AR Analysis Report** is derived, including formulas and data sources.

---

## 1. Report data source

| Field | Source | Description |
|-------|--------|-------------|
| **PM Source Report File** | Session `IntakeFileName` | Name of the uploaded intake file (e.g. `AR_Intake_1Claim_Correct.xlsx`). |
| **Total Rows** | Session `TotalRowCount` | Number of data rows in the intake file after validation (set at upload). |

---

## 2. Analysis summary metrics

### 2.1 Total Claims Analyzed

**Display:** The large number in the first summary card (e.g. `1`).

**Formula / logic:**

- **Value used in report:** `TotalRowCount` from the session (same as **Total Rows**).
- **Meaning:** Number of intake rows validated and considered for the session. For the report UI this is shown as “Total Claims Analyzed” (one row can represent one claim or one line item; the pipeline groups by Client Claim ID for calculation).

**Formula (conceptual):**

```
Total Claims Analyzed = TotalRowCount
```

Where `TotalRowCount` is set when the intake file is uploaded/validated.

---

### 2.2 Total Underpayment

**Display:** Dollar amount in the second card (e.g. **$63**), typically in red.

**Formula / logic:**

- **Value:** Sum of **claim-level underpayment** over all in-scope claims that are MER-applicable or otherwise contribute underpayment.
- **Pipeline logic:**
  - For each **in-scope** claim group (by Client Claim ID):
    - If the plan is **MER-applicable** (Commercial OON, MVA, or WC):
      - **MER (Maximum Allowable Reimbursement)** is calculated per CPT line using:
        - Fee schedule (resolved by payer/plan category, state, zip, etc.)
        - CPT fee from fee schedule
        - Multi-procedure factor (1.0 for first line; 0.5 for secondary lines unless modifier 59)
        - PCTC factor (0.5 for P/T indicators, else 1.0)
        - Financial modifier factor (from system modifiers)
      - **Line-level underpayment** (conceptual):
        - Commercial OON: `Underpayment = Max(0, MER_OON − PaidAmount)` where `MER_OON = MER_Allowed × PlanResponsibilityFactor`
        - Other MER (e.g. MVA/WC): `Underpayment = Max(0, MER_Allowed − PaidAmount)`
      - **Claim underpayment** = aggregation of line underpayments (for OON, claim-level OON allowed minus total paid).
    - If the plan is **not** MER-applicable (e.g. Government / Commercial IN):
      - No-Pay/Denial logic may run; in the current pipeline, **claim underpayment is set to 0** for these.
  - **Total Underpayment** = sum of each claim’s underpayment.

**Formula (conceptual):**

```
Total Underpayment = Σ (per-claim underpayment)
```

Where:

- **Per-claim underpayment (Commercial OON):**  
  `Max(0, Claim_MER_OON − Σ Line PaidAmount)`
- **Per-claim underpayment (other MER, e.g. MVA/WC):**  
  `Max(0, Claim_MER_Allowed − Σ Line PaidAmount)`
- **MER values** come from fee schedule resolution and the 6-step MER calculation (fee schedule, modifiers, multi-procedure, PCTC, etc.).

---

### 2.3 Risk-Adjusted Recovery

**Display:** Dollar amount in the third summary card (e.g. **$63**), typically in green.

**Formula:**

- If the session has **Historical Collection Rate %** set and &gt; 0:

  ```
  Risk-Adjusted Recovery = Total Underpayment × (Historical Collection Rate % ÷ 100)
  ```

- Otherwise:

  ```
  Risk-Adjusted Recovery = Total Underpayment
  ```

So with no historical rate, Risk-Adjusted Recovery equals Total Underpayment. With a rate (e.g. 80%), it is the underpayment scaled by that percentage.

---

## 3. Claim Categorisation Breakdown

**Display:** “Claim Categorisation Breakdown” section (e.g. “No categorisation data” with “–”).

**Logic:**

- Currently the pipeline does **not** persist per-claim category to the report.
- The report shows **no categorisation data** when no breakdown is returned from the API (empty list).
- **Future:** If the backend adds category counts (e.g. Commercial OON, Government, MVA, WC), this section would list category name and count.

---

## 4. Underpayment Analysis by Priority

**Display:** Three buckets — **High**, **Mid**, **Low** — each with an amount (e.g. High **$63**, Mid **$0**, Low **$0**).

**Current report implementation:**

- The report API currently returns **fixed placeholder buckets**:
  - **High** = `Total Underpayment` (entire underpayment shown as High).
  - **Mid** = 0.
  - **Low** = 0.

So in the UI, the sum of the three buckets equals **Total Underpayment**.

**Intended business logic (priority tiers):**

- Priority is determined **per claim** by claim underpayment amount and configurable thresholds (e.g. doc 8.4, 8.5):
  - **Low:**  `claimUnderpayment < LowMidBound`  (e.g. &lt; $10,000)
  - **Mid:**  `LowMidBound ≤ claimUnderpayment ≤ MidHighBound`  (e.g. $10,000–$50,000)
  - **High:** `claimUnderpayment > MidHighBound`  (e.g. &gt; $50,000)
- Default thresholds: `LowMidBound = 10_000`, `MidHighBound = 50_000`.
- A full implementation would **aggregate** session underpayment by tier (sum of claim underpayments in each tier) and return those three amounts. Until then, the report shows all underpayment under High.

**Formula (when implemented per tier):**

```
Underpayment (High) = Σ claim underpayment for claims where tier = "High"
Underpayment (Mid)  = Σ claim underpayment for claims where tier = "Mid"
Underpayment (Low)  = Σ claim underpayment for claims where tier = "Low"

Total Underpayment = Underpayment (High) + Underpayment (Mid) + Underpayment (Low)
```

---

## 5. Recovery Projection Summary

**Display:** Two cards — **Maximum Potential Recovery (100%)** and **Risk-Adjusted Recovery**.

### 5.1 Maximum Potential Recovery (100%)

**Formula:**

```
Maximum Potential Recovery = Total Underpayment
```

So it is the full underpayment amount with no risk adjustment.

### 5.2 Risk-Adjusted Recovery

**Formula:** Same as **Section 2.3**:

- If **Historical Collection Rate %** is set and &gt; 0:

  ```
  Risk-Adjusted Recovery = Total Underpayment × (Historical Collection Rate % ÷ 100)
  ```

- Else:

  ```
  Risk-Adjusted Recovery = Total Underpayment
  ```

**Note:** The report may also show “Historical Collection Rate: X%” when that percentage is present (e.g. based on a 3-year rolling average).

---

## 6. Contingency Fee Application by Claim Age

**Display:** “Contingency Fee Application by Claim Age” section (e.g. “No contingency fee data” with “–”).

**Logic:**

- The pipeline does **not** currently populate contingency fee by claim age for the report.
- The API returns an empty list for this section, so the UI shows “No contingency fee data”.
- **Future:** If the backend adds age bands (e.g. 0–90 days, 91–180 days) and fee % or amount per band, this section would list band, fee %, and amount.

---

## 7. Summary of formulas (quick reference)

| Metric | Formula |
|--------|--------|
| **Total Claims Analyzed** | `TotalRowCount` (intake rows from session). |
| **Total Underpayment** | Sum of per-claim underpayment (MER-based or 0 for non-MER). |
| **Max Potential Recovery** | `Total Underpayment`. |
| **Risk-Adjusted Recovery** | `Total Underpayment × (HistoricalCollectionRatePct / 100)` if rate set; else `Total Underpayment`. |
| **Underpayment by Priority** | Currently: High = Total Underpayment, Mid = 0, Low = 0. Intended: sum by priority tier per claim. |

---

## 8. MER underpayment (per line, simplified)

For **Commercial OON** (conceptual):

- `MER_Allowed` = fee schedule amount × multi-procedure factor × PCTC factor × financial modifier factor.
- `MER_OON` = `MER_Allowed × PlanResponsibilityFactor`.
- `Underpayment_OON` = `Max(0, MER_OON − PaidAmount)` (at line or claim level as implemented).

For **MVA / WC** (conceptual):

- `Underpayment` = `Max(0, MER_Allowed − PaidAmount)` (with claim-level aggregation as implemented).

Exact aggregation (line vs claim) follows the backend implementation in `ArMerCalculationService` and `ArAnalysisPipelineService`.

---

*Document generated from codebase logic. Backend: EzRCM360_Backend_Latest (ArAnalysisPipelineService, ArMerCalculationService, ArPriorityTierService, ArAnalysisReportService).*
