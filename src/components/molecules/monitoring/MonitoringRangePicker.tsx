"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Check, ChevronDown, History, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ANALYTICS_TOOLBAR_BUTTON_CLASS } from "@/components/molecules/analytics/AnalyticsHeaderActions";
import { cn } from "@/lib/utils";
import type {
  MonitoringRange,
  MonitoringRangeModel,
  MonitoringRangePreset,
} from "@/hooks/use-monitoring-screen";

interface MonitoringRangePickerProps {
  /** The range the server resolved; drives presets, limits and labels. */
  model: MonitoringRangeModel | null;
  value: MonitoringRange;
  onChange: (next: MonitoringRange) => void;
  /** True while the screen refetches for a newly picked range. */
  pending?: boolean;
  disabled?: boolean;
}

interface DraftRange {
  start: string;
  end: string;
}

const PRESET_GROUPS: Array<MonitoringRangePreset["group"]> = ["recent", "calendar"];

const OPTION_CLASS = "flex w-full items-start justify-between rounded-md px-3 py-2 text-left transition-colors";

/** Same layout as the analytics period picker; presets and their dates come from the server. */
export function MonitoringRangePicker({
  model,
  value,
  onChange,
  pending = false,
  disabled = false,
}: MonitoringRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [draft, setDraft] = useState<DraftRange>({ start: "", end: "" });

  const isCustom = Boolean(model ? model.preset === null : value && "start" in value);
  const activePreset = model?.preset ?? (value && "preset" in value ? value.preset : null);

  useEffect(() => {
    if (!open || !model) return;
    setDraft({ start: model.start, end: model.end });
    setCustomExpanded(isCustom);
  }, [open, model, isCustom]);

  const groups = useMemo(
    () =>
      PRESET_GROUPS.map((group) => (model?.presets ?? []).filter((preset) => preset.group === group)).filter(
        (presets) => presets.length > 0
      ),
    [model]
  );

  const triggerLabel = !model
    ? "Dates"
    : isCustom
      ? model.customLabel
      : model.presets.find((preset) => preset.key === activePreset)?.label ?? model.label;

  const draftDays =
    draft.start && draft.end ? differenceInCalendarDays(parseISO(draft.end), parseISO(draft.start)) + 1 : 0;
  const draftError = !model
    ? null
    : draftDays <= 0 && draft.start && draft.end
      ? "The start date must be on or before the end date."
      : draftDays > 0 && draftDays < model.minDays
        ? `Pick at least ${model.minDays} days.`
        : null;
  const canApply = Boolean(draft.start && draft.end) && !draftError;

  const pickPreset = (key: string) => {
    onChange({ preset: key });
    setCustomExpanded(false);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!canApply) return;
    onChange({ start: draft.start, end: draft.end });
    setOpen(false);
  };

  return (
    <Popover open={open && !disabled} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(ANALYTICS_TOOLBAR_BUTTON_CLASS, "w-auto")}
          disabled={disabled || !model}
          aria-busy={pending}
        >
          {pending ? (
            <Loader2 className="size-[13.25px] shrink-0 animate-spin" strokeWidth={1.5} aria-hidden />
          ) : (
            <History className="size-[13.25px] shrink-0" strokeWidth={1.5} aria-hidden />
          )}
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-[13.25px] shrink-0" strokeWidth={1.5} aria-hidden />
        </Button>
      </PopoverTrigger>

      {model ? (
        <PopoverContent align="end" sideOffset={8} className="w-[260px] p-0">
          {groups.map((presets, index) => (
            <div key={presets[0].group}>
              {index > 0 ? <Separator /> : null}
              <div className="p-1">
                {presets.map((preset) => {
                  const active = !isCustom && activePreset === preset.key;
                  const option = (
                    <button
                      key={preset.key}
                      type="button"
                      disabled={!preset.available}
                      onClick={() => preset.available && pickPreset(preset.key)}
                      className={cn(
                        OPTION_CLASS,
                        preset.available && "hover:bg-muted/60",
                        active && "bg-muted",
                        !preset.available && "cursor-not-allowed opacity-40"
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{preset.label}</span>
                        {active ? <span className="text-xs text-muted-foreground">{preset.dates}</span> : null}
                      </span>
                      {active ? <Check className="mt-0.5 h-4 w-4 text-primary" /> : null}
                    </button>
                  );

                  if (preset.available) return option;
                  return (
                    <Tooltip key={preset.key}>
                      <TooltipTrigger asChild>
                        <span className="block">{option}</span>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        {preset.dates}. Pick at least {model.minDays} days.
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}

          <Separator />

          <div className="p-1">
            <button
              type="button"
              onClick={() => setCustomExpanded(true)}
              className={cn(OPTION_CLASS, "hover:bg-muted/60", (isCustom || customExpanded) && "bg-muted")}
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{model.customLabel}</span>
                {isCustom ? <span className="text-xs text-muted-foreground">{model.label}</span> : null}
              </span>
              {isCustom ? <Check className="mt-0.5 h-4 w-4 text-primary" /> : null}
            </button>
          </div>

          {customExpanded ? (
            <>
              <Separator />
              <div className="space-y-3 p-3">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label htmlFor="monitoring-range-start" className="text-xs font-medium text-muted-foreground">
                      From
                    </label>
                    <Input
                      id="monitoring-range-start"
                      type="date"
                      min={model.earliestStart}
                      max={model.latestEnd}
                      value={draft.start}
                      onChange={(event) => setDraft((current) => ({ ...current, start: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="monitoring-range-end" className="text-xs font-medium text-muted-foreground">
                      To
                    </label>
                    <Input
                      id="monitoring-range-end"
                      type="date"
                      min={model.earliestStart}
                      max={model.latestEnd}
                      value={draft.end}
                      onChange={(event) => setDraft((current) => ({ ...current, end: event.target.value }))}
                    />
                  </div>
                </div>

                <p className={cn("text-xs", draftError ? "text-red-700" : "text-muted-foreground")}>
                  {draftError ?? model.customHint}
                </p>

                <div className="flex justify-end">
                  <Button size="sm" onClick={applyCustom} disabled={!canApply}>
                    Apply
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
