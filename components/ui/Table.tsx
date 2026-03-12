"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="rounded-[5px]">
      <table className={cn("w-full table-fixed caption-bottom text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <thead className={cn("[&_tr]:border-b", className)}>{children}</thead>
  );
}

export function TableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)}>
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className,
  style,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn(
        "border-b border-[#E2E8F0] transition-colors hover:bg-[#F7F8F9] [thead_&]:hover:bg-transparent",
        className,
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  children,
  align = "left",
  className,
  onClick,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  onClick?: () => void;
}) {
  return (
    <th
      className={cn(
        "h-[44px] px-6 py-3 text-left align-middle bg-[#0066CC0D]  border-r border-[#E2E8F0] last:border-r-0 first:rounded-tl-[5px] first:rounded-bl-[5px] first:min-w-[130px] last:rounded-tr-[5px] last:rounded-br-[5px] font-aileron font-bold text-[13px] leading-none text-[#0066CC]",
        align === "right" && "text-right",
        onClick && "cursor-pointer select-none",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  align = "left",
  className,
  colSpan,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "h-[52px] px-6 py-4 align-middle font-aileron text-[14px] leading-[1.5] text-[#64748B] border-b border-r border-[#E2E8F0] last:border-r-0 min-w-0 overflow-hidden",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}
