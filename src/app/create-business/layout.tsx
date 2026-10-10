import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("createBusiness"),
};

export default function CreateBusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
