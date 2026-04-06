"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_TOKEN_KEY } from "@/lib/env";
import { Loader } from "@/components/ui/Loader";

const PUBLIC_PATHS = ["/login", "/set-password", "/authentication/verify", "/authentication/setup"];
const LOGIN_PATH = "/login";

function isPublicPath(pathname: string | null) {
  if (!pathname) return false;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Protects all routes. When user has no auth token and visits a non-public path,
 * redirects to login. Prevents access to any page after logout.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(() => isPublicPath(pathname));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const publicPath = isPublicPath(pathname);

    if (!token && !publicPath) {
      router.replace(LOGIN_PATH);
      return;
    }

    setAllowed(true);
  }, [pathname, router]);

  if (isPublicPath(pathname)) return <>{children}</>;
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader variant="page" label="Loading" />
      </div>
    );
  }
  return <>{children}</>;
}
