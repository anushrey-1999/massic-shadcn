"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format as formatDate } from "date-fns";
import { differenceInCalendarDays, isAfter, isBefore, startOfDay, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { X, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TIME_PERIODS } from "@/hooks/use-gsc-analytics";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { useGenerateReportV2 } from "@/hooks/use-report-runs";
import { getWorkflowStatus } from "@/lib/workflow-status";
import { getAnalyticsPeriodBounds, resolveTimePeriodRange, type TimePeriodValue } from "@/utils/analytics-period";

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

const CUSTOM_RANGE_VALUE = "__custom__";
const V2_LATEST_END_OFFSET_DAYS = 4;
const DEFAULT_PRESET_OFFSET_DAYS = 2;

function formatRangeLabel(range: DateRange | undefined): string {
  if (!range?.from && !range?.to) return "Select date range";
  if (range?.from && !range?.to) return formatDate(range.from, "MMM d, yyyy");
  if (!range?.from || !range?.to) return "Select date range";
  return `${formatDate(range.from, "MMM d, yyyy")} - ${formatDate(range.to, "MMM d, yyyy")}`;
}

function buildInitialCustomRange(period: TimePeriodValue, referenceDate: Date): DateRange | undefined {
  const resolved = resolveTimePeriodRange(period, referenceDate);
  return resolved ? { from: resolved.from, to: resolved.to } : undefined;
}

export function GenerateReportDialog({
  open,
  onOpenChange,
  businessId,
}: GenerateReportDialogProps) {
  const router = useRouter();
  const periodReferenceDate = React.useMemo(
    () => subDays(startOfDay(new Date()), V2_LATEST_END_OFFSET_DAYS - DEFAULT_PRESET_OFFSET_DAYS),
    []
  );
  const maxSelectableDate = React.useMemo(
    () => startOfDay(subDays(new Date(), V2_LATEST_END_OFFSET_DAYS)),
    []
  );
  const [period, setPeriod] = React.useState<TimePeriodValue>("3 months");
  const [selectedRangeMode, setSelectedRangeMode] = React.useState<string>("preset");
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(() =>
    buildInitialCustomRange("3 months", periodReferenceDate)
  );
  const [reportScope, setReportScope] = React.useState<"organic" | "all_channels">("organic");
  const [reportPerspective, setReportPerspective] = React.useState<"wins" | "full_picture">("full_picture");
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [customInstructions, setCustomInstructions] = React.useState("");
  const { minSelectableDate } = React.useMemo(
    () => getAnalyticsPeriodBounds(periodReferenceDate),
    [periodReferenceDate]
  );

  const { data: jobData, isLoading: isJobLoading } = useJobByBusinessId(businessId);
  const generateReport = useGenerateReportV2();

  const coreStatus = getWorkflowStatus(jobData, "core") ?? jobData?.workflow_status?.status;
  const canGenerate = coreStatus === "success";
  const isJobProcessing =
    coreStatus === "processing" ||
    coreStatus === "pending" ||
    (Boolean(jobData) && jobData?.workflow_status?.status === null && coreStatus !== "success" && coreStatus !== "error");
  const hasJobError = coreStatus === "error";
  const hasNoJob = !jobData && !isJobLoading;

  // Show toast when dialog opens based on job status
  React.useEffect(() => {
    if (!open || isJobLoading) return;

    if (hasNoJob) {
      toast.error("Job Required", {
        description: "A job is required to generate reports. Please create a job first from the business profile.",
      });
    } else if (isJobProcessing) {
      toast.info("Job In Progress", {
        description: "Please wait for the job to complete before generating a report.",
      });
    }
  }, [open, isJobLoading, hasNoJob, isJobProcessing]);

  React.useEffect(() => {
    if (!open) {
      setCustomInstructions("");
      setCalendarOpen(false);
    }
  }, [open]);

  const clampCustomRange = React.useCallback(
    (range: DateRange | undefined): DateRange | undefined => {
      if (!range) return range;

      let from = range.from ? startOfDay(range.from) : undefined;
      let to = range.to ? startOfDay(range.to) : undefined;

      if (from && isBefore(from, minSelectableDate)) from = minSelectableDate;
      if (to && isAfter(to, maxSelectableDate)) to = maxSelectableDate;
      if (from && isAfter(from, maxSelectableDate)) from = maxSelectableDate;
      if (to && isBefore(to, minSelectableDate)) to = minSelectableDate;

      if (from && to && isAfter(from, to)) {
        from = to;
      }

      return { from, to };
    },
    [maxSelectableDate, minSelectableDate]
  );

  React.useEffect(() => {
    setCustomRange((current) => {
      if (!current?.to || !isAfter(current.to, maxSelectableDate)) {
        return current;
      }

      const currentFrom = current.from ? startOfDay(current.from) : maxSelectableDate;
      const currentTo = startOfDay(current.to);
      const windowDays = Math.max(0, differenceInCalendarDays(currentTo, currentFrom));
      const adjustedTo = maxSelectableDate;
      let adjustedFrom = subDays(adjustedTo, windowDays);
      if (isBefore(adjustedFrom, minSelectableDate)) {
        adjustedFrom = minSelectableDate;
      }

      return { from: adjustedFrom, to: adjustedTo };
    });
  }, [maxSelectableDate, minSelectableDate]);

  const resolvedPresetRange = React.useMemo(
    () => resolveTimePeriodRange(period, periodReferenceDate),
    [period, periodReferenceDate]
  );
  const effectiveRange = selectedRangeMode === CUSTOM_RANGE_VALUE
    ? customRange
    : resolvedPresetRange
      ? { from: resolvedPresetRange.from, to: resolvedPresetRange.to }
      : undefined;

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleGenerate = async () => {
    if (!canGenerate || !businessId) return;

    if (!effectiveRange?.from || !effectiveRange?.to) {
      toast.error("Please select a complete date range");
      return;
    }

    try {
      const result = await generateReport.mutateAsync({
        businessId,
        startDate: formatDate(effectiveRange.from, "yyyy-MM-dd"),
        endDate: formatDate(effectiveRange.to, "yyyy-MM-dd"),
        custom_instructions: customInstructions.trim(),
        report_options: {
          scope: reportScope,
          perspective: reportPerspective,
        },
      });

      if (result?.id) {
        toast.success("Report generation started");
        onOpenChange(false);
        router.push(`/business/${businessId}/reports/${result.id}`);
      }
    } catch (error) {
      toast.error("Failed to generate report", {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    }
  };

  const isGenerating = generateReport.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[520px] p-0 gap-0 rounded-[10px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        showCloseButton={false}
      >
        {/* Dialog Header */}
        <div className="p-4">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="text-[20px] font-semibold leading-[1.2] tracking-[-0.4px] text-general-foreground">
              Generate Report
            </DialogTitle>
            <DialogClose asChild>
              <button
                className="h-4 w-4 opacity-70 hover:opacity-100 transition-opacity outline-none flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-[#525252]" />
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Separator */}
        <Separator className="w-full h-px bg-general-border" />

        {/* Content */}
        <div className="pt-4 px-4 pb-0">
            <div className="bg-general-primary-foreground rounded-lg p-2 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="period"
                  className="text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-foreground"
              >
                Select Time Period
              </label>
            </div>
            <Select
              value={selectedRangeMode === CUSTOM_RANGE_VALUE ? CUSTOM_RANGE_VALUE : period}
              onValueChange={(value) => {
                if (value === CUSTOM_RANGE_VALUE) {
                  setSelectedRangeMode(CUSTOM_RANGE_VALUE);
                  setCustomRange((current) => current ?? buildInitialCustomRange(period, periodReferenceDate));
                  return;
                }

                setSelectedRangeMode("preset");
                setPeriod(value as TimePeriodValue);
              }}
              disabled={!canGenerate || isGenerating}
            >
              <SelectTrigger
                id="period"
                className="w-full h-10 min-h-9 bg-white rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] pl-3 pr-2 py-[7.5px] gap-2 border-0 text-[12px] font-normal leading-[1.5] tracking-[0.18px] text-general-muted-foreground"
                variant="noBorder"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((timePeriod) => (
                  <SelectItem key={timePeriod.id} value={timePeriod.value}>
                    {timePeriod.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_RANGE_VALUE}>Custom range</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="custom-range"
                className="text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-foreground"
              >
                Date Range
              </label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="custom-range"
                    type="button"
                    variant="outline"
                    disabled={!canGenerate || isGenerating}
                    className="justify-start bg-white rounded-lg border-general-border text-[12px] font-normal leading-[1.5] tracking-[0.18px] text-general-foreground"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {selectedRangeMode === CUSTOM_RANGE_VALUE
                      ? formatRangeLabel(customRange)
                      : effectiveRange?.from && effectiveRange?.to
                        ? `${formatDate(effectiveRange.from, "MMM d, yyyy")} - ${formatDate(effectiveRange.to, "MMM d, yyyy")}`
                        : "Select date range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <div className="border-b px-4 py-3">
                    <p className="text-sm font-semibold">Select custom range</p>
                    <p className="text-xs text-muted-foreground">
                      Reports compare this range against the immediately prior period.
                    </p>
                  </div>
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={(range) => {
                      setCustomRange(clampCustomRange(range));
                      setSelectedRangeMode(CUSTOM_RANGE_VALUE);
                      if (range?.from && range?.to) {
                        setCalendarOpen(false);
                      }
                    }}
                    numberOfMonths={2}
                    disabled={(date) => date < minSelectableDate || date > maxSelectableDate}
                    defaultMonth={customRange?.from}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                {effectiveRange?.from && effectiveRange?.to
                  ? `Using ${formatDate(effectiveRange.from, "MMM d, yyyy")} to ${formatDate(effectiveRange.to, "MMM d, yyyy")}`
                  : "Choose a preset or custom range."} Latest selectable date is{" "}
                {formatDate(maxSelectableDate, "MMM d, yyyy")} due to Search Console latency.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="report-scope"
                  className="text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-foreground"
                >
                  Scope
                </label>
                <Select
                  value={reportScope}
                  onValueChange={(value) => setReportScope(value as "organic" | "all_channels")}
                  disabled={!canGenerate || isGenerating}
                >
                  <SelectTrigger
                    id="report-scope"
                    className="w-full h-10 min-h-9 bg-white rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] pl-3 pr-2 py-[7.5px] gap-2 border-0 text-[12px] font-normal leading-[1.5] tracking-[0.18px] text-general-muted-foreground"
                    variant="noBorder"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organic">Organic</SelectItem>
                    <SelectItem value="all_channels">All channels</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="report-perspective"
                  className="text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-foreground"
                >
                  Perspective
                </label>
                <Select
                  value={reportPerspective}
                  onValueChange={(value) => setReportPerspective(value as "wins" | "full_picture")}
                  disabled={!canGenerate || isGenerating}
                >
                  <SelectTrigger
                    id="report-perspective"
                    className="w-full h-10 min-h-9 bg-white rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] pl-3 pr-2 py-[7.5px] gap-2 border-0 text-[12px] font-normal leading-[1.5] tracking-[0.18px] text-general-muted-foreground"
                    variant="noBorder"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wins">Wins</SelectItem>
                    <SelectItem value="full_picture">Full picture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="custom-instructions"
                className="text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-foreground"
              >
                Custom Instructions
              </label>
              <Textarea
                id="custom-instructions"
                value={customInstructions}
                onChange={(event) => setCustomInstructions(event.target.value)}
                disabled={!canGenerate || isGenerating}
                placeholder="Optional: Add specific instructions for this report."
                className="min-h-[96px] resize-y bg-white text-[12px] leading-[1.5] tracking-[0.18px] text-general-foreground border-general-border"
              />
            </div>
          </div>

          {/* Status message */}
          {!isJobLoading && !canGenerate && (
            <p className="text-sm text-muted-foreground mt-3">
              {hasNoJob
                ? "A job is required to generate reports."
                : isJobProcessing
                  ? "Job is still processing. Please wait for it to complete."
                  : hasJobError
                    ? "Job workflow failed. Re-run workflows from the business profile, then try again."
                    : "Unable to generate report at this time."}
            </p>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="p-4">
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={handleCancel}
              disabled={isGenerating}
              className="min-h-9 px-4 py-[7.5px] rounded-lg border border-general-border-three bg-[rgba(255,255,255,0.1)] flex items-center justify-center gap-2 text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-foreground hover:bg-accent hover:text-accent-foreground transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating || isJobLoading}
              className="min-h-9 px-4 py-[7.5px] rounded-lg bg-general-primary flex items-center justify-center gap-2 text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-primary-foreground hover:bg-general-primary/90 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
