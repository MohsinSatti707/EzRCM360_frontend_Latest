"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./Select";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

function generatePages(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (currentPage > 3) pages.push("...");
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 2) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);
  return pages;
}

export function Pagination({
  pageNumber,
  totalPages,
  totalCount,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
  className = "",
}: PaginationProps) {
  const pages = generatePages(pageNumber, totalPages);
  const filteredCount = totalCount;

  const handlePageClick = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else if (page < pageNumber) {
      onPrevious();
    } else if (page > pageNumber) {
      onNext();
    }
  };

  return (
    <div
      className={cn(
        "mt-0 flex items-center justify-between",
        className,
      )}
    >
      {/* Left: Results count - matches design: Result(s): X/Y */}
      <div className="font-aileron text-[14px] text-muted-foreground">
        Result(s): {filteredCount}/{totalCount}
      </div>

      {/* Center: Page numbers */}
      <div className="flex items-center gap-1">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F7F8F9] disabled:opacity-50 disabled:pointer-events-none transition-colors"
          disabled={!hasPreviousPage}
          onClick={onPrevious}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((page, idx) =>
          page === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-8 w-8 items-center justify-center font-aileron text-[14px] text-[#64748B]"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md font-aileron text-[14px] transition-colors",
                page === pageNumber
                  ? "bg-[#0066CC]/10 text-[#0066CC] font-medium"
                  : "text-[#64748B] hover:bg-[#F7F8F9]",
              )}
            >
              {page}
            </button>
          ),
        )}

        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F7F8F9] disabled:opacity-50 disabled:pointer-events-none transition-colors"
          disabled={!hasNextPage}
          onClick={onNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Right: Items per page - design: text-foreground */}
      <div className="flex items-center gap-2">
        <span className="font-aileron text-[14px] text-foreground">
          Show per page
        </span>
        <Select
          value={String(pageSize)}
          onValueChange={(val) => onPageSizeChange?.(Number(val))}
        >
          <SelectTrigger className="w-[70px] h-9 border-[#E2E8F0] rounded-[5px] font-aileron text-[14px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white z-50">
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
