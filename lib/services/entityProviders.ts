import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface EntityProviderListItemDto {
  id: string;
  entityId: string;
  entityDisplayName: string;
  providerName: string;
  npi: string;
  providerType: number;
  primarySpecialty?: string | null;
  secondarySpecialty?: string | null;
  isActive: boolean;
}

export interface EntityProviderDetailDto {
  id: string;
  entityId: string;
  providerName: string;
  npi: string;
  ssn?: string | null;
  providerType: number;
  primarySpecialty?: string | null;
  secondarySpecialty?: string | null;
  isActive: boolean;
}

export interface CreateEntityProviderRequest {
  entityId: string;
  providerName: string;
  npi: string;
  ssn?: string | null;
  providerType: number;
  primarySpecialty?: string | null;
  secondarySpecialty?: string | null;
  isActive?: boolean;
}

export interface UpdateEntityProviderRequest {
  entityId: string;
  providerName: string;
  npi: string;
  ssn?: string | null;
  providerType: number;
  primarySpecialty?: string | null;
  secondarySpecialty?: string | null;
  isActive: boolean;
}

export function entityProvidersApi() {
  return {
    getList: (params?: {
      entityId?: string;
      isActive?: boolean;
      search?: string;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.entityId) q.set("entityId", params.entityId);
      if (params?.isActive != null) q.set("isActive", String(params.isActive));
      if (params?.search) q.set("search", params.search);
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<EntityProviderListItemDto>>(`/api/EntityProviders?${q}`);
    },
    getById: (id: string) =>
      apiRequest<EntityProviderDetailDto>(`/api/EntityProviders/${id}`),
    create: (body: CreateEntityProviderRequest) =>
      apiRequest<string>("/api/EntityProviders", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateEntityProviderRequest) =>
      apiRequest<void>(`/api/EntityProviders/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/EntityProviders/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/EntityProviders/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
