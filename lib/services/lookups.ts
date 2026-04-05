import { apiRequest } from "@/lib/api";

export interface LookupDto {
  id: string;
  title: string;
}

export interface ValueLabelDto {
  value: string;
  label: string;
}

export interface EntityLookupDto {
  id: string;
  displayName: string;
}

export interface PayerLookupDto {
  id: string;
  payerName: string;
  entityType: number;
}

export interface PlanLookupDto {
  id: string;
  displayName: string;
  payerId: string;
}

export interface EntityProviderLookupDto {
  id: string;
  displayName: string;
  entityId: string;
}

export interface ModuleLookupDto {
  id: string;
  name: string;
  parentId?: string | null;
}

export function lookupsApi() {
  return {
    getModules: () =>
      apiRequest<ModuleLookupDto[]>("/api/Lookups/modules"),
    getRoles: (organizationId?: string) => {
      const q = organizationId ? `?OrganizationId=${organizationId}` : "";
      return apiRequest<LookupDto[]>(`/api/Lookups/roles${q}`);
    },
    getOrganizations: () =>
      apiRequest<{ items: { id: string; name: string; isActive: boolean }[] }>(
        "/api/Lookups/Organizations?pageSize=500"
      ).then((r) => (r?.items ?? []).map((o) => ({ id: o.id, title: o.name }))),
    getEntities: (organizationId?: string) => {
      const q = organizationId ? `?OrganizationId=${organizationId}` : "";
      return apiRequest<EntityLookupDto[]>(`/api/Lookups/entities${q}`);
    },
    getPayers: (organizationId?: string) => {
      const q = organizationId ? `?OrganizationId=${organizationId}` : "";
      return apiRequest<PayerLookupDto[]>(`/api/Lookups/payers${q}`);
    },
    getPlans: (payerId?: string, organizationId?: string) => {
      const params = new URLSearchParams();
      if (payerId) params.set("payerId", payerId);
      if (organizationId) params.set("OrganizationId", organizationId);
      const q = params.toString() ? `?${params}` : "";
      return apiRequest<PlanLookupDto[]>(`/api/Lookups/plans${q}`);
    },
    getEntityProviders: (entityId?: string) => {
      const q = entityId ? `?entityId=${entityId}` : "";
      return apiRequest<EntityProviderLookupDto[]>(`/api/Lookups/entity-providers${q}`);
    },
    getUserStatuses: () =>
      apiRequest<ValueLabelDto[]>("/api/Lookups/user-statuses"),
    getPayerEntityTypes: () =>
      apiRequest<ValueLabelDto[]>("/api/Lookups/payer-entity-types"),
    getPlanCategories: () =>
      apiRequest<ValueLabelDto[]>("/api/Lookups/plan-categories"),
    getPlanTypes: () =>
      apiRequest<ValueLabelDto[]>("/api/Lookups/plan-types"),
    getMarketTypes: () =>
      apiRequest<ValueLabelDto[]>("/api/Lookups/market-types"),
    getNsaCategories: () =>
      apiRequest<ValueLabelDto[]>("/api/Lookups/nsa-categories"),
    getParticipationStatuses: () =>
      apiRequest<ValueLabelDto[]>("/api/Lookups/participation-statuses"),
    getParticipationSources: () =>
      apiRequest<ValueLabelDto[]>("/api/Lookups/participation-sources"),
    getVisibilityLevels: () =>
      apiRequest<ValueLabelDto[]>("/api/Lookups/visibility-levels"),
  };
}
