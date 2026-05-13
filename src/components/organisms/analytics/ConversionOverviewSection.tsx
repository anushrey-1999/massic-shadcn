"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessStore } from "@/store/business-store";
import {
  ALL_GOALS_CONVERSION_EVENT,
  useConversionEvents,
  useConversionOverview,
  type ConversionOverviewCloser,
  type ConversionOverviewOpener,
  type TimePeriodValue,
} from "@/hooks/use-conversion-overview";

interface ConversionOverviewSectionProps {
  period?: TimePeriodValue;
}

const CHANNEL_COLORS: Record<string, string> = {
  Direct: "#334155",
  Email: "#9ca3af",
  Referral: "#0369a1",
  "Cross-network": "#9ca3af",
  SMS: "#9ca3af",
  "Organic Search": "#0f766e",
  "Organic Social": "#c2410c",
  "Paid Search": "#1d4ed8",
  "Paid Social": "#7e22ce",
  Unassigned: "#9ca3af",
  Other: "#9ca3af",
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString();
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function channelColor(channel: string): string {
  return CHANNEL_COLORS[channel] || "#9ca3af";
}

function ConversionOverviewSkeleton() {
  return (
    <div className="grid divide-y divide-[#e5e5e5] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      {[0, 1].map((item) => (
        <div key={item} className="pb-3">
          <div className="flex min-h-[64px] flex-col justify-center gap-2 bg-[#fafafa] px-3 py-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="pt-2">
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="flex items-center gap-6 border-b border-[#e5e5e5] py-2 pr-3"
              >
                <Skeleton className="h-4 w-[100px] shrink-0" />
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-4 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TouchPanel({
  title,
  subtitle,
  rows,
  totalConversions,
}: {
  title: string;
  subtitle: string;
  rows: Array<ConversionOverviewOpener | ConversionOverviewCloser>;
  totalConversions: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 pb-3">
      <div className="flex min-h-[64px] flex-col justify-center gap-1 bg-[#fafafa] px-3 py-3 leading-normal text-[#737373]">
        <h3 className="m-0 min-w-0 text-[16px] font-medium text-[#737373]">
          {title}
        </h3>
        <p className="m-0 text-[10px] font-normal tracking-[0.15px]">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-col">
        {rows.length > 0 ? rows.map((row) => {
          const color = channelColor(row.channel);
          const percentage = Math.max(0, Math.min(row.pct * 100, 100));

          return (
            <div
              key={row.channel}
              className="flex items-center gap-6 border-b border-[#e5e5e5] py-2 pr-3 last:border-b-0"
            >
              <div
                className="w-[100px] shrink-0 truncate text-right text-[12px] font-medium leading-normal tracking-[0.18px]"
                style={{ color }}
              >
                {row.channel}
              </div>
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#f3f4f6]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percentage}%`, background: color }}
                />
              </div>
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap leading-normal">
                <span className="text-[12px] font-normal tracking-[0.18px] text-[#0a0a0a]">
                  {formatPct(row.pct)}
                </span>
                <span className="text-[10px] font-medium tracking-[0.15px] text-[#737373]">
                  {formatNumber(row.conversions)}
                </span>
              </div>
            </div>
          );
        }) : (
          <div className="px-3 py-8 text-sm text-[#737373]">
            No channel data for this conversion event yet.
          </div>
        )}
      </div>

      {totalConversions === 0 ? null : (
        <div className="sr-only">Percentages use {totalConversions} conversions as the denominator.</div>
      )}
    </div>
  );
}

const ConversionOverviewSection = ({ period = "3 months" }: ConversionOverviewSectionProps) => {
  const pathname = usePathname();
  const profiles = useBusinessStore((state) => state.profiles);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const { businessUniqueId, website } = useMemo(() => {
    const match = pathname.match(/^\/business\/([^/]+)/);
    if (!match) return { businessUniqueId: null, website: null };

    const id = match[1];
    const profile = profiles.find((p) => p.UniqueId === id);
    return {
      businessUniqueId: id,
      website: profile?.Website || null,
    };
  }, [pathname, profiles]);

  const eventsQuery = useConversionEvents({
    businessUniqueId,
    siteUrl: website,
    period,
  });

  const eventOptions = eventsQuery.data?.data.events ?? [];

  useEffect(() => {
    if (eventOptions.length === 0) {
      setSelectedEvent(null);
      return;
    }

    if (
      !selectedEvent ||
      (
        selectedEvent !== ALL_GOALS_CONVERSION_EVENT &&
        !eventOptions.some((event) => event.eventName === selectedEvent)
      )
    ) {
      setSelectedEvent(ALL_GOALS_CONVERSION_EVENT);
    }
  }, [eventOptions, selectedEvent]);

  const overviewQuery = useConversionOverview({
    businessUniqueId,
    siteUrl: website,
    period,
    conversionEvent: selectedEvent,
    enabled: Boolean(selectedEvent),
  });

  const overview = overviewQuery.data?.data;
  const isLoading = eventsQuery.isLoading || overviewQuery.isLoading;
  const hasError = eventsQuery.isError || overviewQuery.isError;
  const tagline = overview?.story.tagline.trim();

  return (
    <div className="flex flex-col gap-3 px-7 pb-10">
      <div className="overflow-hidden rounded-[8px] border border-[#e5e5e5] bg-white">
        <div className="flex min-h-10 items-center justify-between gap-4 border-b border-[#a3a3a3] bg-white px-2 py-[7.5px]">
          <h2 className="m-0 text-[16px] font-medium leading-normal text-[#0a0a0a]">
            How your channels work together
          </h2>

          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-[12px] font-normal leading-normal text-[#737373]">
              Total Conversions:<span className="text-[#0a0a0a]">{formatNumber(overview?.totalConversions ?? 0)}</span>
            </span>
            <Select
              value={selectedEvent || undefined}
              onValueChange={setSelectedEvent}
              disabled={eventOptions.length === 0 || eventsQuery.isLoading}
            >
              <SelectTrigger
                size="sm"
                className="h-[30px] min-h-0 gap-2 rounded-[8px] border-[#d4d4d4] bg-white px-4 py-1 text-[14px] font-medium leading-normal tracking-[0.07px] text-[#0a0a0a] shadow-none [&>svg]:h-[13.25px] [&>svg]:w-[13.25px]"
              >
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={ALL_GOALS_CONVERSION_EVENT}>
                  All goals
                </SelectItem>
                {eventOptions.map((event) => (
                  <SelectItem key={event.eventName} value={event.eventName}>
                    {event.eventName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasError ? (
          <Card className="m-3 rounded-[8px] border-[#e5e5e5] px-6 py-5 text-sm text-[#737373] shadow-sm">
            Unable to load conversion overview right now.
          </Card>
        ) : isLoading ? (
          <ConversionOverviewSkeleton />
        ) : overview ? (
          <div className="grid divide-y divide-[#e5e5e5] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <TouchPanel
              title="Who brings new customers in"
              subtitle="% conversions by channel they came through first"
              rows={overview.openers}
              totalConversions={overview.totalConversions}
            />
            <TouchPanel
              title="Who closes the deal"
              subtitle="% of users by the channel they returned through"
              rows={overview.closers}
              totalConversions={overview.totalConversions}
            />
          </div>
        ) : (
          <Card className="m-3 rounded-[8px] border-[#e5e5e5] px-6 py-5 text-sm text-[#737373] shadow-sm">
            No conversion events found for this period.
          </Card>
        )}
      </div>

      {tagline ? (
        <Card className="rounded-[8px] border-[#e5e5e5] bg-white px-6 py-5 text-sm font-medium leading-normal text-[#0a0a0a] shadow-none">
          {tagline}
        </Card>
      ) : null}
    </div>
  );
};

export default ConversionOverviewSection;
