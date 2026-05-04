"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, Check } from "lucide-react";
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
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
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
  "Organic Search": "#059669",
  "Paid Search": "#2563eb",
  "Paid Social": "#7c3aed",
  Direct: "#64748b",
  Referral: "#0891b2",
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
  return CHANNEL_COLORS[channel] || "#737373";
}

function joinChannels(channels: string[]): string {
  if (channels.length === 0) return "";
  if (channels.length === 1) return channels[0];
  return `${channels.slice(0, -1).join(", ")} and ${channels[channels.length - 1]}`;
}

function renderMarkedText(text: string, openers: string[], closers: string[]) {
  const markers = [
    ...openers.map((channel) => ({ channel, className: "text-[#1d4ed8] font-semibold" })),
    ...closers.map((channel) => ({ channel, className: "text-[#047857] font-semibold" })),
  ].sort((a, b) => b.channel.length - a.channel.length);

  if (markers.length === 0) {
    return <span className="text-[#1e4d3d] font-semibold">{text}</span>;
  }

  const parts: Array<{ text: string; className?: string }> = [];
  let remaining = text;

  while (remaining.length > 0) {
    const matches = markers
      .map((marker) => ({ ...marker, index: remaining.indexOf(marker.channel) }))
      .filter((marker) => marker.index >= 0)
      .sort((a, b) => a.index - b.index);

    const match = matches[0];
    if (!match) {
      parts.push({ text: remaining, className: "text-[#1e4d3d] font-semibold" });
      break;
    }

    if (match.index > 0) {
      parts.push({
        text: remaining.slice(0, match.index),
        className: "text-[#1e4d3d] font-semibold",
      });
    }

    parts.push({ text: match.channel, className: match.className });
    remaining = remaining.slice(match.index + match.channel.length);
  }

  return parts.map((part, index) => (
    <span key={`${part.text}-${index}`} className={part.className}>
      {part.text}
    </span>
  ));
}

function ConversionOverviewSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map((item) => (
        <Card key={item} className="gap-0 overflow-hidden rounded-[12px] border-[#e5e5e5] py-0 shadow-sm">
          <div className="border-b border-[#e5e5e5] px-[22px] py-[18px]">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-3 h-4 w-64" />
          </div>
          <div className="space-y-4 p-[22px]">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <Skeleton key={rowIndex} className="h-5 w-full" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function TouchCard({
  variant,
  title,
  subtitle,
  rows,
  totalConversions,
}: {
  variant: "opener" | "closer";
  title: string;
  subtitle: string;
  rows: Array<ConversionOverviewOpener | ConversionOverviewCloser>;
  totalConversions: number;
}) {
  const isOpener = variant === "opener";

  return (
    <Card className="gap-0 overflow-hidden rounded-[12px] border-[#e5e5e5] py-0 shadow-sm">
      <div
        className={cn(
          "flex items-start gap-3 border-b border-[#e5e5e5] px-[22px] py-[18px]",
          isOpener
            ? "bg-linear-to-b from-[#eff6ff] to-white"
            : "bg-linear-to-b from-[#ecfdf5] to-white"
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-white",
            isOpener ? "bg-[#1d4ed8]" : "bg-[#047857]"
          )}
        >
          {isOpener ? <ArrowDownRight className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </div>
        <div>
          <div
            className={cn(
              "mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em]",
              isOpener ? "text-[#1d4ed8]" : "text-[#047857]"
            )}
          >
            {isOpener ? "First touch" : "Last touch"}
          </div>
          <h3 className="m-0 text-[17px] font-semibold leading-tight tracking-[-0.01em] text-[#171717]">
            {title}
          </h3>
          <p className="m-0 mt-1 text-[12.5px] text-[#737373]">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="py-1.5">
        {rows.length > 0 ? rows.map((row) => {
          const color = channelColor(row.channel);
          return (
            <div
              key={`${variant}-${row.channel}`}
              className="grid grid-cols-[minmax(112px,130px)_1fr_52px_44px] items-center gap-x-3 border-t border-[#e5e5e5] px-[22px] py-3.5 first:border-t-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="h-4 w-[3px] shrink-0 rounded-[2px]" style={{ background: color }} />
                <div className="truncate text-[13.5px] font-medium text-[#171717]">
                  {row.channel}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded bg-[#f5f5f5]">
                <div
                  className="h-full rounded"
                  style={{ width: formatPct(row.pct), background: color }}
                />
              </div>
              <div className="text-right font-mono text-[13px] font-normal text-[#737373]">
                {formatNumber(row.conversions)}
              </div>
              <div className="text-right font-mono text-[13.5px] font-medium text-[#171717]">
                {formatPct(row.pct)}
              </div>
            </div>
          );
        }) : (
          <div className="px-[22px] py-8 text-sm text-[#737373]">
            No channel data for this conversion event yet.
          </div>
        )}
      </div>

      {totalConversions === 0 ? null : (
        <div className="sr-only">Percentages use {totalConversions} conversions as the denominator.</div>
      )}
    </Card>
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
  const story = overview?.story;
  const openerText = story?.topOpeners?.length
    ? `${joinChannels(story.topOpeners)} bring new customers in.`
    : "";
  const closerText = story?.topClosers?.length
    ? `${joinChannels(story.topClosers)} close the deal.`
    : "";

  return (
    <div className="flex flex-col px-7 pb-10">
      <div className="mb-4 rounded-[12px] border border-[#e5e5e5] bg-white px-[26px] py-[22px] shadow-sm">
        <div className="mb-3.5 flex flex-wrap items-center gap-4">
          <Typography variant="h2" className="text-[22px] leading-tight tracking-[-0.018em]">
            How your channels work together
          </Typography>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#e5e5e5] bg-[#fafafa] px-2.5 text-xs text-[#737373]">
            <span className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-[#a3a3a3]">
              Conversion
            </span>
            <Select
              value={selectedEvent || undefined}
              onValueChange={setSelectedEvent}
              disabled={eventOptions.length === 0 || eventsQuery.isLoading}
            >
              <SelectTrigger
                size="sm"
                className="h-auto min-h-0 border-0 bg-transparent p-0 font-mono text-xs text-[#171717] shadow-none [&>svg]:h-3 [&>svg]:w-3"
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

          <div className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#e5e5e5] bg-[#fafafa] px-2.5 text-xs text-[#737373]">
            <span className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-[#a3a3a3]">
              Conversions
            </span>
            <span className="font-mono text-xs text-[#171717]">
              {formatNumber(overview?.totalConversions ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {hasError ? (
        <Card className="rounded-[12px] border-[#e5e5e5] px-6 py-5 text-sm text-[#737373] shadow-sm">
          Unable to load conversion overview right now.
        </Card>
      ) : isLoading ? (
        <ConversionOverviewSkeleton />
      ) : overview ? (
        <>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <TouchCard
              variant="opener"
              title="Who brings new customers in"
              subtitle={`% of ${formatNumber(overview.totalConversions)} conversions by the channel they arrived through first`}
              rows={overview.openers}
              totalConversions={overview.totalConversions}
            />
            <TouchCard
              variant="closer"
              title="Who closes the deal"
              subtitle={`% of ${formatNumber(overview.totalConversions)} conversions by the channel they returned through`}
              rows={overview.closers}
              totalConversions={overview.totalConversions}
            />
          </div>

          <div className="rounded-[12px] border border-[#e5e5e5] bg-[#e8f1ed] px-[26px] py-[22px]">
            <p className="m-0 text-base leading-[1.55] tracking-[-0.005em] text-[#171717]">
              {openerText ? (
                <>
                  {renderMarkedText(openerText, story?.topOpeners ?? [], story?.topClosers ?? [])}{" "}
                </>
              ) : null}
              {closerText ? (
                <>
                  {renderMarkedText(closerText, story?.topOpeners ?? [], story?.topClosers ?? [])}{" "}
                </>
              ) : null}
              {renderMarkedText(story?.tagline ?? "", story?.topOpeners ?? [], story?.topClosers ?? [])}
            </p>
          </div>
        </>
      ) : (
        <Card className="rounded-[12px] border-[#e5e5e5] px-6 py-5 text-sm text-[#737373] shadow-sm">
          No conversion events found for this period.
        </Card>
      )}
    </div>
  );
};

export default ConversionOverviewSection;
