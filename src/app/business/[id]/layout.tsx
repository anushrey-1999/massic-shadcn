import * as React from "react";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return children;
}
