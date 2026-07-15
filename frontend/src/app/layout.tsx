import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MealHQ",
  description: "Provider and consumer portal for tiffin deliveries",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
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
