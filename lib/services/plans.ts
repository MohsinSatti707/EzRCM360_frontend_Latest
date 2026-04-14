import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface PlanListItemDto {
  id: string;
  planName: string;
  planIdPrefix?: string | null;
  payerId: string;
  linkedPayerName: string;
  planCategory: number;
  planType: number;
  oonBenefits: boolean;
  nsaEligible: boolean;
  nsaCategory?: number | null;
  status: number;
}

export interface PlanDetailDto {
  id: string;
  payerId: string;
  planName: string;
  aliases?: string | null;
  planIdPrefix?: string | null;
  planCategory: number;
  planType: number;
  marketType?: number | null;
  oonBenefits: boolean;
  planResponsibilityPct?: number | null;
  patientResponsibilityPct?: number | null;
  typicalDeductible?: number | null;
  oopMax?: number | null;
  nsaEligible: boolean;
  nsaCategory?: number | null;
  providerParticipationApplicable: boolean;
  timelyFilingInitialDays: number;
  timelyFilingResubmissionDays?: number | null;
  timelyFilingAppealDays: number;
  status: number;
  createdAt?: string | null;
}

export interface CreatePlanRequest {
  payerId: string;
  planName: string;
  aliases?: string | null;
  planIdPrefix?: string | null;
  planCategory: number;
  planType: number;
  marketType?: number | null;
  oonBenefits: boolean;
  planResponsibilityPct?: number | null;
  patientResponsibilityPct?: number | null;
  typicalDeductible?: number | null;
  oopMax?: number | null;
  nsaEligible: boolean;
  nsaCategory?: number | null;
  providerParticipationApplicable: boolean;
  timelyFilingInitialDays: number;
  timelyFilingResubmissionDays?: number | null;
  timelyFilingAppealDays: number;
  status?: number;
}

export interface UpdatePlanRequest extends CreatePlanRequest {
  status: number;
}

export function plansApi() {
  return {
    getList: (params?: {
      payerId?: string;
      status?: number;
      search?: string;
      organizationId?: string;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.payerId) q.set("payerId", params.payerId);
      if (params?.status != null) q.set("status", String(params.status));
      if (params?.search) q.set("search", params.search ?? "");
      if (params?.organizationId) q.set("OrganizationId", params.organizationId);
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<PlanListItemDto>>(`/api/Plans?${q}`);
    },
    getById: (id: string) =>
      apiRequest<PlanDetailDto>(`/api/Plans/${id}`),
    create: (body: CreatePlanRequest) =>
      apiRequest<string>("/api/Plans", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdatePlanRequest) =>
      apiRequest<void>(`/api/Plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/Plans/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/Plans/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
