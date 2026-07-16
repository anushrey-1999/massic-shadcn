import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdminCacheState, AdminSourceFreshness } from "../types";

export function AdminPageHeader({
  title,
  description,
  cacheState,
  actions,
  icon,
}: {
  title: string;
  description: string;
  freshnessDate?: string | null;
  sourceFreshness?: AdminSourceFreshness;
  cacheState?: AdminCacheState;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative mb-5 flex flex-col gap-4 border-b border-general-border/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <span
        className="absolute -bottom-px left-0 h-px w-24 bg-linear-to-r from-general-primary to-transparent"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {icon || (
            <span
              className="h-5 w-1 rounded-full bg-general-primary"
              aria-hidden="true"
            />
          )}
          <h1 className="text-[18px] font-medium leading-7 text-general-foreground">
            {title}
          </h1>
          <Badge
            variant="outline"
            className="rounded border-general-primary/15 bg-general-primary/5 text-[11px] font-normal text-general-primary"
          >
            Read-only
          </Badge>
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-5 text-general-muted-foreground">
          {description}
        </p>
        {cacheState === "stale" && (
          <span
            className="mt-2 flex items-center gap-1.5 text-xs text-amber-700"
            role="status"
          >
            <TriangleAlert className="size-3.5" />
            Showing cached data while live sources retry
          </span>
        )}
      </div>
      {actions && (
        <div className="admin-toolbar flex max-w-full shrink-0 flex-wrap items-center gap-1 self-start rounded-lg border p-1 shadow-xs sm:flex-nowrap sm:self-center [&_[data-slot=button]]:h-8 [&_[data-slot=button]]:border-0 [&_[data-slot=button]]:bg-transparent [&_[data-slot=button]]:shadow-none [&_[data-slot=button]]:hover:bg-general-primary/8 [&_[data-slot=select-trigger]]:h-8 [&_[data-slot=select-trigger]]:border-0 [&_[data-slot=select-trigger]]:bg-transparent [&_[data-slot=select-trigger]]:shadow-none">
          {actions}
        </div>
      )}
    </div>
  );
}
