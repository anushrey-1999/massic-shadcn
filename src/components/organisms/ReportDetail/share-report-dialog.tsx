"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import * as z from "zod";
import { api } from "@/hooks/use-api";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const emailSchema = z.string().email();

interface ShareReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportName: string;
  reportRunId: string;
}

export function ShareReportDialog({
  isOpen,
  onClose,
  reportName,
  reportRunId,
}: ShareReportDialogProps) {
  const [emailChips, setEmailChips] = React.useState<string[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const shareReportMutation = useMutation({
    mutationFn: async ({ emails, includeWatermark }: { emails: string[]; includeWatermark: boolean }) => {
      // Use longer timeout for share report API as it may take time to process
      return await api.post(
        `/analytics/report-runs/${encodeURIComponent(reportRunId)}/share`,
        "node",
        {
          emails,
          includeWatermark,
        },
        {
          timeout: 300000, // 5 minutes timeout
        }
      );
    },
    retry: false, // Don't retry - just wait for response
    onSuccess: () => {
      toast.success("Report shared successfully");
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "Failed to share report";
      toast.error(errorMessage);
    },
  });

  const form = useForm({
    defaultValues: {
      emails: [] as string[],
      includeWatermark: true,
    },
    onSubmit: async ({ value }) => {
      shareReportMutation.mutate({
        emails: emailChips,
        includeWatermark: value.includeWatermark,
      });
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      setEmailChips([]);
      setInputValue("");
      form.reset();
    }
  }, [isOpen]);

  const isValidEmail = (email: string): boolean => {
    try {
      emailSchema.parse(email);
      return true;
    } catch {
      return false;
    }
  };

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    if (!isValidEmail(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (emailChips.includes(trimmedEmail)) {
      toast.error("This email has already been added");
      return;
    }

    const newChips = [...emailChips, trimmedEmail];
    setEmailChips(newChips);
    form.setFieldValue("emails", newChips);
    setInputValue("");
  };

  const removeEmail = (emailToRemove: string) => {
    const newChips = emailChips.filter((email) => email !== emailToRemove);
    setEmailChips(newChips);
    form.setFieldValue("emails", newChips);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === "Backspace" && !inputValue && emailChips.length > 0) {
      removeEmail(emailChips[emailChips.length - 1]);
    }
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      addEmail(inputValue);
    }
  };

  const handleShare = async () => {
    if (emailChips.length === 0) {
      toast.error("Please enter at least one email address");
      return;
    }
    form.handleSubmit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !shareReportMutation.isPending && !open && onClose()}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 bg-white border-[#E5E5E5] rounded-[10px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        showCloseButton={false}
      >
        {/* Dialog Header */}
        <div className="flex flex-col items-start p-4 w-full">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="font-semibold text-[20px] leading-[1.2] tracking-[-0.4px] text-[#0A0A0A]">
              Share via email
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              disabled={shareReportMutation.isPending}
              className="h-4 w-4 shrink-0 opacity-70 hover:opacity-100 transition-opacity disabled:pointer-events-none"
            >
              <X className="h-4 w-4 text-[#525252]" strokeWidth={1.5} />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-[#E5E5E5] w-full" />

        {/* Report Name Section */}
        <div className="flex flex-col gap-6 items-center justify-center pt-4 px-4 pb-0 w-full">
          <div className="flex flex-col gap-[6px] items-start w-full">
            <p className="font-mono text-[12px] leading-[1.5] text-[#737373] w-full">
              {reportName}
            </p>
            <div className="h-px bg-[#E5E5E5] w-full" />
          </div>

          {/* Recipient Emails Card */}
          <div className="flex flex-col gap-[6px] items-start p-2 bg-[#FAFAFA] rounded-[8px] w-full">
            <div className="flex gap-0 h-10 items-start w-full">
              <p className="font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#0A0A0A]">
                Recipient Emails
              </p>
            </div>
            <div
              className="w-full min-h-10 px-3 py-2 bg-white rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] border-0 flex flex-wrap gap-2 items-center cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              {emailChips.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-1 bg-[#F5F5F5] border border-[#E5E5E5] rounded-[6px] px-2 py-1"
                >
                  <span className="text-[12px] leading-[1.5] text-[#0A0A0A]">
                    {email}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEmail(email);
                    }}
                    className="h-3 w-3 flex items-center justify-center hover:bg-[#E5E5E5] rounded-full transition-colors"
                    disabled={shareReportMutation.isPending}
                  >
                    <X className="h-2.5 w-2.5 text-[#737373]" strokeWidth={2} />
                  </button>
                </div>
              ))}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                placeholder={emailChips.length === 0 ? "name@email.com , name2@email.com " : ""}
                disabled={shareReportMutation.isPending}
                className="flex-1 min-w-[120px] h-6 text-[12px] leading-[1.5] tracking-[0.18px] text-[#0A0A0A] placeholder:text-[#737373] bg-transparent border-0 outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Include Watermark Card */}
          <form.Field name="includeWatermark">
            {(field) => (
              <div className="flex items-center justify-between pl-2 pr-6 py-2 bg-[#FAFAFA] rounded-[8px] w-full">
                <div className="flex flex-col gap-[6px] items-start">
                  <p className="font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#0A0A0A]">
                    Include Watermark
                  </p>
                  <div className="flex flex-col gap-2 h-10 items-start justify-center">
                    <div className="flex gap-8 items-start w-full">
                      <label className="flex gap-2 h-[21px] items-center cursor-pointer">
                        <div className="relative flex items-center justify-center h-4 w-4">
                          <input
                            type="radio"
                            checked={field.state.value === true}
                            onChange={() => field.handleChange(true)}
                            disabled={shareReportMutation.isPending}
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
                            checked={field.state.value === false}
                            onChange={() => field.handleChange(false)}
                            disabled={shareReportMutation.isPending}
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

                {/* Watermark Logo */}
                <div className="h-[47px] w-[135px] flex items-center justify-center">
                  <img
                    src="/powered-by-massic.svg"
                    alt="Powered by Massic"
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}
          </form.Field>
        </div>

        {/* Dialog Footer */}
        <div className="flex flex-col gap-0 items-center justify-center p-4 w-full">
          <div className="flex gap-2 items-center justify-end w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={shareReportMutation.isPending}
              className="flex gap-2 items-center justify-center min-h-9 px-4 py-[7.5px] bg-[rgba(255,255,255,0.1)] border border-[#D4D4D4] rounded-[8px] font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#0A0A0A] hover:bg-[rgba(0,0,0,0.05)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={shareReportMutation.isPending || emailChips.length === 0}
              className="flex gap-2 items-center justify-center min-h-9 px-4 py-[7.5px] bg-[#2E6A56] rounded-[8px] font-medium text-[14px] leading-[1.5] tracking-[0.07px] text-[#FAFAFA] hover:bg-[#2E6A56]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {shareReportMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {shareReportMutation.isPending ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
