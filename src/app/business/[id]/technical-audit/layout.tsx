import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("businessTechnicalAudit"),
};

export default function BusinessTechnicalAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

