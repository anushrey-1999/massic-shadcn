"use client";

import React from "react";
import PageHeader from "@/components/molecules/PageHeader";
import { cn } from "@/lib/utils";

export function CreateBusinessGateLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Create Business" },
  ];

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden max-md:fixed max-md:inset-0 max-md:z-50 max-md:bg-background">
      <div className="sticky top-0 z-10 shrink-0 bg-background">
        <PageHeader breadcrumbs={breadcrumbs} />
      </div>
      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div
          className={cn(
            "flex w-full max-w-[1224px] flex-1 items-center justify-center p-5",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
