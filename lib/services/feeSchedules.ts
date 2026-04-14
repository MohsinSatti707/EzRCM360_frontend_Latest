import { apiRequest, apiRequestForm } from "@/lib/api";
import { API_URL, AUTH_TOKEN_KEY } from "@/lib/env";
import type { PaginatedList } from "@/lib/types";

export interface FeeScheduleCategoryCountsDto {
  medicare: number;
  ucr: number;
  mva: number;
  wc: number;
}

export interface FeeScheduleDto {
  id: string;
  scheduleCode?: string | null;
  category: number | string;
  state?: string | null;
  geoType: number | string;
  geoCode?: string | null;
  geoName?: string | null;
  billingType: number | string;
  years: number[];
  quarters: number[];
  calculationModel: number | string;
  adoptFeeScheduleId?: string | null;
  multiplierPct: number;
  fallbackCategory?: number | string | null;
  status: number | string;
  source?: string | null;
  notes?: string | null;
}

export interface FeeScheduleDetailDto {
  id: string;
  scheduleCode?: string | null;
  category: number;
  state?: string | null;
  geoType: number;
  geoCode?: string | null;
  geoName?: string | null;
  billingType: number;
  years: number[];
  quarters: number[];
  calculationModel: number;
  adoptFeeScheduleId?: string | null;
  multiplierPct: number;
  fallbackCategory?: number | null;
  status: number;
  source?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

export interface FeeScheduleLineDto {
  id: string;
  feeScheduleId: string;
  zip?: string | null;
  cptHcpcs: string;
  modifier?: string | null;
  feeAmount: number;
  rv?: number | null;
  pctcIndicator?: number | null;
  fee50th?: number | null;
  fee60th?: number | null;
  fee70th?: number | null;
  fee75th?: number | null;
  fee80th?: number | null;
  fee85th?: number | null;
  fee90th?: number | null;
  fee95th?: number | null;
}

export interface FeeScheduleLineImportResult {
  success: boolean;
  rowsImported: number;
  errors: string[];
}

export interface CreateFeeScheduleCommand {
  scheduleCode?: string | null;
  category: number;
  state?: string | null;
  geoType: number;
  geoCode?: string | null;
  geoName?: string | null;
  billingType: number;
  years: number[];
  quarters: number[];
  calculationModel: number;
  adoptFeeScheduleId?: string | null;
  multiplierPct: number;
  fallbackCategory?: number | null;
  status?: number;
  source?: string | null;
  notes?: string | null;
}

export function feeSchedulesApi() {
  return {
    getCategoryCounts: () =>
      apiRequest<FeeScheduleCategoryCountsDto>("/api/FeeSchedules/counts-by-category"),
    getLookups: () =>
      apiRequest<{
        categories: { value: number; name: string }[];
        states: string[];
        geoTypes: { value: number; name: string }[];
        billingTypes: { value: number; name: string }[];
        years: number[];
        calculationModels: { value: number; name: string }[];
      }>("/api/FeeSchedules/lookups"),
    getList: (params?: {
      category?: number;
      state?: string;
      status?: number;
      year?: number;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.category != null) q.set("category", String(params.category));
      if (params?.state) q.set("state", params.state);
      if (params?.status != null) q.set("status", String(params.status));
      if (params?.year != null) q.set("year", String(params.year));
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<FeeScheduleDto>>(`/api/FeeSchedules?${q}`);
    },
    getById: (id: string) =>
      apiRequest<FeeScheduleDetailDto>(`/api/FeeSchedules/${id}`),
    create: (body: CreateFeeScheduleCommand) =>
      apiRequest<string>("/api/FeeSchedules", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: CreateFeeScheduleCommand) =>
      apiRequest<void>(`/api/FeeSchedules/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/FeeSchedules/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/FeeSchedules/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
    getLines: (feeScheduleId: string, params?: { pageNumber?: number; pageSize?: number; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      if (params?.search) q.set("search", params.search);
      return apiRequest<PaginatedList<FeeScheduleLineDto>>(`/api/FeeSchedules/${feeScheduleId}/lines?${q}`);
    },
    importLines: async (feeScheduleId: string, file: File): Promise<FeeScheduleLineImportResult> => {
      const fd = new FormData();
      fd.append("file", file);
      const base = API_URL.replace(/\/$/, "");
      const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
      const res = await fetch(`${base}/api/FeeSchedules/${feeScheduleId}/lines/import`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.detail || json.message || json.title || text;
        } catch { /* use text */ }
        throw new Error(message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.data ?? json;
    },
    downloadLinesTemplate: async (templateType: string) => {
      const base = API_URL.replace(/\/$/, "");
      const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
      const res = await fetch(`${base}/api/FeeSchedules/templates/lines?templateType=${templateType}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition");
      const match = cd?.match(/filename="?([^"]+)"?/);
      const fileName = match?.[1] ?? `${templateType}FeeScheduleTemplate.xlsx`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    createLine: (feeScheduleId: string, body: CreateFeeScheduleLineRequest) =>
      apiRequest<{ id: string }>(`/api/FeeSchedules/${feeScheduleId}/lines`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateLine: (lineId: string, body: CreateFeeScheduleLineRequest) =>
      apiRequest<void>(`/api/FeeSchedules/lines/${lineId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    deleteLine: (lineId: string) =>
      apiRequest<void>(`/api/FeeSchedules/lines/${lineId}`, { method: "DELETE" }),
  };
}

export interface CreateFeeScheduleLineRequest {
  zip?: string | null;
  cptHcpcs: string;
  modifier?: string | null;
  feeAmount: number;
  rv?: number | null;
  pctcIndicator?: number | null;
  fee50th?: number | null;
  fee60th?: number | null;
  fee70th?: number | null;
  fee75th?: number | null;
  fee80th?: number | null;
  fee85th?: number | null;
  fee90th?: number | null;
  fee95th?: number | null;
}
