import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { absolute: "Massic Access Request" },
  description: "Review and grant Massic access to your Google products.",
};

export default function AccessRequestLayout({ children }: { children: ReactNode }) {
  return children;
}
