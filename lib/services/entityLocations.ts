import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface EntityLocationListItemDto {
  id: string;
  entityId: string;
  entityDisplayName: string;
  locationName: string;
  locationType: string;
  physicalAddress?: string | null;
  posCode?: string | null;
  isActive: boolean;
}

export interface EntityLocationDetailDto {
  id: string;
  entityId: string;
  entityDisplayName?: string | null;
  locationName: string;
  locationType: string;
  physicalAddress?: string | null;
  posCode?: string | null;
  isActive: boolean;
  createdAt?: string | null;
}

export interface CreateEntityLocationRequest {
  entityId: string;
  locationName: string;
  locationType: string;
  physicalAddress?: string | null;
  posCode?: string | null;
  isActive?: boolean;
}

export interface UpdateEntityLocationRequest {
  entityId: string;
  locationName: string;
  locationType: string;
  physicalAddress?: string | null;
  posCode?: string | null;
  isActive: boolean;
}

export function entityLocationsApi() {
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
      return apiRequest<PaginatedList<EntityLocationListItemDto>>(`/api/EntityLocations?${q}`);
    },
    getById: (id: string) =>
      apiRequest<EntityLocationDetailDto>(`/api/EntityLocations/${id}`),
    create: (body: CreateEntityLocationRequest) =>
      apiRequest<string>("/api/EntityLocations", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateEntityLocationRequest) =>
      apiRequest<void>(`/api/EntityLocations/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/EntityLocations/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/EntityLocations/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
