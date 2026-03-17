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
        <div className="space-y-2">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
          />
          <Input
            label="Facility type"
            required
            value={form.facilityType}
            onChange={(e) => onFormChange({ ...form, facilityType: e.target.value })}
          />
          <Select
            label="Entity"
            required
            options={entityOptions}
            value={form.entityId}
            onChange={(e) => onFormChange({ ...form, entityId: e.target.value })}
          />
          <Input
            label="Physical address"
            value={form.physicalAddress ?? ""}
            onChange={(e) => onFormChange({ ...form, physicalAddress: e.target.value })}
          />
          <Input
            label="POS code"
            value={form.posCode ?? ""}
            onChange={(e) => onFormChange({ ...form, posCode: e.target.value })}
          />
          <label className="inline-flex w-fit cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              id="facility-active-checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => onFormChange({ ...form, isActive: e.target.checked })}
              className="h-5 w-5 rounded border-input mt-2"
            />
            <span className="text-sm text-foreground mt-2">Active</span>
          </label>
        </div>
      </form>
    </DrawerForm>
  );
}
