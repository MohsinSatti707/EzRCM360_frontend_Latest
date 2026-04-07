"use client";

import Image from "next/image";
import { useToast } from "@/lib/contexts/ToastContext";
import { X, XCircle } from "lucide-react";

const ACCENT_COLOR = {
  success: "bg-[#0066CC]",
  error: "bg-red-500",
  warning: "bg-amber-500",
} as const;

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2"
      aria-live="polite"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="w-[400px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-lg"
        >
          {/* Top accent bar */}
          <div className={`h-[3px] ${ACCENT_COLOR[t.variant]}`} />

          {/* Title row */}
          <div className="flex items-center gap-3 px-4 py-3">
            {t.variant === "success" ? (
              <Image
                src="/icons/svg/success-check.svg"
                alt="Success"
                width={22}
                height={22}
                className="shrink-0"
              />
            ) : (
              <XCircle className="h-[22px] w-[22px] shrink-0 text-red-500" />
            )}
            <p className="flex-1 min-w-0 font-aileron text-[14px] font-bold text-[#202830]">
              {t.title}
            </p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-[#64748B] hover:text-[#202830] transition-colors focus:outline-none"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description */}
          {t.description && (
            <div className="border-t border-[#E2E8F0] px-4 py-3">
              <p className="font-aileron text-[13px] text-[#64748B]">
                {t.description}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
