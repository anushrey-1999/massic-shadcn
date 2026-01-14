import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("businessWeb"),
};

export default function BusinessWebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
