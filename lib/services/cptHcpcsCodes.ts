import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface CptHcpcsCodeDto {
  id: string;
  code: string;
  shortDescription: string;
  longDescription?: string | null;
  codeType: number;
  isAddOn: boolean;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive: boolean;
}

export interface CreateCptHcpcsCodeCommand {
  code: string;
  shortDescription: string;
  longDescription?: string | null;
  codeType: number;
  isAddOn?: boolean;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive?: boolean;
}

export function cptHcpcsCodesApi() {
  return {
    getList: (params?: {
      code?: string;
      codeType?: number;
      isActive?: boolean;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.code) q.set("code", params.code);
      if (params?.codeType != null) q.set("codeType", String(params.codeType));
      if (params?.isActive != null) q.set("isActive", String(params.isActive));
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<CptHcpcsCodeDto>>(`/api/CptHcpcsCodes?${q}`);
    },
    getById: (id: string) =>
      apiRequest<CptHcpcsCodeDto>(`/api/CptHcpcsCodes/${id}`),
    create: (body: CreateCptHcpcsCodeCommand) =>
      apiRequest<string>("/api/CptHcpcsCodes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: CreateCptHcpcsCodeCommand) =>
      apiRequest<void>(`/api/CptHcpcsCodes/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/CptHcpcsCodes/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/CptHcpcsCodes/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
