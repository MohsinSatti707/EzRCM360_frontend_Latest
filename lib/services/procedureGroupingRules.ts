import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface ProcedureGroupingRuleDto {
  id: string;
  groupCode: string;
  groupName: string;
  cptHcpcsCode: string;
  sortOrder: number;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive: boolean;
}

export interface CreateProcedureGroupingRuleCommand {
  groupCode: string;
  groupName: string;
  cptHcpcsCode: string;
  sortOrder?: number;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive?: boolean;
}

export interface UpdateProcedureGroupingRuleCommand extends CreateProcedureGroupingRuleCommand {
  id: string;
}

export function procedureGroupingRulesApi() {
  return {
    getList: (params?: {
      groupCode?: string;
      cptHcpcsCode?: string;
      isActive?: boolean;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.groupCode) q.set("groupCode", params.groupCode);
      if (params?.cptHcpcsCode) q.set("cptHcpcsCode", params.cptHcpcsCode);
      if (params?.isActive != null) q.set("isActive", String(params.isActive));
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<ProcedureGroupingRuleDto>>(`/api/ProcedureGroupingRules?${q}`);
    },
    getById: (id: string) =>
      apiRequest<ProcedureGroupingRuleDto>(`/api/ProcedureGroupingRules/${id}`),
    create: (body: CreateProcedureGroupingRuleCommand) =>
      apiRequest<string>("/api/ProcedureGroupingRules", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Omit<UpdateProcedureGroupingRuleCommand, "id">) =>
      apiRequest<void>(`/api/ProcedureGroupingRules/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/ProcedureGroupingRules/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/ProcedureGroupingRules/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
