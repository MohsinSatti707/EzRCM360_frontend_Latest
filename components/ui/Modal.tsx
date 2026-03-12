"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ModalFooter } from "./ModalFooter";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional footer (e.g. ModalFooter) rendered outside scroll so buttons stay fixed at bottom */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** "center" (default), "top-right", or "right" (full-height drawer flush top/right) */
  position?: "center" | "top-right" | "right";
}

export function Modal({ open, onClose, title, children, footer, size = "md", position = "center" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handle);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-lg";

  const positionClass =
    position === "top-right"
      ? "items-start justify-end pt-14 pb-4 pl-4"
      : position === "right"
        ? "items-stretch justify-end"
        : "items-center justify-center p-4";

  const dialogClass =
    position === "right"
      ? "relative h-full w-full max-w-[36rem] flex flex-col border border-r-0 border-card bg-card text-card-foreground shadow-xl animate-in slide-in-from-right duration-300"
      : `relative w-full ${sizeClass} max-h-[90vh] flex flex-col border bg-card text-card-foreground shadow-xl animate-scale-in`;

  const modalContent = (
    <div className={`fixed inset-0 z-[60] flex ${positionClass} animate-fade-in`}>
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-md" aria-hidden onClick={onClose} />
      <div
        className={dialogClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 id="modal-title" className="text-[20px] font-bold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">{children}</div>
        {footer != null && <div className="flex shrink-0">{footer}</div>}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}

export { ModalFooter } from "./ModalFooter";
