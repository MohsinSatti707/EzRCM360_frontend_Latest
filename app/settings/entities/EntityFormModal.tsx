"use client";

import { ArrowRight } from "lucide-react";
import { DrawerForm } from "@/components/ui/DrawerForm";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { CreateEntityRequest } from "@/lib/services/entities";

export interface EntityFormModalProps {
  open: boolean;
  onClose: () => void;
  editId: string | null;
  form: CreateEntityRequest;
  onFormChange: (form: CreateEntityRequest) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

export function EntityFormModal({
  open,
  onClose,
  editId,
  form,
  onFormChange,
  onSubmit,
  loading,
  error,
}: EntityFormModalProps) {
  return (
    <DrawerForm
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={editId ? "Update Entity" : "Add Entity"}
      footer={
        <div className="flex flex-1 justify-start gap-3">
          <Button
            type="submit"
            onClick={onSubmit}
            disabled={loading}
            className="h-10 rounded-[5px] px-[18px] py-3 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
          >
            {loading ? "Saving…" : (
              <>
                {editId ? "Update" : "Create"} <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="h-10 px-[18px] py-3 rounded-[5px] border-[#E2E8F0] font-aileron text-[14px] text-[#2A2C33]"
          >
            Cancel
          </Button>
        </div>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Entity Legal Name"
              required
              value={form.legalName}
              placeholder="e.g., MedixBilling Solutions"
              onChange={(e) => onFormChange({ ...form, legalName: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Entity Display Name"
              required
              value={form.displayName}
              placeholder="e.g., MedixBilling"
              onChange={(e) => onFormChange({ ...form, displayName: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Entity Group NPI"
              required
              value={form.groupNpi}
              placeholder="e.g., 1987654321"
              onChange={(e) => onFormChange({ ...form, groupNpi: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Entity Tax ID"
              required
              value={form.taxId}
              placeholder="e.g., 98-7654321"
              onChange={(e) => onFormChange({ ...form, taxId: e.target.value })}
            />
          </div>
        </div>
      </form>
    </DrawerForm>
  );
}
