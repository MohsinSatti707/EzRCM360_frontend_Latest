"use client";

import { cn } from "@/lib/utils";

type OverlayLoaderProps = {
  visible: boolean;
  label?: string;
};

const dotSize = "h-3 w-3";

export function OverlayLoader({ visible, label = "Processing…" }: OverlayLoaderProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white px-8 py-6 shadow-lg dark:bg-neutral-800">
        <div className="flex items-center gap-1.5" role="status" aria-label={label}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn("rounded-full bg-primary animate-bounce-dot", dotSize)}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="font-aileron text-sm font-medium text-foreground">{label}</p>
      </div>
    </div>
  );
}
