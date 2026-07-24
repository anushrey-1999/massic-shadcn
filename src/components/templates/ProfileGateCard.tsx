"use client";

import React from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function ProfileGateCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "w-full overflow-hidden rounded-lg border border-general-border-three bg-white shadow-none",
        className
      )}
    >
      <div className="w-full border-b border-general-border-three bg-general-primary-foreground px-6 py-6">
        <CardTitle className="text-2xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-foreground">
          {title}
        </CardTitle>
        <Typography className="mt-1 text-xs font-normal leading-normal text-general-muted-foreground">
          {description}
        </Typography>
      </div>
      <CardContent className="px-6 py-6">{children}</CardContent>
    </Card>
  );
}

