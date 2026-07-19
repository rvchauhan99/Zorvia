import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Account",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
