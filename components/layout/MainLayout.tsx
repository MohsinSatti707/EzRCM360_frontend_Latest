import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { NavigationProgress } from "./NavigationProgress";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavigationProgress />
      <Sidebar />
      <div className="flex min-h-screen flex-col pl-64 transition-all duration-200">
        <Header />
        <main className="flex-1 p-6 sm:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
