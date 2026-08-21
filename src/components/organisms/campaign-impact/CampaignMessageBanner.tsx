import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface CampaignMessageBannerProps {
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  variant?: "default" | "info" | "warning" | "destructive";
  className?: string;
}

export function CampaignMessageBanner({
  title,
  description,
  icon: Icon,
  variant = "default",
  className,
}: CampaignMessageBannerProps) {
  return (
    <Alert variant={variant} className={cn("flex items-start gap-3", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <AlertTitle className="leading-5">{title}</AlertTitle>
        <AlertDescription className="mt-0.5 leading-5">{description}</AlertDescription>
      </div>
    </Alert>
  );
}
