import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MealHQ — Tiffin delivery OS for Canadian kitchens",
  description:
    "MealHQ helps independent tiffin providers manage customers, daily delivery lists, Interac e-Transfer payments, and outstanding balances. Customers track meals and balances. Sign in with Google uses your name and email to create your MealHQ account.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "MealHQ",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E8F8B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors closeButton offset="calc(0.75rem + env(safe-area-inset-top, 0px))" />
        </AuthProvider>
      </body>
    </html>
  );
}
