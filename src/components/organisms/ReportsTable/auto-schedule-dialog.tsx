"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TIME_PERIODS } from "@/hooks/use-gsc-analytics";
import {
  useCreateAutoSchedule,
  useUpdateAutoSchedule
} from "@/hooks/use-auto-schedules";
import type { AutoSchedule } from "@/types/auto-schedule-types";

interface AutoScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  existingSchedule?: AutoSchedule | null;
}

export function AutoScheduleDialog({
  isOpen,
  onClose,
  businessId,
  existingSchedule,
}: AutoScheduleDialogProps) {
  const [period, setPeriod] = React.useState("3 months");
  const [frequency, setFrequency] = React.useState<"weekly" | "monthly">("weekly");
  const [requiresApproval, setRequiresApproval] = React.useState<boolean>(true);
  const [watermarkReport, setWatermarkReport] = React.useState<boolean>(true);
  const [isActive, setIsActive] = React.useState<boolean>(true);

  const createAutoSchedule = useCreateAutoSchedule();
  const updateAutoSchedule = useUpdateAutoSchedule();

  const isEditMode = !!existingSchedule;

  React.useEffect(() => {
    if (isOpen) {
      if (existingSchedule) {
        setPeriod(existingSchedule.period || "3 months");
        setFrequency(existingSchedule.frequency);
        setRequiresApproval(existingSchedule.requiresApproval);
        setWatermarkReport(existingSchedule.watermarkReport);
        setIsActive(existingSchedule.isActive);
      } else {
        setPeriod("3 months");
        setFrequency("weekly");
        setRequiresApproval(true);
        setWatermarkReport(true);
        setIsActive(true);
      }
    }
  }, [isOpen, existingSchedule]);

  const handleToggleActive = async (checked: boolean) => {
    if (!existingSchedule) return;

    try {
      await updateAutoSchedule.mutateAsync({
        id: existingSchedule.id,
        data: { isActive: checked },
        businessId,
      });

      setIsActive(checked);
      toast.success(`Auto-schedule ${checked ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update auto-schedule", {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    }
  };

  const handleSave = async () => {
    if (!businessId) return;

    try {
      if (isEditMode && existingSchedule) {
        await updateAutoSchedule.mutateAsync({
          id: existingSchedule.id,
          data: {
            frequency,
            period,
            requiresApproval,
            watermarkReport,
            isActive,
          },
          businessId,
        });

        toast.success("Auto-schedule updated successfully");
      } else {
        await createAutoSchedule.mutateAsync({
          businessId,
          frequency,
          period,
          requiresApproval,
          watermarkReport,
        });

        toast.success("Auto-schedule created successfully", {
          description: `Reports will be generated ${frequency} starting from the first day.`,
        });
      }
      onClose();
    } catch (error) {
      toast.error(`Failed to ${isEditMode ? "update" : "create"} auto-schedule`, {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    }
  };

  const isLoading = createAutoSchedule.isPending || updateAutoSchedule.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 bg-white border-[#E5E5E5] rounded-[10px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        showCloseButton={false}
      >
        {/* Dialog Header */}
        <div className="flex flex-col items-start p-4 w-full">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="font-semibold text-[20px] leading-[1.2] tracking-[-0.4px] text-[#0A0A0A]">
              Auto-Schedule
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="h-4 w-4 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-[#525252]" strokeWidth={1.5} />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-[#E5E5E5] w-full" />

        {/* Content */}
        <div className="flex flex-col gap-3 items-center justify-center pt-4 px-4 pb-0 w-full">
          {/* Toggle Switch - Only shown when schedule exists */}
          {isEditMode && (
            <div className=" flex items-center justify-between p-2 rounded-[8px] w-full">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={handleToggleActive}
                  disabled={isLoading}
                  className="data-[state=checked]:bg-[#2E6A56] cursor-pointer"
                />
                <p className="font-normal text-[14px] leading-[1.5] tracking-[0.07px] text-[#404040]">
                  {isActive ? "On" : "Off"}
                </p>
              </div>
            </div>
          )}

          {/* Select Time Period Card */}
          <div className="bg-[#FAFAFA] flex flex-col gap-[6px] items-start p-2 rounded-[8px] w-full">
            <div className="flex gap-0 h-10 items-start w-full">
              <p className="font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#0A0A0A]">
                Select Time Period
              </p>
            </div>
            <Select value={period} onValueChange={setPeriod} disabled={isLoading}>
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

          {/* Select Frequency Card */}
          <div className="bg-[#FAFAFA] flex flex-col gap-[6px] items-start p-2 rounded-[8px] w-full">
            <div className="flex gap-0 items-start w-full">
              <p className="font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#0A0A0A]">
                Select Frequency
              </p>
            </div>
            <div className="flex flex-col gap-2 h-10 items-start justify-center w-full">
              <div className="flex gap-8 items-start w-full">
                <label className="flex gap-2 h-[21px] items-center cursor-pointer">
                  <div className="relative flex items-center justify-center h-4 w-4">
                    <input
                      type="radio"
                      checked={frequency === "weekly"}
                      onChange={() => setFrequency("weekly")}
                      disabled={isLoading}
                      className="peer absolute h-[15px] w-[15px] cursor-pointer appearance-none rounded-full border border-[#D4D4D4] bg-white checked:border-[#D4D4D4] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#0A0A0A] opacity-0 peer-checked:opacity-100" />
                  </div>
                  <span className="text-[14px] leading-[1.5] tracking-[0.07px] text-[#404040]">
                    Weekly
                  </span>
                </label>
                <label className="flex gap-2 h-[21px] items-center cursor-pointer">
                  <div className="relative flex items-center justify-center h-4 w-4">
                    <input
                      type="radio"
                      checked={frequency === "monthly"}
                      onChange={() => setFrequency("monthly")}
                      disabled={isLoading}
                      className="peer absolute h-[15px] w-[15px] cursor-pointer appearance-none rounded-full border border-[#D4D4D4] bg-white checked:border-[#D4D4D4] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#0A0A0A] opacity-0 peer-checked:opacity-100" />
                  </div>
                  <span className="text-[14px] leading-[1.5] tracking-[0.07px] text-[#404040]">
                    Monthly
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Requires Approval Card */}
          <div className="bg-[#FAFAFA] flex flex-col gap-[6px] items-start p-2 rounded-[8px] w-full">
            <div className="flex gap-0 items-start w-full">
              <p className="font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#0A0A0A]">
                Requires approval before sending
              </p>
            </div>
            <div className="flex flex-col gap-2 h-10 items-start justify-center w-full">
              <div className="flex gap-8 items-start w-full">
                <label className="flex gap-2 h-[21px] items-center cursor-pointer">
                  <div className="relative flex items-center justify-center h-4 w-4">
                    <input
                      type="radio"
                      checked={requiresApproval === true}
                      onChange={() => setRequiresApproval(true)}
                      disabled={isLoading}
                      className="peer absolute h-[15px] w-[15px] cursor-pointer appearance-none rounded-full border border-[#D4D4D4] bg-white checked:border-[#D4D4D4] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#0A0A0A] opacity-0 peer-checked:opacity-100" />
                  </div>
                  <span className="text-[14px] leading-[1.5] tracking-[0.07px] text-[#404040]">
                    Yes
                  </span>
                </label>
                <label className="flex gap-2 h-[21px] items-center cursor-pointer">
                  <div className="relative flex items-center justify-center h-4 w-4">
                    <input
                      type="radio"
                      checked={requiresApproval === false}
                      onChange={() => setRequiresApproval(false)}
                      disabled={isLoading}
                      className="peer absolute h-[15px] w-[15px] cursor-pointer appearance-none rounded-full border border-[#D4D4D4] bg-white checked:border-[#D4D4D4] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <div className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#0A0A0A] opacity-0 peer-checked:opacity-100" />
                  </div>
                  <span className="text-[14px] leading-[1.5] tracking-[0.07px] text-[#404040]">
                    No
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Watermark Report Card */}
          <div className="bg-[#FAFAFA] flex items-center justify-between pl-2 pr-6 py-2 rounded-[8px] w-full">
            <div className="flex flex-col gap-[6px] items-start">
              <p className="font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#0A0A0A]">
                Watermark Report
              </p>
              <div className="flex flex-col gap-2 h-10 items-start justify-center">
                <div className="flex gap-8 items-start w-full">
                  <label className="flex gap-2 h-[21px] items-center cursor-pointer">
                    <div className="relative flex items-center justify-center h-4 w-4">
                      <input
                        type="radio"
                        checked={watermarkReport === true}
                        onChange={() => setWatermarkReport(true)}
                        disabled={isLoading}
                        className="peer absolute h-[15px] w-[15px] cursor-pointer appearance-none rounded-full border border-[#D4D4D4] bg-white checked:border-[#D4D4D4] disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#0A0A0A] opacity-0 peer-checked:opacity-100" />
                    </div>
                    <span className="text-[14px] leading-[1.5] tracking-[0.07px] text-[#404040]">
                      Yes
                    </span>
                  </label>
                  <label className="flex gap-2 h-[21px] items-center cursor-pointer">
                    <div className="relative flex items-center justify-center h-4 w-4">
                      <input
                        type="radio"
                        checked={watermarkReport === false}
                        onChange={() => setWatermarkReport(false)}
                        disabled={isLoading}
                        className="peer absolute h-[15px] w-[15px] cursor-pointer appearance-none rounded-full border border-[#D4D4D4] bg-white checked:border-[#D4D4D4] disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#0A0A0A] opacity-0 peer-checked:opacity-100" />
                    </div>
                    <span className="text-[14px] leading-[1.5] tracking-[0.07px] text-[#404040]">
                      No
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Powered by Massic Logo */}
            <div className="h-[47px] w-[135px] flex items-center justify-center">
              <img
                src="/powered-by-massic.svg"
                alt="Powered by Massic"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="flex flex-col gap-0 items-center justify-center p-4 w-full">
          <div className="flex gap-2 items-center justify-end w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex gap-2 items-center justify-center min-h-9 px-4 py-[7.5px] bg-[rgba(255,255,255,0.1)] border border-[#D4D4D4] rounded-[8px] font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#0A0A0A] hover:bg-[rgba(0,0,0,0.05)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="flex gap-2 items-center justify-center min-h-9 px-4 py-[7.5px] bg-[#2E6A56] rounded-[8px] font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#FAFAFA] hover:bg-[#2E6A56]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Schedule" : "Save Changes")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
