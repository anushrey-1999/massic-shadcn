"use client";

import { BellOff } from "lucide-react";
import type { MonitoringNotification } from "@/hooks/use-monitoring";
import {
  MonitoringEmpty,
  MonitoringError,
  MonitoringLoading,
  MonitoringRow,
  NOTIFICATION_KIND_LABEL,
  SectionLabel,
  formatMonitoringTimestamp,
} from "./monitoring-ui";

/**
 * What this business was actually told, in order.
 *
 * Read-only for now, so nothing is marked read from here: the unread state stays as the
 * engine left it while the surface is being validated.
 *
 * The feed is handed its data rather than fetching it. The sheet loads notifications as soon
 * as it opens so the tab can carry a count before anyone clicks it, and a second fetch here
 * would make the first one pointless.
 */
export function MonitoringNotificationFeed({
  notifications,
  isLoading,
  isError,
  error,
  emptyTitle = "Nothing sent yet",
  emptyDescription = "Notifications appear here when a run raises, escalates or closes an alert.",
  label = "Delivered notifications",
}: {
  notifications: MonitoringNotification[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  label?: string;
}) {
  if (isLoading) return <MonitoringLoading label="Loading notifications" />;
  if (isError) return <MonitoringError message={error} />;

  if (notifications.length === 0) {
    return (
      <MonitoringEmpty
        icon={<BellOff className="h-4 w-4" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      {notifications.map((notification) => (
        <MonitoringRow key={notification.notificationId}>
          <div className="flex items-start gap-3">
            <span
              className={
                notification.readAt
                  ? "mt-1.5 h-2 w-2 shrink-0 rounded-full border border-general-border-three"
                  : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-general-primary"
              }
              title={notification.readAt ? "Read" : "Unread"}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-general-foreground">
                {notification.headline || "Update"}
              </p>
              {notification.lines.map((line, index) => (
                <p
                  key={index}
                  className="mt-1 text-[13px] leading-relaxed text-muted-foreground"
                >
                  {line}
                </p>
              ))}
              <p className="mt-2 text-[11px] text-muted-foreground">
                {NOTIFICATION_KIND_LABEL[notification.kind] ??
                  notification.kind}{" "}
                · {formatMonitoringTimestamp(notification.createdAt)}
              </p>
            </div>
          </div>
        </MonitoringRow>
      ))}
    </>
  );
}
