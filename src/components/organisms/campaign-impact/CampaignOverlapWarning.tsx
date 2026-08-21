import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CampaignContamination } from "@/types/campaign-impact";

interface CampaignOverlapWarningProps {
  overlaps: CampaignContamination[];
  context: "form" | "report";
  primaryPeriodLabel?: "During" | "Impact";
}

const WINDOW_LABELS: Record<CampaignContamination["window"], string> = {
  baseline: "Before",
  campaign: "During",
  post_campaign: "After",
};

export function CampaignOverlapWarning({
  overlaps,
  context,
  primaryPeriodLabel = "During",
}: CampaignOverlapWarningProps) {
  if (!overlaps.length) return null;

  const details = overlaps.map(overlap => {
    const period = overlap.window === "campaign" ? primaryPeriodLabel : WINDOW_LABELS[overlap.window];
    return `${overlap.name} overlaps the ${period} period.`;
  });
  const summary = context === "form"
    ? "You can still save this campaign, but results may include activity from both campaigns."
    : "These results may include activity from another campaign.";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-1.5 rounded-[4px] border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium leading-4 text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Campaign overlap. ${summary} ${details.join(" ")}`}
        >
          <AlertTriangle className="size-3.5 shrink-0 text-amber-700" strokeWidth={1.75} aria-hidden="true" />
          Campaign overlap
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[320px] space-y-1.5 px-3 py-2.5 text-left">
        <p>{summary}</p>
        {details.map((detail, index) => <p key={`${overlaps[index].campaignId}-${overlaps[index].window}-${index}`} className="opacity-80">{detail}</p>)}
      </TooltipContent>
    </Tooltip>
  );
}
