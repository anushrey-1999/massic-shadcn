"use client";

import * as React from "react";
import { ArrowLeft, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useMonitoringNotifications,
  useMonitoringOverview,
} from "@/hooks/use-monitoring";
import { MonitoringIncidentDetailView } from "./MonitoringIncidentDetail";
import { MonitoringMetricChart } from "./MonitoringMetricChart";
import { MonitoringOverviewView } from "./MonitoringOverview";
import {
  MonitoringError,
  MonitoringLoading,
  metricLabel,
} from "./monitoring-ui";

/**
 * The performance monitoring sheet.
 *
 * Read-only: everything shown here is state a daily engine run already decided and stored, so
 * the sheet never triggers a computation and never changes anything.
 *
 * One overview call feeds the whole surface. The two drill-in views fetch on demand and are
 * reached by pushing a view rather than by opening a second sheet, which keeps a single close
 * target and lets the back button return to exactly the tab the user came from.
 */

type MonitoringView =
  | { kind: "overview" }
  | { kind: "incident"; incidentId: string }
  | { kind: "metric"; metricKey: string };

interface MonitoringSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string | null;
  businessName: string;
}

export function MonitoringSheet({
  open,
  onOpenChange,
  businessId,
  businessName,
}: MonitoringSheetProps) {
  const [view, setView] = React.useState<MonitoringView>({ kind: "overview" });

  const overview = useMonitoringOverview(businessId, open);

  // Fetched on open rather than when the tab is selected, so the Notifications tab can show
  // how many there are without the user having to click it to find out.
  const notifications = useMonitoringNotifications(businessId, open);

  // A reopen should always land on the overview rather than resuming a drill-in the user has
  // long forgotten about.
  React.useEffect(() => {
    if (!open) return;
    setView({ kind: "overview" });
  }, [open, businessId]);

  const goals = overview.data?.goals ?? [];

  const title =
    view.kind === "metric"
      ? metricLabel(view.metricKey, goals)
      : view.kind === "incident"
        ? "Alert detail"
        : "Monitoring";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showClose={false}
        className="w-full gap-0 overflow-hidden border-l border-general-border p-0 sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 gap-0 border-b border-general-border bg-background px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {view.kind !== "overview" ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setView({ kind: "overview" })}
                aria-label="Back to monitoring"
                title="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}

            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base font-medium tracking-tight">
                {title}
              </SheetTitle>
              <p className="truncate text-xs text-muted-foreground">
                {businessName}
              </p>
            </div>

            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Close"
                title="Close"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {overview.isLoading ? (
            <MonitoringLoading label="Loading monitoring" />
          ) : overview.isError ? (
            <MonitoringError message={overview.error} />
          ) : view.kind === "incident" ? (
            <MonitoringIncidentDetailView
              incidentId={view.incidentId}
              goals={goals}
              onOpenIncident={(incidentId) =>
                setView({ kind: "incident", incidentId })
              }
              onOpenMetric={(metricKey) => setView({ kind: "metric", metricKey })}
            />
          ) : view.kind === "metric" ? (
            <MonitoringMetricChart
              businessId={businessId}
              metricKey={view.metricKey}
              goals={goals}
            />
          ) : (
            <MonitoringOverviewView
              overview={overview.data}
              businessId={businessId}
              notifications={notifications.data}
              notificationsLoading={notifications.isLoading}
              notificationsError={notifications.isError}
              notificationsErrorMessage={notifications.error}
              onOpenIncident={(incidentId) =>
                setView({ kind: "incident", incidentId })
              }
              onOpenMetric={(metricKey) => setView({ kind: "metric", metricKey })}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
