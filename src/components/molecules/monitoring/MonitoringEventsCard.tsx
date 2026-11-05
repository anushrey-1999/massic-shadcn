"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  MonitoringCard,
  MonitoringList,
  MonitoringMetricRow,
  MonitoringSection,
} from "@/hooks/use-monitoring-screen";
import {
  EventTypeTag,
  ListSkeleton,
  MetricStatusTag,
  MonitoringCardShell,
  MonitoringPartError,
} from "./monitoring-ui";

type EventsTab = "events" | "metrics";

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex min-h-[29px] min-w-[29px] items-center justify-center gap-1.5 rounded-[10px] px-2 py-1 text-sm leading-[1.5] font-medium tracking-[0.07px] text-general-foreground transition-colors",
        active
          ? "bg-white drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)]"
          : "hover:bg-white/50"
      )}
    >
      {label}
      {count !== undefined ? (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-[10px] bg-general-border-three px-1 text-[10px] leading-[1.5] font-medium tracking-[0.15px]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** Event Row (Figma 7087:51023). Click opens the event panel. */
function EventRow({ card, onOpen }: { card: MonitoringCard; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(card.id)}
      className="flex w-full items-start gap-3 border-t border-general-border py-3 text-left transition-colors hover:bg-[#f5f5f5]/60 focus-visible:bg-[#f5f5f5] focus-visible:outline-none"
    >
      <span className="flex w-[96px] shrink-0 items-start pt-px">
        <EventTypeTag tag={card.tag} label={card.tagLabel} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.5]">
        <span className="text-sm font-medium tracking-[0.07px] text-general-foreground">
          {card.title}
        </span>
        <span className="text-xs tracking-[0.18px] text-general-muted-foreground">
          {card.subtitle}
        </span>
        {card.mostlyOn ? (
          <span className="text-xs tracking-[0.18px] text-general-foreground">
            {card.mostlyOn.text}
          </span>
        ) : null}
        {card.mayBeBecause ? (
          <span className="text-xs tracking-[0.18px] text-general-foreground">
            {card.mayBeBecause}
          </span>
        ) : null}
        {card.comparisonNote ? (
          <span className="text-xs tracking-[0.18px] text-general-muted-foreground">
            {card.comparisonNote}
          </span>
        ) : null}
      </span>
      <span className="w-[160px] shrink-0 text-right text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
        {card.status?.label ?? ""}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-general-muted-foreground"
        strokeWidth={1.5}
        aria-hidden
      />
    </button>
  );
}

/** Metric Row (Figma 7225:87629). A row with a status opens the metric panel. */
function MetricRow({ row, onOpen }: { row: MonitoringMetricRow; onOpen: (key: string) => void }) {
  const opens = Boolean(row.status);
  const usual = row.empty ?? row.notConnected ?? row.usual ?? "";
  const content = (
    <>
      <span className={cn("flex min-w-0 flex-1 flex-col leading-[1.5]", row.indent && "pl-5")}>
        <span className="truncate text-sm font-medium tracking-[0.07px] text-general-foreground">{row.name}</span>
        {usual ? (
          <span className="truncate text-xs tracking-[0.18px] text-general-muted-foreground xl:hidden">{usual}</span>
        ) : null}
      </span>
      <span className="w-20 shrink-0 text-right text-sm leading-[1.5] font-medium tracking-[0.07px] text-general-foreground xl:w-[120px]">
        {row.empty ? "" : row.status === "no_data" || row.total === null || row.total === undefined ? "—" : row.total.toLocaleString("en-US")}
      </span>
      <span className="hidden w-[180px] shrink-0 truncate text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground xl:block">
        {usual}
      </span>
      <span className="flex w-[150px] shrink-0 items-center xl:w-[170px]">
        {row.status && row.statusLabel ? <MetricStatusTag status={row.status} label={row.statusLabel} /> : null}
      </span>
      <span className="flex size-6 shrink-0 items-center justify-center">
        {opens ? <ChevronRight className="size-4 text-general-muted-foreground" strokeWidth={1.5} aria-hidden /> : null}
      </span>
    </>
  );

  if (!opens) {
    return <div className="flex w-full items-center gap-3 border-t border-general-border py-3 xl:gap-4">{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(row.key)}
      className="flex w-full items-center gap-3 border-t xl:gap-4 border-general-border py-3 text-left transition-colors hover:bg-[#f5f5f5]/60 focus-visible:bg-[#f5f5f5] focus-visible:outline-none"
    >
      {content}
    </button>
  );
}

interface MonitoringEventsCardProps {
  list: MonitoringSection<MonitoringList> | null;
  metrics: MonitoringSection<MonitoringMetricRow[]> | null;
  loading: boolean;
  onRetry: () => void;
  retrying: boolean;
  onOpenCard: (cardId: string) => void;
  onOpenMetric: (metricKey: string) => void;
  initialTab?: EventsTab;
}

export function MonitoringEventsCard({
  list,
  metrics,
  loading,
  onRetry,
  retrying,
  onOpenCard,
  onOpenMetric,
  initialTab = "events",
}: MonitoringEventsCardProps) {
  const [tab, setTab] = useState<EventsTab>(initialTab);
  const [showHidden, setShowHidden] = useState(false);

  const cards = list?.data?.cards ?? [];
  const visible = showHidden ? cards : cards.filter((card) => !card.hidden);

  const partError = tab === "events" ? list?.error : metrics?.error;

  return (
    <MonitoringCardShell className="pt-5 pb-3">
      <div className="flex items-center pb-3">
        <div role="tablist" className="flex items-center rounded-[10px] bg-general-border p-[3px]">
          <TabButton
            active={tab === "events"}
            label="Events"
            count={list?.data ? cards.length : undefined}
            onClick={() => setTab("events")}
          />
          <TabButton active={tab === "metrics"} label="Metrics" onClick={() => setTab("metrics")} />
        </div>
      </div>

      {loading || !list || !metrics ? (
        <ListSkeleton />
      ) : partError ? (
        <div className="border-t border-general-border pt-3">
          <MonitoringPartError
            message={partError.message}
            retryLabel={partError.retry}
            onRetry={onRetry}
            retrying={retrying}
          />
        </div>
      ) : tab === "events" && list.data ? (
        <div role="tabpanel" className="flex flex-col">
          {list.data.empty ? (
            <p className="border-t border-general-border py-3 text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground">
              {list.data.empty}
            </p>
          ) : (
            visible.map((card) => <EventRow key={card.id} card={card} onOpen={onOpenCard} />)
          )}
          {list.data.showMore && !showHidden ? (
            <button
              type="button"
              onClick={() => setShowHidden(true)}
              className="border-t border-general-border py-3 text-left text-xs leading-[1.5] font-medium tracking-[0.18px] text-general-foreground hover:underline"
            >
              {list.data.showMore}
            </button>
          ) : null}
        </div>
      ) : tab === "metrics" && metrics.data ? (
        <div role="tabpanel" className="flex flex-col">
          {metrics.data.map((row) => (
            <MetricRow key={row.key} row={row} onOpen={onOpenMetric} />
          ))}
        </div>
      ) : null}
    </MonitoringCardShell>
  );
}
