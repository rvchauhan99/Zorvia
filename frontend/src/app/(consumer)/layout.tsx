import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";
import ConsumerShell from "./ConsumerShell";

export const metadata: Metadata = {
  ...noIndexMetadata,
  title: "Consumer",
};

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return <ConsumerShell>{children}</ConsumerShell>;
}
