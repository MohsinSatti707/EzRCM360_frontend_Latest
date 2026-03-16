import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface EntityListItemDto {
  id: string;
  legalName: string;
  displayName: string;
  groupNpi: string;
  taxId: string;
  status: number;
  organizationId: string;
  organizationName?: string | null;
}

export interface EntityDetailDto {
  id: string;
  legalName: string;
  displayName: string;
  groupNpi: string;
  taxId: string;
  status: number;
  organizationId: string;
}

export interface CreateEntityRequest {
  legalName: string;
  displayName: string;
  groupNpi: string;
  taxId: string;
  status?: number;
}

export interface UpdateEntityRequest {
  legalName: string;
  displayName: string;
  groupNpi: string;
  taxId: string;
  status: number;
}

export function entitiesApi() {
  return {
    getList: (params?: {
      status?: number;
      search?: string;
      organizationId?: string;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.status != null) q.set("status", String(params.status));
      if (params?.search) q.set("search", params.search);
      if (params?.organizationId) q.set("OrganizationId", params.organizationId);
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<EntityListItemDto>>(`/api/Entities?${q}`);
    },
    getById: (id: string) =>
      apiRequest<EntityDetailDto>(`/api/Entities/${id}`),
    create: (body: CreateEntityRequest) =>
      apiRequest<string>("/api/Entities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateEntityRequest) =>
      apiRequest<void>(`/api/Entities/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/Entities/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/Entities/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
