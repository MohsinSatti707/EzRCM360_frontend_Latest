import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";
import type { IcdCodeDto } from "@/lib/types";

export interface CreateIcdCodeCommand {
  code: string;
  description: string;
  version?: string;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isBillable?: boolean;
  isActive?: boolean;
}

export interface UpdateIcdCodeCommand extends CreateIcdCodeCommand {
  id: string;
}

export function icdCodesApi() {
  return {
    getList: (params: {
      code?: string;
      version?: string;
      isActive?: boolean;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params.code) q.set("code", params.code);
      if (params.version) q.set("version", params.version);
      if (params.isActive != null) q.set("isActive", String(params.isActive));
      if (params.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<IcdCodeDto>>(`/api/IcdCodes?${q}`);
    },
    getById: (id: string) =>
      apiRequest<IcdCodeDto>(`/api/IcdCodes/${id}`),
    create: (body: CreateIcdCodeCommand) =>
      apiRequest<string>("/api/IcdCodes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: CreateIcdCodeCommand) =>
      apiRequest<void>(`/api/IcdCodes/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/IcdCodes/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/IcdCodes/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
