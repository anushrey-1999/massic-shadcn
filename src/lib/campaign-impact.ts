import type { CampaignStatus, CampaignType } from "@/types/campaign-impact";
import { gbpLocationId, gbpLocations } from "@/lib/business-locations";

export interface CampaignLocationOption { value: string; label: string }

/** Campaigns can only be attributed to linked GBP locations, not to physical addresses. */
export function campaignLocationOptions(locations: unknown): CampaignLocationOption[] {
  const seen = new Set<string>();
  return gbpLocations(locations).flatMap(location => {
    const value = location.Name.trim();
    if (!value || seen.has(value)) return [];
    seen.add(value);
    const locationId = gbpLocationId(location);
    const displayName = location.DisplayName?.trim();
    return [{ value, label: displayName ? `${displayName} (${locationId})` : locationId }];
  });
}

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  tv: "TV", radio: "Radio", streaming_ctv: "Streaming / CTV", print: "Print",
  outdoor_billboard: "Outdoor / billboard", direct_mail: "Direct mail",
  sponsorship: "Sponsorship", event: "Event", pr_earned_media: "PR / earned media",
  influencer_creator: "Influencer / creator", other: "Other",
};

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; description: string; className: string }> = {
  scheduled: { label: "Scheduled", description: "Measurement will begin when the campaign starts.", className: "bg-blue-50 text-blue-700" },
  live: { label: "Live", description: "Observed values update while the campaign is running; final lift is not shown yet.", className: "bg-green-50 text-green-700" },
  collecting_data: { label: "Collecting data", description: "The impact window or source stabilization period is still open.", className: "bg-amber-50 text-amber-800" },
  impact_ready: { label: "Impact ready", description: "Campaign-period impact is ready while post-campaign data continues collecting.", className: "bg-indigo-50 text-indigo-700" },
  complete: { label: "Complete", description: "All comparison periods are complete.", className: "bg-green-50 text-green-700" },
  partial_data: { label: "Partial data", description: "At least one source or comparison date is unavailable.", className: "bg-amber-50 text-amber-800" },
  unavailable: { label: "Unavailable", description: "Connected sources cannot support a valid comparison for these dates.", className: "bg-neutral-100 text-neutral-700" },
};

export function formatCampaignDate(value: string | null | undefined): string {
  if (!value) return "Ongoing";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatCampaignDateRange(startValue: string, endValue: string | null | undefined): string {
  if (!endValue) return `${formatCampaignDate(startValue)} – Ongoing`;
  const [startYear, startMonth, startDay] = startValue.slice(0, 10).split("-").map(Number);
  const [endYear, endMonth, endDay] = endValue.slice(0, 10).split("-").map(Number);
  if (startYear !== endYear) return `${formatCampaignDate(startValue)} – ${formatCampaignDate(endValue)}`;
  const startMonthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(startYear, startMonth - 1, 1)));
  if (startMonth === endMonth) return `${startMonthLabel} ${startDay} – ${endDay}, ${startYear}`;
  const endMonthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(endYear, endMonth - 1, 1)));
  return `${startMonthLabel} ${startDay} – ${endMonthLabel} ${endDay}, ${startYear}`;
}

export function campaignApiError(error: unknown, fallback: string): string {
  const value = error as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
  return value?.response?.data?.error?.message || value?.response?.data?.message || value?.message || fallback;
}
