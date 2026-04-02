/**
 * RCM Intelligence — Insurance AR Analysis API
 * Base route: api/RcmIntelligence/InsuranceArAnalysis
 */

import { apiRequest, getApiUrl } from "@/lib/api";
import { AUTH_TOKEN_KEY } from "@/lib/env";
import type { PaginatedList } from "@/lib/types";

const BASE = "/api/RcmIntelligence/InsuranceArAnalysis";

/** Parse API error body (RFC 9110 problem details, or Ardalis ValidationError[]) for user-facing message. */
function getErrorMessageFromResponse(text: string, fallback: string): string {
  try {
    const j = JSON.parse(text) as
      | { detail?: string; message?: string; title?: string }
      | Array<{ ErrorMessage?: string; errorMessage?: string }>;
    if (Array.isArray(j) && j.length > 0) {
      const first = j[0];
      return first.ErrorMessage ?? first.errorMessage ?? fallback;
    }
    const obj = j as { detail?: string; message?: string; title?: string };
    return obj.detail ?? obj.message ?? obj.title ?? (text && text.trim() ? text : fallback);
  } catch {
    return text && text.trim() ? text : fallback;
  }
}

export type ArSourceType = "ExcelIntake";
export type ArIntakeValidationScope = "Columns" | "Rows" | "Full";
export type ArAnalysisSessionStatus =
  | "Draft"
  | "IntakeUploaded"
  | "ValidationInProgress"
  | "ValidationCompleted"
  | "ValidationFailed"
  | "PmUploaded"
  | "Processing"
  | "ConflictResolution"
  | "EnrichmentPending"
  | "EnrichmentCompleted"
  | "Completed"
  | "Failed";

export interface ArAnalysisSessionListItemDto {
  id: string;
  sessionName: string;
  practiceName: string;
  uploadedBy: string;
  uploadedAt: string;
  sourceType: string;
  sessionStatus: ArAnalysisSessionStatus;
}

export interface ArValidationError {
  rowIndex: number | null;
  columnName: string;
  message: string;
  invalidValue?: string | null;
}

export interface ArIntakeValidationResult {
  success: boolean;
  totalRows: number;
  columnValidatedCount: number;
  columnErrors: ArValidationError[];
  rowValidatedCount: number;
  rowErrors: ArValidationError[];
  rowsAnalyzed?: number | null;
  rowsFlagged?: number | null;
  rowsCorrected?: number | null;
  rowsFinalized?: number | null;
}

export interface CreateArAnalysisSessionResult {
  sessionId: string;
  validationResult?: ArIntakeValidationResult | null;
}

export interface ArAnalysisSessionDetailDto {
  id: string;
  sessionName: string;
  practiceName: string;
  uploadedBy?: string | null;
  uploadedAt: string;
  sourceType: string;
  intakeTemplateFile?: string | null;
  pmSourceReportFiles: string[];
  totalRows?: number | null;
  sessionStatus: ArAnalysisSessionStatus;
  currentStage?: string | null;
  columnValidatedCount?: number | null;
  columnErrorCount?: number | null;
  rowValidatedCount?: number | null;
  rowErrorCount?: number | null;
  claimsPassedCount?: number | null;
  conflictsDetectedCount?: number | null;
  payerValidationStatus?: string | null;
  planValidationStatus?: string | null;
  providerParticipationValidationStatus?: string | null;
  facilityParticipationValidationStatus?: string | null;
  categorizationStatus?: string | null;
  valueCalculationStatus?: string | null;
  underpaymentStatus?: string | null;
  recoveryCalculationStatus?: string | null;
}

export interface ArAnalysisProcessingStatusStep {
  name: string;
  status: string;
  message?: string | null;
  count?: number | null;
}

export interface ArAnalysisProcessingStatusDto {
  steps: ArAnalysisProcessingStatusStep[];
  sessionStatus: string;
  currentStage?: string | null;
  overallMessage: string;
  currentStepName?: string | null;
  nextStepName?: string | null;
  currentStepIndex?: number | null;
  totalStepCount: number;
}

export interface ArAnalysisSummaryDto {
  sessionName: string;
  practiceName: string;
  uploadedBy: string;
  uploadedAt: string;
  sourceType: string;
  intakeTemplateFile?: string | null;
  pmSourceReportFiles: string[];
  totalRows?: number | null;
}

export interface ClaimCategoryBreakdownDto {
  category: string;
  count: number;
  layer: number;
}

export interface UnderpaymentByPriorityDto {
  priority: string;
  amount: number;
}

export interface RecoveryProjectionSummaryDto {
  maxPotentialRecovery: number;
  riskAdjustedRecovery: number;
  historicalCollectionRatePct?: number | null;
}

export interface ContingencyFeeByAgeDto {
  ageBand: string;
  feePct: number;
  amount: number;
}

// ── Dry Run Types ────────────────────────────────────────────────────────────

export type DryRunIssueSeverity = "Error" | "Warning" | "Info";
export type DryRunActionType = "UpdateConfig" | "UploadCorrectedFile";

export interface DryRunIssueDetail {
  clientClaimId: string;
  cptHcpcs?: string | null;
  modifier?: string | null;
  payerName?: string | null;
  planName?: string | null;
  providerName?: string | null;
  additionalInfo?: string | null;
}

export interface DryRunIssueGroup {
  category: string;
  categoryLabel: string;
  severity: DryRunIssueSeverity;
  affectedClaimCount: number;
  description: string;
  suggestedAction: string;
  actionType: DryRunActionType;
  details: DryRunIssueDetail[];
}

export interface DryRunArAnalysisResult {
  sessionId: string;
  totalClaimsChecked: number;
  totalIssuesFound: number;
  hasBlockingIssues: boolean;
  issueGroups: DryRunIssueGroup[];
}

export interface NoPayDenialSummaryDto {
  fullNoPayClaimCount: number;
  partialNoPayClaimCount: number;
  denialClaimCount: number;
  totalNoPayLineCount: number;
  totalDenialLineCount: number;
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
  underbilledClaimCount: number;
  totalUnderbilledAmount: number;
  totalBilledAmount: number;
  totalPaidAmount: number;
  totalMerFs: number;
  totalMerAllowed: number;
  totalMerOonAdjusted: number;
  noPayDenialSummary: NoPayDenialSummaryDto;
}

export function insuranceArAnalysisApi() {
  return {
    list: (params?: {
      organisationId?: string;
      status?: ArAnalysisSessionStatus;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.organisationId) q.set("OrganisationId", params.organisationId);
      if (params?.status) q.set("status", params.status);
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      const query = q.toString();
      return apiRequest<PaginatedList<ArAnalysisSessionListItemDto>>(
        `${BASE}${query ? `?${query}` : ""}`
      );
    },

    downloadIntakeTemplate: async (): Promise<Blob> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/templates/intake`);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Failed to download template."));
      }
      return res.blob();
    },

    createSession: async (form: {
      practiceName: string;
      sourceType: ArSourceType;
      intakeFile?: File | null;
      validationScope?: ArIntakeValidationScope;
    }): Promise<CreateArAnalysisSessionResult> => {
      const fd = new FormData();
      fd.append("PracticeName", form.practiceName);
      fd.append("SourceType", form.sourceType);
      if (form.intakeFile) fd.append("IntakeFile", form.intakeFile);
      if (form.validationScope) fd.append("ValidationScope", form.validationScope);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(BASE);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const j = JSON.parse(text) as { message?: string };
          msg = j.message ?? text;
        } catch {}
        throw new Error(msg || "Failed to create session.");
      }
      const json = (await res.json()) as { data?: CreateArAnalysisSessionResult };
      const data = json?.data ?? json;
      if (!data || typeof data !== "object" || !("sessionId" in data))
        throw new Error("Invalid response.");
      return data as CreateArAnalysisSessionResult;
    },

    uploadIntake: async (
      sessionId: string,
      file: File,
      validationScope?: ArIntakeValidationScope
    ): Promise<ArIntakeValidationResult> => {
      const fd = new FormData();
      fd.append("file", file);
      if (validationScope) fd.append("ValidationScope", validationScope);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/intake`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const j = JSON.parse(text) as { message?: string };
          msg = j.message ?? text;
        } catch {}
        throw new Error(msg || "Failed to upload intake.");
      }
      const json = (await res.json()) as { data?: ArIntakeValidationResult };
      const data = json?.data ?? json;
      if (!data || typeof data !== "object") throw new Error("Invalid response.");
      return data as ArIntakeValidationResult;
    },

    getSession: (sessionId: string) =>
      apiRequest<ArAnalysisSessionDetailDto>(`${BASE}/${sessionId}`),

    uploadPmReports: async (sessionId: string, files: File[]): Promise<void> => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/pm-reports`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const j = JSON.parse(text) as { message?: string };
          msg = j.message ?? text;
        } catch {}
        throw new Error(msg || "Failed to upload PM reports.");
      }
    },

    startAnalysis: async (sessionId: string): Promise<void> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/start`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = text;
        try {
          const j = JSON.parse(text) as { message?: string };
          msg = j.message ?? text;
        } catch {}
        throw new Error(msg || "Failed to start analysis.");
      }
    },

    dryRun: async (sessionId: string): Promise<DryRunArAnalysisResult> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/dry-run`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(getErrorMessageFromResponse(text, "Dry run failed."));
      }
      const json = JSON.parse(text) as { data: DryRunArAnalysisResult };
      return json.data;
    },

    getStatus: (sessionId: string) =>
      apiRequest<ArAnalysisProcessingStatusDto>(`${BASE}/${sessionId}/status`),

    downloadDataValidationErrors: async (sessionId: string): Promise<Blob> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/data-validation-errors/download`);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "DataValidationErrors file is not available."));
      }
      return res.blob();
    },

    downloadClaimIntegrityConflicts: async (sessionId: string): Promise<Blob> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/claim-integrity-conflicts/download`);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "ClaimIntegrityConflicts file is not available."));
      }
      return res.blob();
    },

    downloadPayerNotFound: async (sessionId: string): Promise<Blob> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/payer-not-found/download`);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Payer-NotFound file is not available."));
      }
      return res.blob();
    },

    uploadPayerNotFound: async (sessionId: string, file: File): Promise<void> => {
      const fd = new FormData();
      fd.append("file", file);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/payer-not-found/upload`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Failed to upload."));
      }
    },

    downloadPlanNotFound: async (sessionId: string): Promise<Blob> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/plan-not-found/download`);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Plan-NotFound file is not available."));
      }
      return res.blob();
    },

    uploadPlanNotFound: async (sessionId: string, file: File): Promise<void> => {
      const fd = new FormData();
      fd.append("file", file);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/plan-not-found/upload`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Failed to upload."));
      }
    },

    downloadProviderParticipationNotFound: async (sessionId: string): Promise<Blob> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/provider-participation-not-found/download`);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Provider-participation-not-found file is not available."));
      }
      return res.blob();
    },

    uploadProviderParticipationNotFound: async (sessionId: string, file: File): Promise<void> => {
      const fd = new FormData();
      fd.append("file", file);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/provider-participation-not-found/upload`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Failed to upload."));
      }
    },

    downloadFacilityParticipationNotFound: async (sessionId: string): Promise<Blob> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/facility-participation-not-found/download`);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Facility-participation-not-found file is not available."));
      }
      return res.blob();
    },

    uploadFacilityParticipationNotFound: async (sessionId: string, file: File): Promise<void> => {
      const fd = new FormData();
      fd.append("file", file);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/facility-participation-not-found/upload`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Failed to upload."));
      }
    },

    uploadClaimIntegrityConflicts: async (
      sessionId: string,
      file: File
    ): Promise<void> => {
      const fd = new FormData();
      fd.append("file", file);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/claim-integrity-conflicts/upload`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Failed to upload."));
      }
    },

    skipClaimIntegrityConflicts: async (sessionId: string): Promise<void> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/claim-integrity-conflicts/skip`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Skip failed."));
      }
    },

    skipPayerNotFound: async (sessionId: string): Promise<void> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/payer-not-found/skip`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Skip failed."));
      }
    },

    skipPlanNotFound: async (sessionId: string): Promise<void> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/plan-not-found/skip`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Skip failed."));
      }
    },

    skipProviderParticipationNotFound: async (sessionId: string): Promise<void> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/provider-participation-not-found/skip`);
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Skip failed."));
      }
    },

    getReport: (sessionId: string) =>
      apiRequest<ArAnalysisReportDto>(`${BASE}/${sessionId}/report`),

    downloadReportExport: async (sessionId: string): Promise<Blob> => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY)
          : null;
      const url = getApiUrl(`${BASE}/${sessionId}/report/export`);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(getErrorMessageFromResponse(text, "Report export is not available."));
      }
      return res.blob();
    },

    deleteSession: async (sessionId: string): Promise<void> => {
      await apiRequest(`${BASE}/${sessionId}`, { method: "DELETE" });
    },

    bulkDelete: async (ids: string[]): Promise<void> => {
      await apiRequest(`${BASE}/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
    },
  };
}
