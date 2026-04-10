"use client";

import { DrawerForm } from "@/components/ui/DrawerForm";
import { DrawerFooter } from "@/components/ui/ModalFooter";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { NativeSelect as Select } from "@/components/ui/Select";
import type { CreateFacilityRequest } from "@/lib/services/facilities";
import type { EntityLookupDto } from "@/lib/services/lookups";

function entityToOption(e: EntityLookupDto) {
  return { value: e.id, label: e.displayName };
}

export interface FacilityFormModalProps {
  open: boolean;
  onClose: () => void;
  editId: string | null;
  form: CreateFacilityRequest;
  onFormChange: (form: CreateFacilityRequest) => void;
  entities: EntityLookupDto[];
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

export function FacilityFormModal({
  open,
  onClose,
  editId,
  form,
  onFormChange,
  entities,
  onSubmit,
  loading,
  error,
}: FacilityFormModalProps) {
  const entityOptions = entities.map(entityToOption);

  return (
    <DrawerForm
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={editId ? "Edit Facility" : "Add Facility"}
      footer={
        <DrawerFooter
          onCancel={onClose}
          submitLabel={editId ? "Update" : "Add Facility"}
          onSubmit={onSubmit}
          loading={loading}
          className="p-0"
        />
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <div className="space-y-4">
          <Input
            label="Facility Name"
            required
            placeholder="e.g., City Care Clinic"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
          />
          <Input
            label="Facility Type"
            required
            placeholder="e.g., Clinic"
            value={form.facilityType}
            onChange={(e) => onFormChange({ ...form, facilityType: e.target.value })}
          />
          <Input
            label="Physical Address"
            placeholder="e.g., 123 Main St, NY 10001"
            value={form.addressLine1 ?? ""}
            onChange={(e) => onFormChange({ ...form, addressLine1: e.target.value })}
          />
          <Select
            label="Linked Entity"
            required
            options={entityOptions}
            value={form.entityId}
            onChange={(e) => onFormChange({ ...form, entityId: e.target.value })}
          />
          <Input
            label="POS Code"
            placeholder="e.g., POS #11"
            value={form.posCode ?? ""}
            onChange={(e) => onFormChange({ ...form, posCode: e.target.value })}
          />
        </div>
      </form>
    </DrawerForm>
  );
}
