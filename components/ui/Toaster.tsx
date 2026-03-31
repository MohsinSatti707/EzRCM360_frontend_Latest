"use client";

import { useToast } from "@/lib/contexts/ToastContext";
import { X } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 shadow-lg ${
            t.variant === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : t.variant === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="text-sm font-medium">{t.message}</p>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="ml-2 rounded p-1 opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
