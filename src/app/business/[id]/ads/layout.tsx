import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("businessAds"),
};

export default function BusinessAdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
