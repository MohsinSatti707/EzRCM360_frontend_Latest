"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "warning";

export interface ToastItem {
  id: string;
  title: string;
  description?: React.ReactNode;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastItem[];
  success: (title: string, description?: React.ReactNode) => void;
  error: (title: string, description?: React.ReactNode) => void;
  warning: (title: string, description?: React.ReactNode) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `toast-${idCounter}-${Date.now()}`;
}

const AUTO_DISMISS_MS = 5000;
const LONG_AUTO_DISMISS_MS = 45000;
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
    (title: string, variant: ToastVariant, description?: React.ReactNode) => {
      // Deduplicate: skip if an identical title + variant toast already exists
      setToasts((prev) => {
        if (prev.some((t) => t.title === title && t.variant === variant)) return prev;
        const id = nextId();
        const isLong = variant === "error" && title.length > LONG_MESSAGE_THRESHOLD;
        const delay = isLong ? LONG_AUTO_DISMISS_MS : AUTO_DISMISS_MS;
        const t = setTimeout(() => dismiss(id), delay);
        timeoutsRef.current.set(id, t);
        return [...prev, { id, title, description, variant }];
      });
    },
    [dismiss]
  );

  const success = useCallback((title: string, description?: React.ReactNode) => addToast(title, "success", description), [addToast]);
  const error = useCallback((title: string, description?: React.ReactNode) => addToast(title, "error", description), [addToast]);
  const warning = useCallback((title: string, description?: React.ReactNode) => addToast(title, "warning", description), [addToast]);

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
