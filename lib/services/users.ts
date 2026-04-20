import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface UserListItemDto {
  id: string;
  userName: string;
  email: string;
  organizationId?: string | null;
  organizationName?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  moduleIds: string[];
  /** API may return enum string ("Active") or number depending on serialization */
  status: number | string;
}

export interface UserDetailDto {
  id: string;
  userName: string;
  email: string;
  organizationId?: string | null;
  roleId?: string | null;
  moduleIds: string[];
  /** API may return enum string or number */
  status: number | string;
}

/** API expects enum names (e.g. "Active"). Map numeric status to string for requests. */
export const USER_STATUS_NAMES = ["Pending", "Active", "Suspended", "Terminated"] as const;
export type UserStatusName = (typeof USER_STATUS_NAMES)[number];

export interface CreateUserRequest {
  userName: string;
  email: string;
  password?: string | null;
  organizationId?: string | null;
  roleId?: string | null;
  moduleIds?: string[] | null;
  /** Backend expects enum string; UI uses number. Both accepted for API calls. */
  status?: number | UserStatusName;
}

export interface UpdateUserRequest {
  userName: string;
  email: string;
  organizationId?: string | null;
  roleId?: string | null;
  moduleIds?: string[] | null;
  /** Backend expects enum string: "Pending" | "Active" | "Suspended" | "Terminated" */
  status: number | UserStatusName;
  newPassword?: string | null;
}

export function usersApi() {
  return {
    getList: (params?: {
      status?: number;
      search?: string;
      searchField?: string;
      organizationId?: string;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.status != null) q.set("status", String(params.status));
      if (params?.search) q.set("search", params.search);
      if (params?.searchField) q.set("searchField", params.searchField);
      if (params?.organizationId) q.set("OrganizationId", params.organizationId);
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<UserListItemDto>>(`/api/Users?${q}`);
    },
    getById: (id: string) =>
      apiRequest<UserDetailDto>(`/api/Users/${id}`),
    create: (body: CreateUserRequest) =>
      apiRequest<string>("/api/Users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateUserRequest) =>
      apiRequest<void>(`/api/Users/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/Users/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/Users/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
