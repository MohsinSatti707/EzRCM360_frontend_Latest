"use client";

import * as React from "react";
import { Label } from "./Label";
import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: React.ReactNode;
  error?: string;
  wrapperClassName?: string;
  inputClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      wrapperClassName = "",
      inputClassName = "",
      id,
      required,
      ...rest
    },
    ref,
  ) => {
    const inputId =
      id ??
      (label && typeof label === "string"
        ? label.replace(/\s+/g, "-").toLowerCase()
        : undefined);

    return (
      <div className={wrapperClassName}>
        {label != null && (
          <Label htmlFor={inputId} required={required} className="mb-1.5">
            {label}
          </Label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-[39px] w-full rounded-[5px] border border-[#E2E8F0] bg-background px-4 font-aileron text-[14px] ring-offset-background transition-colors placeholder:text-[#94A3B8] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:opacity-100",
            error && "border-destructive focus-visible:ring-destructive/30",
            inputClassName,
          )}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
        {error && (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="mt-1 text-sm text-red-600"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
