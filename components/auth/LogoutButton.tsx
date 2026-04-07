"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  MFA_USER_ID_KEY,
  MFA_SETUP_USER_ID_KEY,
  MFA_VERIFIED_KEY,
  AUTH_COOKIE,
} from "@/lib/env";
import { getApiUrl } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Logout button that clears auth state and redirects to login.
 * Calls backend logout API to revoke tokens, then clears local storage.
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
    if (token) {
      try {
        await fetch(getApiUrl("/api/Auth/logout"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Ignore - clear storage anyway
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(MFA_USER_ID_KEY);
      sessionStorage.removeItem(MFA_SETUP_USER_ID_KEY);
      sessionStorage.removeItem(MFA_VERIFIED_KEY);
      document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
    }
    setLoading(false);
    router.replace("/login");
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        Logout
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleLogout}
        title="Logout"
        message="Are you sure you want to logout of this device?"
        confirmLabel="Yes, Logout"
        cancelLabel="No, Stay Here"
        variant="primary"
        loading={loading}
        icon={{ src: "/icons/svg/logout.svg", alt: "Logout" }}
      />
    </>
  );
}
