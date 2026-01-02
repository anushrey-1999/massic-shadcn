import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("businessStrategy"),
};

export default function BusinessStrategyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
