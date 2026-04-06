import { apiRequest } from "@/lib/api";
import type { PaginatedList } from "@/lib/types";

/** API may return status as number (0/1) or string ("Active"/"Inactive") depending on serialization. */
export interface PayerListItemDto {
  id: string;
  payerName: string;
  aliases?: string | null;
  entityType: number;
  insuranceSubCategory?: number | null;
  status: number | string;
  organizationId: string;
  organizationName?: string | null;
}

// Detail response (GET by id)
export interface PayerAddressDto {
  id: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zip: string;
  label?: string | null;
}

export interface PayerPhoneDto {
  id: string;
  phoneNumber: string;
  label?: string | null;
}

export interface PayerEmailDto {
  id: string;
  emailAddress: string;
  label?: string | null;
}

export interface PayerDetailDto {
  id: string;
  organizationId?: string | null;
  payerName: string;
  aliases?: string | null;
  entityType: number;
  insuranceSubCategory?: number | null;
  /** API may return number (0/1) or string ("Active"/"Inactive"). */
  status: number | string;
  addresses: PayerAddressDto[];
  phoneNumbers: PayerPhoneDto[];
  emails: PayerEmailDto[];
  planIds: string[];
}

// Request shapes for create/update (API expects camelCase in JSON)
export interface PayerAddressRequest {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zip: string;
  label?: string | null;
}

export interface PayerPhoneRequest {
  phoneNumber: string;
  label?: string | null;
}

export interface PayerEmailRequest {
  emailAddress: string;
  label?: string | null;
}

export interface CreatePayerRequest {
  payerName: string;
  aliases?: string | null;
  entityType: number;
  insuranceSubCategory?: number | null;
  status?: number;
  planIds?: string[] | null;
  addresses?: PayerAddressRequest[] | null;
  phoneNumbers?: PayerPhoneRequest[] | null;
  emails?: PayerEmailRequest[] | null;
}

export interface UpdatePayerRequest {
  payerName: string;
  aliases?: string | null;
  entityType: number;
  insuranceSubCategory?: number | null;
  status: number;
  planIdsToAdd?: string[] | null;
  planIdsToRemove?: string[] | null;
  addresses?: PayerAddressRequest[] | null;
  phoneNumbers?: PayerPhoneRequest[] | null;
  emails?: PayerEmailRequest[] | null;
}

export function payersApi() {
  return {
    getList: (params?: {
      status?: number;
      search?: string;
      organizationId?: string;
      pageNumber?: number;
      pageSize?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.status != null) q.set("status", String(params.status));
      if (params?.search) q.set("search", params.search ?? "");
      if (params?.organizationId) q.set("OrganizationId", params.organizationId);
      if (params?.pageNumber != null) q.set("pageNumber", String(params.pageNumber));
      if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
      return apiRequest<PaginatedList<PayerListItemDto>>(`/api/Payers?${q}`);
    },
    getById: (id: string) =>
      apiRequest<PayerDetailDto>(`/api/Payers/${id}`),
    create: (body: CreatePayerRequest) =>
      apiRequest<string>("/api/Payers", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdatePayerRequest) =>
      apiRequest<void>(`/api/Payers/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      apiRequest<void>(`/api/Payers/${id}`, { method: "DELETE" }),
    bulkDelete: (ids: string[]) =>
      apiRequest<void>("/api/Payers/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  };
}
