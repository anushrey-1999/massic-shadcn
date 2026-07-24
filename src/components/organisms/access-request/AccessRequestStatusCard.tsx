"use client";

import { AlertTriangle, Check, Clock, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatusCardTone = "loading" | "error" | "expired" | "completed";

interface AccessRequestStatusCardProps {
  tone: StatusCardTone;
  title: string;
  description: ReactNode;
  className?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function StatusIcon({ tone }: { tone: StatusCardTone }) {
  if (tone === "loading") return <Loader2 className="h-6 w-6 animate-spin text-general-primary" />;
  if (tone === "completed") return <Check className="h-6 w-6 text-green-600" />;
  if (tone === "expired") return <Clock className="h-6 w-6 text-orange-600" />;
  return <AlertTriangle className="h-6 w-6 text-red-600" />;
}

function iconClassName(tone: StatusCardTone) {
  if (tone === "completed") return "bg-green-100";
  if (tone === "expired") return "bg-orange-100";
  if (tone === "loading") return "bg-general-primary/10";
  return "bg-red-100";
}

export function AccessRequestStatusCard({
  tone,
  title,
  description,
  className,
  actionLabel,
  onAction,
}: AccessRequestStatusCardProps) {
  return (
    <div className={cn("flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4", className)}>
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="space-y-4 pb-8 pt-8 text-center">
          <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-full", iconClassName(tone))}>
            <StatusIcon tone={tone} />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
          {actionLabel && onAction && (
            <Button variant="outline" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
