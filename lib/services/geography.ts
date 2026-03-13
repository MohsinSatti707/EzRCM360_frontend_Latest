import { apiRequest } from "@/lib/api";
import { API_URL, AUTH_TOKEN_KEY } from "@/lib/env";
import type { PaginatedList } from "@/lib/types";

export interface ZipGeoMappingDto {
  id: string;
  mappingName: string;
  fsCategory: number;
  state: string;
  zip: string;
  mappingType: number;
  source: number;
  geoCode: string | null;
  geoName: string | null;
  year: number;
  quarter: number | null;
  active: boolean;
}

export interface ZipGeoMappingLookupsDto {
  states: string[];
  years: number[];
  mappingTypes: { value: number; name: string }[];
  sources: { value: number; name: string }[];
  fsCategories: { value: number; name: string }[];
}

export interface CreateZipGeoMappingCommand {
  mappingName: string;
  fsCategory: number;
  state: string;
  zip: string;
  mappingType: number;
  source: number;
  geoCode?: string | null;
  geoName?: string | null;
  year: number;
  quarter?: number | null;
  active?: boolean;
}

export interface UpdateZipGeoMappingCommand extends CreateZipGeoMappingCommand {
  id: string;
}

export function geographyApi() {
  return {
    getList: (params: {
      fsCategory?: number;
      state?: string;
      zip?: string;
      year?: number;
      active?: boolean;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params.fsCategory != null) q.set("fsCategory", String(params.fsCategory));
      if (params.state) q.set("state", params.state);
      if (params.zip) q.set("zip", params.zip);
      if (params.year != null) q.set("year", String(params.year));
      if (params.active != null) q.set("active", String(params.active));
      if (params.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<ZipGeoMappingDto>>(`/api/ZipGeoMappings?${q}`);
    },
    getById: (id: string) =>
      apiRequest<ZipGeoMappingDto>(`/api/ZipGeoMappings/${id}`),
    getLookups: () =>
      apiRequest<ZipGeoMappingLookupsDto>("/api/ZipGeoMappings/lookups"),
    create: (body: CreateZipGeoMappingCommand) =>
      apiRequest<string>("/api/ZipGeoMappings", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: CreateZipGeoMappingCommand) =>
      apiRequest<void>(`/api/ZipGeoMappings/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/ZipGeoMappings/${id}`, { method: "DELETE" }),
    importMappings: async (fsCategory: number, file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const base = API_URL.replace(/\/$/, "");
      const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
      const res = await fetch(`${base}/api/ZipGeoMappings/import?fsCategory=${fsCategory}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try { const json = JSON.parse(text); message = json.detail || json.message || json.title || text; } catch { /* use text */ }
        throw new Error(message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.data ?? json;
    },
    downloadTemplate: async (fsCategory: number) => {
      const base = API_URL.replace(/\/$/, "");
      const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
      const res = await fetch(`${base}/api/ZipGeoMappings/templates?fsCategory=${fsCategory}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition");
      const match = cd?.match(/filename="?([^"]+)"?/);
      const fileName = match?.[1] ?? `ZipGeoMappingTemplate.xlsx`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    },
  };
}
