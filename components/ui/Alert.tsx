"use client";

export type AlertVariant = "error" | "success" | "info";

export interface AlertProps {
  children: React.ReactNode;
  variant?: AlertVariant;
  className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  error: "border-red-200/80 bg-red-50/90 text-red-800",
  success: "border-emerald-200/80 bg-emerald-50/90 text-emerald-800",
  info: "border-border bg-muted/80 text-foreground",
};

export function Alert({ children, variant = "error", className = "" }: AlertProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${variantClasses[variant]} ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
}
