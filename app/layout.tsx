import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProviderWithToaster } from "@/components/providers/ToastProviderWithToaster";
import { ApiAuthProvider } from "@/components/providers/ApiAuthProvider";
import { PermissionsProvider } from "@/lib/contexts/PermissionsContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Aileron loaded via @import in globals.css from fonts.cdnfonts.com

export const metadata: Metadata = {
  title: "EzRCM360 - Settings & Configurations",
  description: "Settings and configurations portal for EzRCM360",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <ToastProviderWithToaster>
          <ApiAuthProvider>
            <AuthGuard>
              <PermissionsProvider>{children}</PermissionsProvider>
            </AuthGuard>
          </ApiAuthProvider>
        </ToastProviderWithToaster>
      </body>
    </html>
  );
}
