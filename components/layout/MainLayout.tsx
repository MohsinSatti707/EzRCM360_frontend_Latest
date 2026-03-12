"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AppFooter } from "./AppFooter";
import { NavigationProgress } from "./NavigationProgress";
import { SidebarProvider, useSidebarOptional } from "@/lib/contexts/SidebarContext";

function MainContent({ children }: { children: React.ReactNode }) {
  const sidebar = useSidebarOptional();
  const collapsed = sidebar?.collapsed ?? false;
  return (
    <div
      className={`flex h-screen flex-col overflow-hidden transition-[padding] duration-200 ease-in-out ${collapsed ? "pl-12" : "pl-64"}`}
    >
      <Header />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-4 px-6 pb-2">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">{children}</div>
      </main>
      <AppFooter />
    </div>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <NavigationProgress />
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
