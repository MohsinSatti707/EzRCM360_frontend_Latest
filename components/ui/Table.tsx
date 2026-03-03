"use client";

import { cn } from "@/lib/utils";

/** Matches design table.tsx: border-b, hover:bg-muted/50, h-12 px-4 head, p-4 cell */
export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="relative w-full overflow-auto rounded-lg border border-border bg-card">
      <table className={cn("w-full caption-bottom text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <thead className={cn("[&_tr]:border-b", className)}>{children}</thead>;
}

export function TableBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)}>{children}</tbody>;
}

export function TableRow({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <tr
      className={cn("border-b border-border transition-colors hover:bg-muted/50", className)}
      style={style}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        align === "right" && "text-right",
        className
      )}
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
      className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 text-foreground", align === "right" && "text-right", className)}
    >
      {children}
    </td>
  );
}
