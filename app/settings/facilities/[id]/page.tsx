"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, User, FileText } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { OverlayLoader } from "@/components/ui/OverlayLoader";
import { useToast } from "@/lib/contexts/ToastContext";
import { useModulePermission } from "@/lib/contexts/PermissionsContext";
import { AccessRestrictedContent } from "@/components/auth/AccessRestrictedContent";
import { facilitiesApi } from "@/lib/services/facilities";
import { lookupsApi } from "@/lib/services/lookups";
import { FacilityFormModal } from "../FacilityFormModal";
import type { FacilityDetailDto, CreateFacilityRequest, UpdateFacilityRequest } from "@/lib/services/facilities";
import type { EntityLookupDto } from "@/lib/services/lookups";

const MODULE_NAME = "Facilities";

const STATUS_OPTIONS = [
  { value: 1, name: "Active" },
  { value: 0, name: "Inactive" },
];

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "-";
  }
}

export default function FacilityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = typeof params.id === "string" ? params.id : "";
  const { canView, canUpdate, loading: permLoading } = useModulePermission(MODULE_NAME);

  const [facility, setFacility] = useState<FacilityDetailDto | null>(null);
  const [entities, setEntities] = useState<EntityLookupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateFacilityRequest>({
    name: "",
    facilityType: "",
    addressLine1: "",
    addressLine2: "",
    zipCode: "",
    entityId: "",
    posCode: "",
    isActive: true,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [overlayLoading, setOverlayLoading] = useState(false);

  const fetchFacility = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await facilitiesApi().getById(id);
      setFacility(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load facility details.";
      setError(msg);
      toast.error("Load Failed", msg);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchFacility();
  }, [fetchFacility]);

  useEffect(() => {
    lookupsApi().getEntities().then(setEntities).catch(() => setEntities([]));
  }, []);

  const openEdit = () => {
    if (!facility) return;
    setFormError(null);
    setForm({
      name: facility.name,
      facilityType: facility.facilityType,
      addressLine1: facility.addressLine1 ?? "",
      addressLine2: facility.addressLine2 ?? "",
      zipCode: facility.zipCode ?? "",
      entityId: facility.entityId,
      posCode: facility.posCode ?? "",
      isActive: facility.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    if (!form.name.trim() || !form.facilityType.trim() || !form.entityId) {
      setFormError("Name, facility type, and entity are required.");
      return;
    }
    setSubmitLoading(true);
    setOverlayLoading(true);
    try {
      await facilitiesApi().update(id, { ...form, isActive: form.isActive ?? true } as UpdateFacilityRequest);
      setModalOpen(false);
      await fetchFacility();
      toast.success("Facility Updated", <>The facility, <strong>{form.name}</strong>, has been updated successfully.</>);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setFormError(msg);
      toast.error("Save Failed", msg);
    } finally {
      setSubmitLoading(false);
      setOverlayLoading(false);
    }
  }, [id, form, fetchFacility, toast]);

  const handleStatusChange = async (newStatus: string) => {
    if (!facility) return;
    const isActive = newStatus === "1";
    if (isActive === facility.isActive) return;
    try {
      setStatusUpdating(true);
      await facilitiesApi().update(id, {
        name: facility.name,
        facilityType: facility.facilityType,
        addressLine1: facility.addressLine1 ?? null,
        addressLine2: facility.addressLine2 ?? null,
        zipCode: facility.zipCode ?? null,
        entityId: facility.entityId,
        posCode: facility.posCode ?? null,
        isActive,
      });
      setFacility((prev) => prev ? { ...prev, isActive } : prev);
      toast.success("Status Updated", <>Status for <strong>{facility.name}</strong> has been updated.</>);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error("Update Failed", msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (permLoading || loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6">
        <AccessRestrictedContent />
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground">{error ?? "Facility not found."}</p>
        <Button
          onClick={() => router.push("/settings/facilities")}
          className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]"
        >
          Back to Facilities
        </Button>
      </div>
    );
  }

  const initials = getInitials(facility.name);
  const entityDisplayName =
    facility.entityDisplayName ??
    entities.find((e) => e.id === facility.entityId)?.displayName ??
    "-";
  const physicalAddress = [facility.addressLine1, facility.addressLine2, facility.zipCode]
    .filter(Boolean)
    .join(", ") || "-";

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6">
      {/* Breadcrumb */}
      <div className="mb-5">
        <nav className="-mx-6 mb-4 flex items-center gap-2 bg-[#F7F8F9] px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Link href="/settings" className="transition-colors hover:text-foreground">
            Settings &amp; Configurations
          </Link>
          <span aria-hidden>/</span>
          <Link href="/settings/facilities" className="transition-colors hover:text-foreground">
            Facility Configuration
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{facility.name}</span>
        </nav>
      </div>

      {/* Page Title */}
      <h1 className="mb-4 font-aileron text-[24px] font-bold text-[#202830]">
        Facility Configuration Details
      </h1>

      {/* Header Card */}
      <Card className="mb-6 p-6 bg-[#F7F8F9]">
        <div className="flex items-center justify-between">
          {/* Left: avatar + name + type + entity */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DBEAFE] text-lg font-bold text-[#3B82F6] font-aileron">
              {initials}
            </div>
            <div>
              <h2 className="font-aileron text-[20px] font-bold leading-tight text-[#202830]">
                {facility.name}
              </h2>
              <div className="mt-1 flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[13px] text-[#64748B] font-aileron">
                  <User className="h-4 w-4" />
                  <span>{facility.facilityType || "-"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#64748B] font-aileron">
                  <FileText className="h-4 w-4" />
                  <span>{entityDisplayName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: status dropdown */}
          {canUpdate ? (
            <Select
              value={facility.isActive ? "1" : "0"}
              onValueChange={handleStatusChange}
              disabled={statusUpdating}
            >
              <SelectTrigger className="w-[140px] h-10 border-[#E2E8F0] rounded-[5px] font-aileron text-[14px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                facility.isActive
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {facility.isActive ? "Active" : "Inactive"}
            </span>
          )}
        </div>
      </Card>

      {/* General Information */}
      <Card className="mb-6 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Image src="/icons/svg/admin.svg" alt="" width={16} height={16} />
          <h2 className="font-aileron text-[16px] font-bold text-[#202830]">
            General Information
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-x-8 gap-y-6">
          <div>
            <p className="text-[12px] font-['Aileron'] font-medium text-[#64748B] tracking-wide">
              Facility Name
            </p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">
              {facility.name}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-['Aileron'] font-medium text-[#64748B] tracking-wide">
              Facility Type
            </p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">
              {facility.facilityType || "-"}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-['Aileron'] font-medium text-[#64748B] tracking-wide">
              Physical Address
            </p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">
              {physicalAddress}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-['Aileron'] font-medium text-[#64748B] tracking-wide">
              Linked Entity
            </p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">
              {entityDisplayName}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-['Aileron'] font-medium text-[#64748B] tracking-wide">
              POS Code
            </p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">
              {facility.posCode || "-"}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-['Aileron'] font-medium text-[#64748B] tracking-wide">
              Created At
            </p>
            <p className="mt-1 font-aileron text-[14px] font-medium text-[#202830]">
              {formatDate(facility.createdAt)}
            </p>
          </div>
        </div>

        {canUpdate && (
          <div className="mt-6">
            <Button
              onClick={openEdit}
              className="h-10 rounded-[5px] bg-[#0066CC] px-[18px] text-white hover:bg-[#0066CC]/90 font-aileron text-[14px]"
            >
              Edit <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>

      <FacilityFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editId={id}
        form={form}
        onFormChange={setForm}
        entities={entities}
        onSubmit={handleSubmit}
        loading={submitLoading}
        error={formError}
      />

      <OverlayLoader visible={overlayLoading} />
    </div>
  );
}
