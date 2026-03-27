"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./AlertDialog";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  children?: React.ReactNode;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  loading,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="bg-white rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-aileron font-bold text-[18px] text-[#202830]">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-aileron text-[14px] text-[#64748B]">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="flex flex-row justify-start gap-3 sm:justify-start">
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={
              variant === "danger"
                ? "h-10 rounded-[5px] px-[18px] py-3 bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-aileron text-[14px]"
                : "h-10 rounded-[5px] px-[18px] py-3 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            }
          >
            {loading ? "..." : confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={onClose}
            disabled={loading}
            className="h-10 px-[18px] py-3 rounded-[5px] border-[#E2E8F0] font-aileron text-[14px] text-[#2A2C33] mt-0"
          >
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
