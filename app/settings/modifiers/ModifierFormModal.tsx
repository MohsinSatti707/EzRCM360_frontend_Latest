"use client";

import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CreateModifierCommand } from "@/lib/services/modifiers";
import type { SelectOption } from "@/components/ui/Select";

const MODIFIER_TYPE_OPTIONS: SelectOption<number>[] = [
  { value: 0, label: "Procedure" },
  { value: 1, label: "Financial" },
  { value: 2, label: "Both" },
];

export interface ModifierFormModalProps {
  open: boolean;
  onClose: () => void;
  editId: string | null;
  form: CreateModifierCommand;
  onFormChange: (form: CreateModifierCommand) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

export function ModifierFormModal({
  open,
  onClose,
  editId,
  form,
  onFormChange,
  onSubmit,
  loading,
  error,
}: ModifierFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={editId ? "Edit modifier" : "Add modifier"} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Modifier code"
            required
            value={form.modifierCode}
            onChange={(e) => onFormChange({ ...form, modifierCode: e.target.value })}
          />
          <Select
            label="Modifier type"
            options={MODIFIER_TYPE_OPTIONS}
            value={form.modifierType}
            onChange={(e) => onFormChange({ ...form, modifierType: Number(e.target.value) })}
          />
          <div className="sm:col-span-2">
            <Input
              label="Description"
              required
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
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
