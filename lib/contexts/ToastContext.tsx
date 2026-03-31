"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastItem[];
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `toast-${idCounter}-${Date.now()}`;
}

const AUTO_DISMISS_MS = 5000;
// Approximate single-line length; messages longer than this are considered "long"
const LONG_MESSAGE_THRESHOLD = 80;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timeoutsRef.current.get(id);
    if (t) clearTimeout(t);
    timeoutsRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: ToastVariant) => {
      // Deduplicate: skip if an identical message + variant toast already exists
      setToasts((prev) => {
        if (prev.some((t) => t.message === message && t.variant === variant)) return prev;
        const id = nextId();
        // Long error messages stay until manually dismissed; short ones auto-dismiss
        const isLong = message.length > LONG_MESSAGE_THRESHOLD;
        if (!(variant === "error" && isLong)) {
          const t = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
          timeoutsRef.current.set(id, t);
        }
        return [...prev, { id, message, variant }];
      });
    },
    [dismiss]
  );

  const success = useCallback((message: string) => addToast(message, "success"), [addToast]);
  const error = useCallback((message: string) => addToast(message, "error"), [addToast]);
  const warning = useCallback((message: string) => addToast(message, "warning"), [addToast]);

  const value: ToastContextValue = { toasts, success, error, warning, dismiss };
  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
