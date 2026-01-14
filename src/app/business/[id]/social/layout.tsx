import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("businessSocial"),
};

export default function BusinessSocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
