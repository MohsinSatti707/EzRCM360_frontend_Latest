import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface FinancialModifierDto {
  id: string;
  modifierCode: string;
  factor: number;
  description?: string | null;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive: boolean;
}

export interface CreateFinancialModifierCommand {
  modifierCode: string;
  factor: number;
  description?: string | null;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive?: boolean;
}

export interface UpdateFinancialModifierCommand extends CreateFinancialModifierCommand {
  id: string;
}

export function financialModifiersApi() {
  return {
    getList: (params?: {
      modifierCode?: string;
      isActive?: boolean;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.modifierCode) q.set("modifierCode", params.modifierCode);
      if (params?.isActive != null) q.set("isActive", String(params.isActive));
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<FinancialModifierDto>>(`/api/FinancialModifiers?${q}`);
    },
    getById: (id: string) =>
      apiRequest<FinancialModifierDto>(`/api/FinancialModifiers/${id}`),
    create: (body: CreateFinancialModifierCommand) =>
      apiRequest<string>("/api/FinancialModifiers", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Omit<UpdateFinancialModifierCommand, "id">) =>
      apiRequest<void>(`/api/FinancialModifiers/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/FinancialModifiers/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/FinancialModifiers/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
