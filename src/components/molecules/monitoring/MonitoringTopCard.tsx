"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import { normalizeDomainForFavicon } from "@/utils/utils";
import type { MonitoringSection, MonitoringTop } from "@/hooks/use-monitoring-screen";
import {
  HealthStateBadge,
  MonitoringCardShell,
  MonitoringPartError,
  TopCardSkeleton,
} from "./monitoring-ui";

const FAVICON_URL = "https://www.google.com/s2/favicons?domain=";

function BusinessFavicon({ website, name }: { website?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const domain = normalizeDomainForFavicon(website || undefined);

  if (!domain || failed) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-general-border text-[10px] font-medium text-general-muted-foreground">
        {name.trim().charAt(0).toUpperCase() || "B"}
      </span>
    );
  }

  return (
    <img
      src={`${FAVICON_URL}${domain}&sz=64`}
      alt=""
      width={20}
      height={20}
      className="size-5 shrink-0 rounded-[4px] object-contain"
      onError={() => setFailed(true)}
    />
  );
}

/** Notifications Button (Figma 6928:52008). The bell panel opens it in a later phase. */
function NotificationsButton({ unseen }: { unseen: number }) {
  const label = unseen > 99 ? "99+" : String(unseen);
  return (
    <span
      className="relative flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-general-border bg-white text-general-foreground"
      aria-label={unseen ? `${unseen} unseen notifications` : "No unseen notifications"}
      role="img"
    >
      <Bell className="size-4" strokeWidth={1.5} aria-hidden />
      {unseen > 0 ? (
        <span className="absolute -top-[5px] left-[23px] flex h-4 min-w-4 items-center justify-center rounded-[12px] border-2 border-white bg-red-500 px-1 text-[10px] leading-[1.5] font-medium tracking-[0.15px] text-general-primary-foreground">
          {label}
        </span>
      ) : null}
    </span>
  );
}

interface MonitoringTopCardProps {
  businessName: string;
  website?: string | null;
  top: MonitoringSection<MonitoringTop> | null;
  loading: boolean;
  onRetry: () => void;
  retrying: boolean;
}

export function MonitoringTopCard({
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
          {data ? <NotificationsButton unseen={data.notifications.unseen} /> : null}
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
