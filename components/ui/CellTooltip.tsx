"use client";

import { useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function CellTooltip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleEnter = useCallback(() => {
    const el = textRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    setPos({
      top: rect.top + window.scrollY - 8,
      left: rect.left + window.scrollX + rect.width / 2,
    });

    setShow(true);
  }, []);

  const handleLeave = useCallback(() => setShow(false), []);

  return (
    <div
      className={cn("min-w-0", className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* OUTER → controls truncate */}
      <div className="truncate max-w-full">
        {/* INNER → real text width */}
        <span ref={textRef} className="inline-block">
          {text}
        </span>
      </div>

      {show &&
        createPortal(
          <div
            style={{ top: pos.top, left: pos.left }}
            className="pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full max-w-[500px] break-words whitespace-normal rounded-md bg-[#1E293B] px-3 py-1.5 text-xs text-white shadow-lg"
          >
            {text}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1E293B]" />
          </div>,
          document.body
        )}
    </div>
  );
}