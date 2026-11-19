import * as React from "react";
import { BusinessShell } from "./business-shell";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <BusinessShell businessId={id}>{children}</BusinessShell>
  );
}
