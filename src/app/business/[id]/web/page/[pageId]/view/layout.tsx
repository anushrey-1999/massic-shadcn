import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("businessWebPageView"),
};

export default function WebPageViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
