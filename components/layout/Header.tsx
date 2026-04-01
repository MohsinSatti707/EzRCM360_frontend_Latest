"use client";

import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="sticky top-0 z-20 h-14 border-b border-border bg-background flex items-center justify-end px-6">
      <Button
        variant="ghost"
        className="relative flex items-center gap-2 text-muted-foreground hover:text-foreground bg-[#64748B0D] hover:bg-[#64748B1A]"
      >
        <Bell className="h-5 w-5" />
        <span className="hidden sm:inline">Notifications</span>
        <Badge
          variant="secondary"
          className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-muted-foreground text-white hover:bg-muted-foreground"
        >
          3
        </Badge>
      </Button>
    </header>
  );
}
