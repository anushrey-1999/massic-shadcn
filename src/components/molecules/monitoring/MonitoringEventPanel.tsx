"use client";

import { useState } from "react";
import { RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  monitoringErrorMessage,
  monitoringErrorStatus,
  useMonitoringCard,
  type MonitoringCardDetail,
  type MonitoringCheckRow,
  type MonitoringRange,
  type MonitoringWhereView,
} from "@/hooks/use-monitoring-screen";
import { SourceFavicon } from "@/components/molecules/analytics/SourceFavicon";
import { MonitoringLineChart } from "./MonitoringLineChart";
import {
  ChartEdgeDates,
  ChartLegend,
  EventTypeTag,
  PanelSection,
  PanelSkeleton,
  SegmentedToggle,
  shadeDirections,
} from "./monitoring-ui";

interface MonitoringEventPanelProps {
  businessId: string;
  cardId: string | null;
  range: MonitoringRange;
  website?: string | null;
  onClose: () => void;
  onOpenCard: (cardId: string) => void;
}

function pageUrl(website: string | null | undefined, page: string): string | null {
  if (!website) return null;
  try {
    const origin = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    return new URL(page, origin).toString();
  } catch {
    return null;
  }
}

function KeyNumber({ detail }: { detail: MonitoringCardDetail }) {
  const { keyNumber, miniChart } = detail;
  const points = miniChart.points;

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-general-border px-4 pt-3.5 pb-3">
      {keyNumber ? (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl leading-[1.2] font-semibold tracking-[-0.48px] text-general-foreground">
            {keyNumber.value.toLocaleString("en-US")}
          </span>
          <span className="min-w-0 truncate text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
            {keyNumber.caption}
          </span>
          <div className="flex-1" />
          <span
            className={cn(
              "shrink-0 text-xs leading-[1.5] font-medium tracking-[0.18px] whitespace-nowrap",
              keyNumber.direction === "up" ? "text-green-700" : "text-red-700"
            )}
          >
            {keyNumber.change}
          </span>
        </div>
      ) : null}

      {miniChart.connected ? (
        <MonitoringLineChart
          variant="mini"
          height={72}
          points={points}
          usualPerDay={miniChart.usualPerDay}
          shading={miniChart.shading}
          compared={miniChart.compared ?? null}
          showXAxis={false}
        />
      ) : (
        <div className="flex h-[72px] items-center justify-center rounded-[8px] border border-dashed border-general-border text-xs text-general-muted-foreground">
          Not connected.
        </div>
      )}

      <ChartEdgeDates first={points[0]?.date} last={points[points.length - 1]?.date} />
      <ChartLegend
        usual={miniChart.usualPerDay !== null}
        directions={shadeDirections(miniChart.shading)}
        comparedLabel={miniChart.compared?.label ?? null}
      />
    </div>
  );
}

function WhereTable({ view, website }: { view: MonitoringWhereView; website?: string | null }) {
  if (view.empty) {
    return <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">{view.empty}</p>;
  }
  const rows = view.rows ?? [];
  const head = view.head ?? [];

  return (
    <div className="flex flex-col gap-2">
      {rows.length ? (
        <table className="w-full border-collapse text-xs leading-[1.5] tracking-[0.18px]">
          <thead>
            <tr className="text-general-muted-foreground">
              {head.map((column, index) => (
                <th
                  key={column}
                  className={cn("py-2 font-normal", index === 0 ? "text-left" : "pl-3 text-right whitespace-nowrap")}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = row.page ? pageUrl(website, row.page) : null;
              return (
                <tr key={`${row.page ?? ""}${row.name}`} className="border-t border-general-border">
                  <td className="py-2 pr-2 text-left text-general-foreground">
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="break-all hover:underline">
                        {row.name}
                      </a>
                    ) : view.key === "channels" ? (
                      <span className="flex items-center gap-2">
                        <SourceFavicon sourceName={row.name} />
                        <span className="break-all">{row.name}</span>
                      </span>
                    ) : (
                      <span className="break-all">{row.name}</span>
                    )}
                  </td>
                  {row.cells.map((cell, index) => (
                    <td key={index} className="py-2 pl-3 text-right font-medium whitespace-nowrap text-general-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
      {view.partialLine ? (
        <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">{view.partialLine}</p>
      ) : null}
      {view.note ? (
        <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">{view.note}</p>
      ) : null}
      {view.sentence ? (
        <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-foreground">{view.sentence}</p>
      ) : null}
    </div>
  );
}

function WhereSection({ views, website }: { views: MonitoringWhereView[]; website?: string | null }) {
  const [active, setActive] = useState<MonitoringWhereView["key"]>(views[0].key);
  const view = views.find((item) => item.key === active) ?? views[0];
  return (
    <PanelSection
      label="Where it happened"
      aside={
        <SegmentedToggle
          ariaLabel="Where it happened view"
          options={views}
          value={view.key}
          onChange={setActive}
        />
      }
    >
      <WhereTable view={view} website={website} />
    </PanelSection>
  );
}

/** Only checks that found something; when none did, one "We checked: ..." paragraph instead. */
function WhySection({ rows, summary }: { rows: MonitoringCheckRow[]; summary: string | null }) {
  const found = rows.filter((row) => row.result === "yes");
  if (!found.length && !summary) return null;

  return (
    <PanelSection label="Why it may have happened">
      <div className="flex flex-col">
        {!found.length && summary ? (
          <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-foreground">{summary}</p>
        ) : null}
        {found.map((row, index) => (
          <div key={`${row.key}-${index}`} className="flex flex-col gap-0.5 py-1.5">
            <p className="text-xs leading-[1.5] font-medium tracking-[0.18px] text-general-foreground">
              {row.name}
            </p>
            {row.text ? (
              <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-foreground">{row.text}</p>
            ) : null}
            {row.partialLine ? (
              <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">{row.partialLine}</p>
            ) : null}
          </div>
        ))}
      </div>
    </PanelSection>
  );
}

function WhatToCheck({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <PanelSection label="What to check">
      <ol className="flex flex-col gap-2.5">
        {items.map((item, index) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-[10px] bg-[#f5f5f5] text-[10px] leading-[1.5] font-medium tracking-[0.15px] text-general-muted-foreground">
              {index + 1}
            </span>
            <span className="text-xs leading-[1.5] tracking-[0.18px] text-general-foreground">{item}</span>
          </li>
        ))}
      </ol>
    </PanelSection>
  );
}

export function MonitoringEventPanel({
  businessId,
  cardId,
  range,
  website,
  onClose,
  onOpenCard,
}: MonitoringEventPanelProps) {
  const query = useMonitoringCard(businessId, cardId, range);
  const detail = query.data ?? null;
  const header = detail?.header;
  const notFound = monitoringErrorStatus(query.error) === 404;

  return (
    <Sheet open={Boolean(cardId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showClose={false}
        className="w-full gap-0 border-general-border p-0 sm:max-w-[520px]"
      >
        <div className="flex flex-col gap-2 py-4 pr-4 pl-6">
          <div className="flex min-h-8 items-center gap-2">
            {header ? <EventTypeTag tag={header.tag} label={header.tagLabel} /> : <Skeleton className="h-5 w-20 rounded-[12px]" />}
            {header?.status ? (
              <span className="text-xs leading-[1.5] tracking-[0.18px] whitespace-nowrap text-general-muted-foreground">
                {header.status.label}
              </span>
            ) : null}
            <div className="flex-1" />
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Close">
                <X className="size-4" strokeWidth={1.5} />
              </Button>
            </SheetClose>
          </div>
          {header || query.isError ? (
            <SheetTitle className="text-xl leading-[1.2] font-semibold tracking-[-0.4px] text-general-foreground">
              {header?.title ?? "Event"}
            </SheetTitle>
          ) : (
            <>
              <SheetTitle className="sr-only">Event</SheetTitle>
              <Skeleton className="h-6 w-3/4" />
            </>
          )}
          {header?.subtitle ? (
            <SheetDescription className="text-xs leading-[1.5] tracking-[0.18px] text-general-muted-foreground">
              {header.subtitle}
            </SheetDescription>
          ) : (
            <SheetDescription className="sr-only">Event details</SheetDescription>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {query.isLoading ? (
            <PanelSkeleton />
          ) : query.isError ? (
            <div className="flex flex-col items-start gap-3 px-6 pt-2 pb-6">
              <p className="text-sm leading-[1.5] tracking-[0.07px] text-general-muted-foreground">
                {monitoringErrorMessage(query.error)}
              </p>
              {notFound ? null : (
                <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
                  <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} strokeWidth={1.5} />
                  Try again
                </Button>
              )}
            </div>
          ) : detail ? (
            <div className="flex flex-col px-6 pt-2 pb-6">
              <div className="pb-5">
                <KeyNumber detail={detail} />
              </div>
              {detail.whatHappened?.length ? (
                <PanelSection label="What happened">
                  <p className="text-xs leading-[1.5] tracking-[0.18px] text-general-foreground">
                    {detail.whatHappened.join(" ")}
                    {detail.related ? (
                      <>
                        {" "}
                        {detail.related.lead}{" "}
                        <button
                          type="button"
                          onClick={() => onOpenCard(detail.related!.cardId)}
                          className="font-medium underline underline-offset-2 hover:text-general-muted-foreground"
                        >
                          {detail.related.title}
                        </button>
                        .
                      </>
                    ) : null}
                  </p>
                </PanelSection>
              ) : null}
              {detail.where?.length ? (
                <WhereSection key={detail.card.id} views={detail.where} website={website} />
              ) : null}
              {detail.checks ? <WhySection rows={detail.checks.rows} summary={detail.checks.summary} /> : null}
              {detail.whatToCheck ? <WhatToCheck items={detail.whatToCheck} /> : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
