"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

interface ProfileStepCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
  scrollableContent?: boolean;
  contentClassName?: string;
}

export function ProfileStepCard({
  title,
  description,
  children,
  rightAction,
  className,
  scrollableContent = false,
  contentClassName,
}: ProfileStepCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-7 shadow-none overflow-hidden rounded-lg border border-general-border-three bg-white p-0 pb-6 min-h-0",
        className
      )}
    >
      <div className="flex shrink-0 items-start justify-between bg-general-primary-foreground border-b border-general-border-three px-6 py-6">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-2xl font-semibold leading-[1.2] tracking-[-0.02em] text-general-secondary-foreground">
            {title}
          </CardTitle>
          <Typography className="text-xs font-normal leading-normal text-general-muted-foreground">
            {description}
          </Typography>
        </div>
        {rightAction}
      </div>
      <CardContent
        className={cn(
          "flex flex-col gap-7 px-6",
          scrollableContent && "flex-1 min-h-0 overflow-y-auto",
          contentClassName
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
