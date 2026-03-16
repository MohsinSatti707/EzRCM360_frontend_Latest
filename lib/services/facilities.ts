import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface FacilityListItemDto {
  id: string;
  name: string;
  facilityType: string;
  physicalAddress?: string | null;
  entityId: string;
  entityDisplayName?: string | null;
  posCode?: string | null;
  isActive: boolean;
}

export interface FacilityDetailDto {
  id: string;
  name: string;
  facilityType: string;
  physicalAddress?: string | null;
  entityId: string;
  posCode?: string | null;
  isActive: boolean;
}

export interface CreateFacilityRequest {
  name: string;
  facilityType: string;
  physicalAddress?: string | null;
  entityId: string;
  posCode?: string | null;
  isActive?: boolean;
  organizationId?: string | null;
}

export interface UpdateFacilityRequest {
  name: string;
  facilityType: string;
  physicalAddress?: string | null;
  entityId: string;
  posCode?: string | null;
  isActive: boolean;
}

export function facilitiesApi() {
  return {
    getList: (params?: {
      organizationId?: string;
      entityId?: string;
      isActive?: boolean;
      search?: string;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.organizationId) q.set("OrganizationId", params.organizationId);
      if (params?.entityId) q.set("entityId", params.entityId);
      if (params?.isActive != null) q.set("isActive", String(params.isActive));
      if (params?.search) q.set("search", params.search);
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<FacilityListItemDto>>(`/api/Facilities?${q}`);
    },
    getById: (id: string) =>
      apiRequest<FacilityDetailDto>(`/api/Facilities/${id}`),
    create: (body: CreateFacilityRequest) =>
      apiRequest<string>("/api/Facilities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateFacilityRequest) =>
      apiRequest<void>(`/api/Facilities/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/Facilities/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/Facilities/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
