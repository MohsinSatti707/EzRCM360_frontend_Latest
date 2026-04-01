"use client";

import { DrawerForm } from "@/components/ui/DrawerForm";
import { DrawerFooter } from "@/components/ui/ModalFooter";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { NativeSelect as Select } from "@/components/ui/Select";
import type { CreateModifierCommand } from "@/lib/services/modifiers";
import type { SelectOption } from "@/components/ui/Select";

const MAX_MODIFIER_CODE_LENGTH = 25;

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
  const modifierCodeOverLimit = form.modifierCode.length > MAX_MODIFIER_CODE_LENGTH;

  return (
    <DrawerForm
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={editId ? "Edit Modifier" : "Add Modifier"}
      footer={
        <DrawerFooter
          onCancel={onClose}
          submitLabel={editId ? "Update" : "Create"}
          onSubmit={onSubmit}
          loading={loading}
          disabled={modifierCodeOverLimit}
          className="p-0"
        />
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {modifierCodeOverLimit && (
          <div className="mb-4">
            <Alert variant="error">
              {`The length of 'Modifier Code' must be ${MAX_MODIFIER_CODE_LENGTH} characters or fewer. You entered ${form.modifierCode.length} characters.`}
            </Alert>
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <div className="flex flex-col gap-4">
          <Input
            label="Modifier code"
            required
            value={form.modifierCode}
            onChange={(e) => onFormChange({ ...form, modifierCode: e.target.value })}
            inputClassName="rounded-[5px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          />
          <Select
            label="Modifier type"
            options={MODIFIER_TYPE_OPTIONS}
            value={form.modifierType}
            onChange={(e) => onFormChange({ ...form, modifierType: Number(e.target.value) })}
            selectClassName="rounded-[5px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          />
          <Input
            label="Description"
            required
            value={form.description}
            onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            inputClassName="rounded-[5px] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
          />
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 mt-1">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => onFormChange({ ...form, isActive: e.target.checked })}
              className="h-5 w-5 rounded border-input"
            />
            <span className="text-sm text-foreground">Active</span>
          </label>
        </div>
      </form>
    </DrawerForm>
  );
}
