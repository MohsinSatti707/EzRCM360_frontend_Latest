"use client";

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
    <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
      <Button variant="secondary" onClick={onCancel} disabled={loading}>
        Cancel
      </Button>
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={loading}
        className="inline-flex items-center gap-2"
      >
        {loading ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}
