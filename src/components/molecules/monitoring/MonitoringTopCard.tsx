"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { MonitoringSection, MonitoringTop } from "@/hooks/use-monitoring-screen";
import { useNotificationCount, type NotificationScope } from "@/hooks/use-monitoring-notifications";
import { NotificationsSheet } from "./NotificationsSheet";
import {
  BusinessFavicon,
  HealthStateBadge,
  MonitoringCardShell,
  MonitoringPartError,
  NotificationBell,
  TopCardSkeleton,
} from "./monitoring-ui";

/** The business bell: its own unread count, opening the sheet for this business only. */
function BusinessNotifications({
  businessId,
  businessName,
  website,
}: {
  businessId: string;
  businessName: string;
  website?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const scope = useMemo<NotificationScope>(
    () => ({ kind: "business", businessId, name: businessName, website }),
    [businessId, businessName, website]
  );
  const count = useNotificationCount(scope);

  return (
    <>
      <NotificationBell unread={count.data ?? 0} onClick={() => setOpen(true)} aria-expanded={open} />
      <NotificationsSheet open={open} onOpenChange={setOpen} scope={scope} />
    </>
  );
}

interface MonitoringTopCardProps {
  businessId: string;
  businessName: string;
  website?: string | null;
  top: MonitoringSection<MonitoringTop> | null;
  loading: boolean;
  onRetry: () => void;
  retrying: boolean;
}

export function MonitoringTopCard({
  businessId,
  businessName,
  website,
  top,
  loading,
  onRetry,
  retrying,
}: MonitoringTopCardProps) {
  if (loading || !top) {
    return (
      <MonitoringCardShell>
        <TopCardSkeleton />
      </MonitoringCardShell>
    );
  }

  const data = top.data;
  const pill = data?.pill ?? null;

  return (
    <MonitoringCardShell>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BusinessFavicon website={website} name={businessName} />
          <p className="truncate text-sm leading-[1.5] font-medium tracking-[0.07px] text-general-muted-foreground">
            {businessName}
          </p>
          {pill ? (
            <HealthStateBadge color={pill.color} text={pill.streak?.text ?? pill.label} />
          ) : null}
          <div className="flex-1" />
          <BusinessNotifications businessId={businessId} businessName={businessName} website={website} />
        </div>

        {data ? (
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl leading-[1.2] font-semibold tracking-[-0.48px] text-general-foreground">
              {data.headline.title}
            </h1>
            {data.headline.subtitle ? (
              <p className={cn("text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground")}>
                {data.headline.subtitle}
              </p>
            ) : null}
          </div>
        ) : top.error ? (
          <MonitoringPartError
            message={top.error.message}
            retryLabel={top.error.retry}
            onRetry={onRetry}
            retrying={retrying}
          />
        ) : null}
      </div>
    </MonitoringCardShell>
  );
}
