import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Zorvia",
  description: "Provider and consumer portal for tiffin deliveries",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Zorvia",
  },
};

export const viewport: Viewport = {
  themeColor: "#C45C26",
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
