"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function FreeBusinessSignupTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-svh bg-general-primary-foreground px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <div className="flex items-center justify-center">
          <img
            src="/massic-logo-green.svg"
            alt="Massic"
            className="h-8 w-auto"
          />
        </div>

        <Card className="gap-0 overflow-hidden rounded-lg border-general-border-three bg-white py-0 shadow-xs">
          {children}
        </Card>
      </div>
    </main>
  );
}
