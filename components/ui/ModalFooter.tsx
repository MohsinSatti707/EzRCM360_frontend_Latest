"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "./Button";

export interface ModalFooterProps {
  onCancel: () => void;
  submitLabel?: React.ReactNode;
  onSubmit: () => void;
  loading?: boolean;
}

export function ModalFooter({
  onCancel,
  submitLabel = "Save",
  onSubmit,
  loading,
}: ModalFooterProps) {
  return (
    <div className="flex justify-start gap-3 border-t border-border px-6 py-4">
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={loading}
        className="inline-flex items-center gap-2"
      >
        {loading ? "Saving…" : submitLabel}
      </Button>
      <Button variant="secondary" onClick={onCancel} disabled={loading}>
        Cancel
      </Button>
    </div>
  );
}

/** DrawerFooter: P2 pattern — primary action left, cancel right */
export function DrawerFooter({
  onCancel,
  submitLabel = "Save",
  onSubmit,
  loading,
}: ModalFooterProps) {
  return (
    <div className="flex justify-start gap-3 border-t border-[#E2E8F0] px-6 py-4">
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={loading}
        className="h-10 rounded-[5px] px-[18px] py-3 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
      >
        {loading ? "Saving…" : <>{submitLabel} <ArrowRight className="ml-1 h-4 w-4" /></>}
      </Button>
      <Button
        variant="outline"
        onClick={onCancel}
        disabled={loading}
        className="h-10 px-[18px] py-3 rounded-[5px] border-[#E2E8F0] font-aileron text-[14px] text-[#2A2C33]"
      >
        Cancel
      </Button>
    </div>
  );
}
