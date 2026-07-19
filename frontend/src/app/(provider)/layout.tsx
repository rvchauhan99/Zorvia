import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";
import ProviderShell from "./ProviderShell";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Provider",
};

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return <ProviderShell>{children}</ProviderShell>;
}
