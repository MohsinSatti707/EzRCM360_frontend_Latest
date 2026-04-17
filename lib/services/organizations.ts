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
  industry?: string | null;
  numberOfEmployees?: string | null;
  primaryAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  companyOverviewWebsite?: string | null;
  adminFirstName?: string | null;
  adminLastName?: string | null;
  adminJobTitle?: string | null;
  adminPhone?: string | null;
  adminEmail?: string | null;
}

export interface UpdateCurrentOrganizationRequest {
  name?: string | null;
  primaryAdministratorUserId?: string | null;
  defaultTimeZone?: string | null;
  systemDateFormat?: string | null;
  systemTimeFormat?: string | null;
  logoUrl?: string | null;
  industry?: string | null;
  numberOfEmployees?: string | null;
  phoneNumber?: string | null;
  primaryAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  companyOverviewWebsite?: string | null;
  adminFirstName?: string | null;
  adminLastName?: string | null;
  adminJobTitle?: string | null;
  adminPhone?: string | null;
  adminEmail?: string | null;
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
      if (body.industry != null) formData.append("Industry", body.industry);
      if (body.numberOfEmployees != null) formData.append("NumberOfEmployees", body.numberOfEmployees);
      if (body.phoneNumber != null) formData.append("PhoneNumber", body.phoneNumber);
      if (body.primaryAddress != null) formData.append("PrimaryAddress", body.primaryAddress);
      if (body.city != null) formData.append("City", body.city);
      if (body.state != null) formData.append("State", body.state);
      if (body.zipCode != null) formData.append("ZipCode", body.zipCode);
      if (body.country != null) formData.append("Country", body.country);
      if (body.companyOverviewWebsite != null) formData.append("CompanyOverviewWebsite", body.companyOverviewWebsite);
      if (body.adminFirstName != null) formData.append("AdminFirstName", body.adminFirstName);
      if (body.adminLastName != null) formData.append("AdminLastName", body.adminLastName);
      if (body.adminJobTitle != null) formData.append("AdminJobTitle", body.adminJobTitle);
      if (body.adminPhone != null) formData.append("AdminPhone", body.adminPhone);
      if (body.adminEmail != null) formData.append("AdminEmail", body.adminEmail);
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
