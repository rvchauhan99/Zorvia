import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const SITE_URL = "https://www.mealhq.ca";
const TITLE = "MealHQ — Tiffin delivery OS for Canadian kitchens";
const DESCRIPTION =
  "MealHQ helps independent Canadian tiffin providers manage customers, daily delivery lists, Interac e-Transfer payments, and outstanding balances. Built for kitchens across Canada.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · MealHQ",
  },
  description: DESCRIPTION,
  applicationName: "MealHQ",
  authors: [{ name: "MealHQ" }],
  creator: "MealHQ",
  publisher: "MealHQ",
  keywords: [
    "tiffin software Canada",
    "tiffin delivery management",
    "Interac e-Transfer meals",
    "meal delivery kitchen software",
    "Canadian tiffin business",
    "MealHQ",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
    siteName: "MealHQ",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/brand/mealhq-logo-horizontal.png",
        width: 1200,
        height: 630,
        alt: "MealHQ — Tiffin delivery OS for Canadian kitchens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/brand/mealhq-logo-horizontal.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
  // Meta Business Suite → Domains (facebook-domain-verification)
  verification: {
    other: {
      "facebook-domain-verification": "kcn14zlmqys0wihict4e1ojr7lbxix",
    },
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
    <html lang="en-CA" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <GoogleAnalytics />
          {children}
          <Toaster position="top-center" richColors closeButton offset="calc(0.75rem + env(safe-area-inset-top, 0px))" />
        </AuthProvider>
      </body>
    </html>
  );
}
