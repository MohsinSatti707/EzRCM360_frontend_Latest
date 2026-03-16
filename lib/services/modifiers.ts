import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface ModifierDto {
  id: string;
  modifierCode: string;
  description: string;
  modifierType: number;
  isActive: boolean;
}

export interface CreateModifierCommand {
  modifierCode: string;
  description: string;
  modifierType: number;
  isActive?: boolean;
}

export interface UpdateModifierCommand extends CreateModifierCommand {
  id: string;
}

export function modifiersApi() {
  return {
    getList: (params?: {
      modifierCode?: string;
      modifierType?: number;
      isActive?: boolean;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.modifierCode) q.set("modifierCode", params.modifierCode);
      if (params?.modifierType != null) q.set("modifierType", String(params.modifierType));
      if (params?.isActive != null) q.set("isActive", String(params.isActive));
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<ModifierDto>>(`/api/Modifiers?${q}`);
    },
    getById: (id: string) =>
      apiRequest<ModifierDto>(`/api/Modifiers/${id}`),
    create: (body: CreateModifierCommand) =>
      apiRequest<string>("/api/Modifiers", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Omit<UpdateModifierCommand, "id">) =>
      apiRequest<void>(`/api/Modifiers/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/Modifiers/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/Modifiers/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
