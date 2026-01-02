import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("businessProfile"),
};

export default function BusinessProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
