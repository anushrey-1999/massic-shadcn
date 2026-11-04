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

/** Metrics tab rows until the tab's own design lands. */
function MetricRow({ row }: { row: MonitoringMetricRow }) {
  const detail = row.empty ?? row.notConnected ?? row.sentence ?? "";
  return (
    <div className="flex w-full items-start gap-3 border-t border-general-border py-3">
      <span className={cn("flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.5]", row.indent && "pl-6")}>
        <span className="text-sm font-medium tracking-[0.07px] text-general-foreground">
          {row.name}
        </span>
        {detail ? (
          <span className="text-xs tracking-[0.18px] text-general-muted-foreground">{detail}</span>
        ) : null}
      </span>
      <span className="w-[160px] shrink-0 text-right text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
        {row.notConnected || row.empty ? "" : row.statusLabel ?? ""}
      </span>
    </div>
  );
}

interface MonitoringEventsCardProps {
  list: MonitoringSection<MonitoringList> | null;
  metrics: MonitoringSection<MonitoringMetricRow[]> | null;
  loading: boolean;
  onRetry: () => void;
  retrying: boolean;
  onOpenCard: (cardId: string) => void;
}

export function MonitoringEventsCard({
  list,
  metrics,
  loading,
  onRetry,
  retrying,
  onOpenCard,
}: MonitoringEventsCardProps) {
  const [tab, setTab] = useState<EventsTab>("events");
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
            <MetricRow key={row.key} row={row} />
          ))}
        </div>
      ) : null}
    </MonitoringCardShell>
  );
}
