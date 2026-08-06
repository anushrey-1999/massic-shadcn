"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, parseUtcDate } from "@/lib/format";

interface BrowserScheduleDisplay {
  date: string;
  time: string;
  full: string;
}

const EMPTY_DISPLAY: BrowserScheduleDisplay = {
  date: "",
  time: "",
  full: "",
};

export function useBrowserScheduleDisplay(value: string | null | undefined) {
  const [display, setDisplay] = React.useState<BrowserScheduleDisplay>(EMPTY_DISPLAY);

  React.useEffect(() => {
    const date = parseUtcDate(value);
    if (!date) {
      setDisplay(EMPTY_DISPLAY);
      return;
    }

    setDisplay({
      date: formatDate(date, "MMM d, yyyy"),
      time: formatDate(date, "h:mm a"),
      full: formatDate(date, "EEE, MMM d, yyyy 'at' h:mm a"),
    });
  }, [value]);

  return display;
}

export function ScheduledStatusBadge({ scheduledFor }: { scheduledFor?: string | null }) {
  const display = useBrowserScheduleDisplay(scheduledFor);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="inline-flex cursor-default items-center justify-center gap-1.5 rounded-lg border border-general-border bg-white px-2 py-[3px] text-[10px] font-medium leading-[1.5] tracking-[0.15px] text-general-secondary-foreground hover:bg-white">
          <CalendarClock className="h-3 w-3" aria-hidden="true" />
          Scheduled{display.date ? ` · ${display.date}` : ""}
          {display.time ? ` · ${display.time}` : ""}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[280px]">
        <p>Next report scheduled at</p>
        <p className="font-medium">{display.full || "Schedule time unavailable"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ScheduledDateCell({
  scheduledFor,
  part,
}: {
  scheduledFor?: string | null;
  part: "date" | "time";
}) {
  const display = useBrowserScheduleDisplay(scheduledFor);
  return <span suppressHydrationWarning>{display[part] || "—"}</span>;
}

export function NextScheduledReportCard({ scheduledFor }: { scheduledFor?: string | null }) {
  const display = useBrowserScheduleDisplay(scheduledFor);

  return (
    <div className="flex w-full items-start gap-3 rounded-lg border border-general-border bg-general-primary-foreground p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-general-secondary-foreground">
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-general-foreground">Next report scheduled</p>
        <p className="mt-0.5 text-sm text-general-secondary-foreground">
          {display.full || "Schedule time unavailable"}
        </p>
      </div>
    </div>
  );
}
