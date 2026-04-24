import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface GroupProviderPlanParticipationListItemDto {
  id: string;
  entityProviderId: string;
  providerName?: string | null;
  payerId: string;
  payerName?: string | null;
  planId: string;
  planDisplayName?: string | null;
  participationStatus: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  source: number;
  isActive: boolean;
}

export interface GroupProviderPlanParticipationDetailDto {
  id: string;
  entityProviderId: string;
  payerId: string;
  planId: string;
  participationStatus: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  source: number;
  isActive: boolean;
  createdAt?: string | null;
}

export interface CreateGroupProviderPlanParticipationRequest {
  entityProviderId: string;
  payerId: string;
  planId: string;
  participationStatus: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  source: number;
  isActive?: boolean;
}

export interface UpdateGroupProviderPlanParticipationRequest {
  entityProviderId: string;
  payerId: string;
  planId: string;
  participationStatus: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  source: number;
  isActive: boolean;
}

export function groupParticipationsApi() {
  return {
    getList: (params?: {
      entityProviderId?: string;
      planId?: string;
      isActive?: boolean;
      search?: string;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.entityProviderId) q.set("entityProviderId", params.entityProviderId);
      if (params?.planId) q.set("planId", params.planId);
      if (params?.isActive != null) q.set("isActive", String(params.isActive));
      if (params?.search) q.set("search", params.search);
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<GroupProviderPlanParticipationListItemDto>>(
        `/api/GroupProviderPlanParticipations?${q}`
      );
    },
    getById: (id: string) =>
      apiRequest<GroupProviderPlanParticipationDetailDto>(`/api/GroupProviderPlanParticipations/${id}`),
    create: (body: CreateGroupProviderPlanParticipationRequest) =>
      apiRequest<string>("/api/GroupProviderPlanParticipations", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateGroupProviderPlanParticipationRequest) =>
      apiRequest<void>(`/api/GroupProviderPlanParticipations/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/GroupProviderPlanParticipations/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/GroupProviderPlanParticipations/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
