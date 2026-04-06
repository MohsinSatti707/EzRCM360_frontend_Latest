"use client";

import Image from "next/image";
import { X, ArrowRight } from "lucide-react";
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
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  children?: React.ReactNode;
  icon?: { src: string; alt: string };
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading,
  children,
  icon,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="bg-white rounded-lg max-w-[480px] p-0 gap-0">
        {/* Header with title and close button */}
        <AlertDialogHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <AlertDialogTitle className="font-aileron font-bold text-[18px] text-[#202830]">
            {title}
          </AlertDialogTitle>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-sm p-1 text-[#64748B] hover:text-[#202830] transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </AlertDialogHeader>

        {/* Icon */}
        <div className="flex justify-center py-4">
          <Image
            src="/icons/svg/delete.svg"
            alt="Delete"
            width={80}
            height={80}
          />
        </div>

        {/* Message */}
        <AlertDialogDescription className="font-aileron text-[14px] text-[#64748B] text-center px-6 pb-4">
          {message}
        </AlertDialogDescription>

        {children}

        {/* Footer */}
        <AlertDialogFooter className="flex flex-row justify-start gap-3 sm:justify-start px-6 py-4 border-t border-[#E2E8F0]">
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={
              variant === "danger"
                ? "h-10 rounded-[5px] px-[18px] py-3 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
                : "h-10 rounded-[5px] px-[18px] py-3 bg-[#0066CC] hover:bg-[#0066CC]/90 text-white font-aileron text-[14px]"
            }
          >
            {loading ? "..." : (
              <span className="flex items-center gap-1">
                {confirmLabel} <ArrowRight className="h-4 w-4" />
              </span>
            )}
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
