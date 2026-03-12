"use client";

import { Loader2 } from "lucide-react";

type OverlayLoaderProps = {
  visible: boolean;
  label?: string;
};

export function OverlayLoader({ visible, label = "Processing…" }: OverlayLoaderProps) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-8 py-6 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066CC]" />
        <p className="font-aileron text-sm font-medium text-[#202830]">{label}</p>
      </div>
    </div>
  );
}
