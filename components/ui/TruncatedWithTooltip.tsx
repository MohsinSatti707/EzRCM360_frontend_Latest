"use client";

import * as React from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

/** Renders truncated text and shows a tooltip with full content only when the text is actually truncated. */
export function TruncatedWithTooltip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      const truncated = el.scrollWidth > el.clientWidth;
      setIsTruncated(truncated);
    };

    const raf = requestAnimationFrame(() => {
      check();
    });
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [children]);

  const content = (
    <div
      ref={ref}
      className={cn(
        "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap",
        className,
      )}
    >
      {children}
    </div>
  );

  if (isTruncated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block min-w-0 w-full max-w-full cursor-default">
            {content}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-[100] max-w-[300px] break-words">
          {children}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
