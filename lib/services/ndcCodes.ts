import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface NdcCodeDto {
  id: string;
  ndcCodeValue: string;
  description: string;
  packageSize?: string | null;
  unitOfMeasure?: string | null;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive: boolean;
}

export interface CreateNdcCodeCommand {
  ndcCodeValue: string;
  description: string;
  packageSize?: string | null;
  unitOfMeasure?: string | null;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive?: boolean;
}

export interface UpdateNdcCodeCommand extends CreateNdcCodeCommand {
  id: string;
}

export function ndcCodesApi() {
  return {
    getList: (params?: {
      ndcCodeValue?: string;
      isActive?: boolean;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.ndcCodeValue) q.set("ndcCodeValue", params.ndcCodeValue);
      if (params?.isActive != null) q.set("isActive", String(params.isActive));
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<NdcCodeDto>>(`/api/NdcCodes?${q}`);
    },
    getById: (id: string) =>
      apiRequest<NdcCodeDto>(`/api/NdcCodes/${id}`),
    create: (body: CreateNdcCodeCommand) =>
      apiRequest<string>("/api/NdcCodes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Omit<UpdateNdcCodeCommand, "id">) =>
      apiRequest<void>(`/api/NdcCodes/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/NdcCodes/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/NdcCodes/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
