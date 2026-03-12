import { apiRequest, apiRequestForm } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

export interface OrganizationDto {
  id: string;
  name: string;
  isActive: boolean;
}

export interface OrganizationProfileDto {
  id: string;
  name: string;
  isActive: boolean;
  primaryAdministratorUserId?: string | null;
  defaultTimeZone?: string | null;
  systemDateFormat?: string | null;
  systemTimeFormat?: string | null;
  logoUrl?: string | null;
  phoneNumber?: string | null;
}

export interface UpdateCurrentOrganizationRequest {
  name?: string | null;
  primaryAdministratorUserId?: string | null;
  defaultTimeZone?: string | null;
  systemDateFormat?: string | null;
  systemTimeFormat?: string | null;
  logoUrl?: string | null;
}

export interface CreateOrganizationCommand {
  name: string;
  isActive?: boolean;
}

export function organizationsApi() {
  return {
    getCurrent: () =>
      apiRequest<OrganizationProfileDto>("/api/Organizations/current"),
    updateCurrent: (body: UpdateCurrentOrganizationRequest) =>
      apiRequest<void>("/api/Organizations/current", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    /** Update current organization with optional logo file (multipart/form-data). Logo: PNG, JPG, JPEG or PDF, max 5 MB. */
    updateCurrentWithForm: (
      body: UpdateCurrentOrganizationRequest,
      logoFile?: File | null
    ) => {
      const formData = new FormData();
      if (body.name != null) formData.append("Name", body.name);
      if (body.primaryAdministratorUserId != null && body.primaryAdministratorUserId !== "")
        formData.append("PrimaryAdministratorUserId", body.primaryAdministratorUserId);
      if (body.defaultTimeZone != null) formData.append("DefaultTimeZone", body.defaultTimeZone);
      if (body.systemDateFormat != null) formData.append("SystemDateFormat", body.systemDateFormat);
      if (body.systemTimeFormat != null) formData.append("SystemTimeFormat", body.systemTimeFormat);
      if (body.logoUrl != null) formData.append("LogoUrl", body.logoUrl);
      if (logoFile) formData.append("Logo", logoFile);
      return apiRequestForm("/api/Organizations/upload-logo", formData, "POST");
    },
    getList: (params?: { pageNumber?: number; pageSize?: number }) => {
      const q = new URLSearchParams();
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<OrganizationDto>>(`/api/Organizations?${q}`);
    },
    create: (body: CreateOrganizationCommand) =>
      apiRequest<string>("/api/Organizations", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };
}
