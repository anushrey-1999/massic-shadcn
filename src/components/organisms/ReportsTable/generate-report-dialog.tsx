"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { TIME_PERIODS } from "@/hooks/use-gsc-analytics";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { useGenerateReport } from "@/hooks/use-report-runs";

interface GenerateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export function GenerateReportDialog({
  open,
  onOpenChange,
  businessId,
}: GenerateReportDialogProps) {
  const router = useRouter();
  const [period, setPeriod] = React.useState("3 months");

  const { data: jobData, isLoading: isJobLoading } = useJobByBusinessId(businessId);
  const generateReport = useGenerateReport();

  const workflowStatus = jobData?.workflow_status?.status;
  const canGenerate = workflowStatus === "success";
  const isJobProcessing = workflowStatus === "processing" || workflowStatus === "pending";
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

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleGenerate = async () => {
    if (!canGenerate || !businessId) return;

    try {
      const result = await generateReport.mutateAsync({
        businessId,
        period,
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
          <div className="bg-general-primary-foreground rounded-lg p-2 flex flex-col gap-1.5">
            <div className="h-10 flex items-start">
              <label
                htmlFor="period"
                className="text-[14px] font-medium leading-[1.5] tracking-[0.07px] text-general-foreground"
              >
                Select Time Period
              </label>
            </div>
            <Select value={period} onValueChange={setPeriod} disabled={!canGenerate || isGenerating}>
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
              </SelectContent>
            </Select>
          </div>

          {/* Status message */}
          {!isJobLoading && !canGenerate && (
            <p className="text-sm text-muted-foreground mt-3">
              {hasNoJob
                ? "A job is required to generate reports."
                : isJobProcessing
                  ? "Job is still processing. Please wait for it to complete."
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
