import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface BundlingReductionRuleDto {
  id: string;
  primaryCptCode: string;
  secondaryCptCode: string;
  reductionFactor: number;
  modifier59Override: boolean;
  ruleType: number;
  ruleName?: string | null;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive: boolean;
}

export interface CreateBundlingReductionRuleCommand {
  primaryCptCode: string;
  secondaryCptCode: string;
  reductionFactor: number;
  modifier59Override: boolean;
  ruleType: number;
  ruleName?: string | null;
  effectiveStartDate?: string | null;
  effectiveEndDate?: string | null;
  isActive?: boolean;
}

export interface UpdateBundlingReductionRuleCommand extends CreateBundlingReductionRuleCommand {
  id: string;
}

export function bundlingReductionRulesApi() {
  return {
    getList: (params?: {
      primaryCptCode?: string;
      secondaryCptCode?: string;
      ruleType?: number;
      isActive?: boolean;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.primaryCptCode) q.set("primaryCptCode", params.primaryCptCode);
      if (params?.secondaryCptCode) q.set("secondaryCptCode", params.secondaryCptCode);
      if (params?.ruleType != null) q.set("ruleType", String(params.ruleType));
      if (params?.isActive != null) q.set("isActive", String(params.isActive));
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<BundlingReductionRuleDto>>(`/api/BundlingReductionRules?${q}`);
    },
    getById: (id: string) =>
      apiRequest<BundlingReductionRuleDto>(`/api/BundlingReductionRules/${id}`),
    create: (body: CreateBundlingReductionRuleCommand) =>
      apiRequest<string>("/api/BundlingReductionRules", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: Omit<UpdateBundlingReductionRuleCommand, "id">) =>
      apiRequest<void>(`/api/BundlingReductionRules/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/BundlingReductionRules/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/BundlingReductionRules/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
