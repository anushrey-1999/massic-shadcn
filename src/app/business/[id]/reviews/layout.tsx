import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("businessReviews"),
};

export default function BusinessReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
