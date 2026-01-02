import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...getPageMetadata("connectGoogle"),
};

export default function SigninGoogleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
