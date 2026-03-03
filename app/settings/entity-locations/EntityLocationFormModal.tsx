"use client";

import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CreateEntityLocationRequest } from "@/lib/services/entityLocations";
import type { EntityLookupDto } from "@/lib/services/lookups";

function entityToOption(e: EntityLookupDto) {
  return { value: e.id, label: e.displayName };
}

export interface EntityLocationFormModalProps {
  open: boolean;
  onClose: () => void;
  editId: string | null;
  form: CreateEntityLocationRequest;
  onFormChange: (form: CreateEntityLocationRequest) => void;
  entities: EntityLookupDto[];
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

export function EntityLocationFormModal({
  open,
  onClose,
  editId,
  form,
  onFormChange,
  entities,
  onSubmit,
  loading,
  error,
}: EntityLocationFormModalProps) {
  const entityOptions = entities.map(entityToOption);

  return (
    <Modal open={open} onClose={onClose} title={editId ? "Edit location" : "Add location"} size="md">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <div className="space-y-4">
          <Select
            label="Entity"
            required
            options={entityOptions}
            value={form.entityId}
            onChange={(e) => onFormChange({ ...form, entityId: e.target.value })}
          />
          <Input
            label="Location name"
            required
            value={form.locationName}
            onChange={(e) => onFormChange({ ...form, locationName: e.target.value })}
          />
          <Input
            label="Location type"
            required
            value={form.locationType}
            onChange={(e) => onFormChange({ ...form, locationType: e.target.value })}
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
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => onFormChange({ ...form, isActive: e.target.checked })}
              className="rounded border-input"
            />
            <span className="text-sm text-foreground">Active</span>
          </label>
        </div>
        <ModalFooter
          onCancel={onClose}
          submitLabel={editId ? "Update" : "Create"}
          onSubmit={onSubmit}
          loading={loading}
        />
      </form>
    </Modal>
  );
}
