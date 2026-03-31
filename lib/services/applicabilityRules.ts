import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface ApplicabilityRuleDto {
  id: string;
  sortOrder: number;
  ruleSetName: string;
  displayName: string;
  payerEntityType: string;
  planCategory: string;
  claimCategory: string;
  providerParticipation: string;
  payerCategory: string;
  feeScheduleApplied: string;
  merCalculationScope: string;
  isActive: boolean;
  state?: string | null;
  placeOfService?: string | null;
  primaryFeeScheduleId?: string | null;
  modifier?: string | null;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  multiplierPct?: number | null;
}

export interface CreateApplicabilityRuleCommand {
  sortOrder: number;
  ruleSetName: string;
  displayName: string;
  payerEntityType: string;
  planCategory: string;
  claimCategory: string;
  providerParticipation: string;
  payerCategory: string;
  feeScheduleApplied: string;
  merCalculationScope: string;
  isActive?: boolean;
  state?: string | null;
  placeOfService?: string | null;
  primaryFeeScheduleId?: string | null;
  modifier?: string | null;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  multiplierPct?: number | null;
}

export function applicabilityRulesApi() {
  return {
    getList: (params: {
      payerCategory?: string;
      isActive?: boolean;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params.payerCategory != null) q.set("payerCategory", String(params.payerCategory));
      if (params.isActive != null) q.set("isActive", String(params.isActive));
      if (params.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<ApplicabilityRuleDto>>(`/api/ApplicabilityRules?${q}`);
    },
    getById: (id: string) =>
      apiRequest<ApplicabilityRuleDto>(`/api/ApplicabilityRules/${id}`),
    create: (body: CreateApplicabilityRuleCommand) =>
      apiRequest<string>("/api/ApplicabilityRules", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: CreateApplicabilityRuleCommand) =>
      apiRequest<void>(`/api/ApplicabilityRules/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/ApplicabilityRules/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/ApplicabilityRules/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
