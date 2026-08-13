"use client";

import * as React from "react";
import { AlertTriangle, Check, Clock3, Globe2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerField } from "@/components/molecules/DatePickerField";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { campaignApiError, CAMPAIGN_TYPE_LABELS, formatCampaignDate } from "@/lib/campaign-impact";
import { captureCampaignImpactEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import { useCampaignMutations } from "@/hooks/use-campaign-impact";
import { CampaignMessageBanner } from "@/components/organisms/campaign-impact/CampaignMessageBanner";
import { CampaignOverlapWarning } from "@/components/organisms/campaign-impact/CampaignOverlapWarning";
import { CAMPAIGN_TYPES, type CampaignEvent, type CampaignEventKind, type CampaignInput, type CampaignPreview, type CampaignType } from "@/types/campaign-impact";

interface LocationOption { value: string; label: string }
interface CampaignFormSheetProps {
  open: boolean; onOpenChange: (open: boolean) => void; businessId: string;
  locations: LocationOption[]; campaign?: CampaignEvent | null; onSaved?: (campaign: CampaignEvent) => void;
}

interface FormState {
  name: string; campaignType: CampaignType; eventKind: CampaignEventKind; startDate: string;
  endDate: string; notes: string; spendAmount: string; currencyCode: string;
  trackedTermsText: string; limitLocations: boolean; gbpLocationNames: string[];
}

const emptyForm: FormState = {
  name: "", campaignType: "tv", eventKind: "date_range", startDate: "", endDate: "",
  notes: "", spendAmount: "", currencyCode: "USD", trackedTermsText: "",
  limitLocations: false, gbpLocationNames: [],
};

function formFromCampaign(campaign: CampaignEvent | null | undefined): FormState {
  if (!campaign) return emptyForm;
  return {
    name: campaign.name, campaignType: campaign.campaignType, eventKind: campaign.eventKind,
    startDate: campaign.startDate, endDate: campaign.endDate || "", notes: campaign.notes || "",
    spendAmount: campaign.spendAmount == null ? "" : String(campaign.spendAmount),
    currencyCode: campaign.currencyCode || "USD",
    trackedTermsText: campaign.trackedTerms.map(term => term.display).join("\n"),
    limitLocations: campaign.gbpLocationNames !== null,
    gbpLocationNames: campaign.gbpLocationNames || [],
  };
}

function trackedTerms(text: string) {
  return text.split(/[\n,]/).map(term => term.trim()).filter(Boolean);
}

function toInput(businessId: string, form: FormState): CampaignInput {
  return {
    businessId, name: form.name.trim(), campaignType: form.campaignType, eventKind: form.eventKind,
    startDate: form.startDate, endDate: form.eventKind === "one_time" ? null : form.endDate || null,
    notes: form.notes.trim(), spendAmount: form.spendAmount || null,
    currencyCode: form.spendAmount ? form.currencyCode : null,
    trackedTerms: trackedTerms(form.trackedTermsText),
    gbpLocationNames: form.limitLocations ? form.gbpLocationNames : null,
  };
}

function WindowCard({ label, window }: { label: string; window: CampaignPreview["windows"]["baseline"] }) {
  return (
    <div className="min-w-0 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-general-foreground">
        {window ? `${formatCampaignDate(window.start)} – ${formatCampaignDate(window.end)}` : "Not available yet"}
      </p>
      {window ? <p className="mt-1 text-xs text-muted-foreground">{window.days} day{window.days === 1 ? "" : "s"}</p> : null}
    </div>
  );
}

export function CampaignFormSheet({ open, onOpenChange, businessId, locations, campaign, onSaved }: CampaignFormSheetProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [form, setForm] = React.useState<FormState>(() => formFromCampaign(campaign));
  const [preview, setPreview] = React.useState<CampaignPreview | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const requestKey = React.useRef(crypto.randomUUID());
  const mutations = useCampaignMutations(businessId);
  const saving = mutations.create.isPending || mutations.update.isPending;

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm(formFromCampaign(campaign));
    setPreview(null);
    setFormError(null);
    requestKey.current = crypto.randomUUID();
  }, [campaign, open]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
    setFormError(null);
  }

  function setLocationChecked(value: string, checked: boolean) {
    const selected = new Set(form.limitLocations ? form.gbpLocationNames : locations.map(location => location.value));
    if (checked) selected.add(value);
    else selected.delete(value);
    const nextSelection = locations.map(location => location.value).filter(location => selected.has(location));
    setForm(current => ({
      ...current,
      limitLocations: nextSelection.length !== locations.length,
      gbpLocationNames: nextSelection.length === locations.length ? [] : nextSelection,
    }));
    setFormError(null);
  }

  function validateFirstStep() {
    if (!form.name.trim()) return "Campaign name is required.";
    if (!form.startDate) return "Start date is required.";
    if (form.eventKind === "date_range" && form.endDate && form.endDate < form.startDate) return "End date must be on or after the start date.";
    if (form.spendAmount && Number(form.spendAmount) < 0) return "Spend cannot be negative.";
    return null;
  }

  async function continueToMeasurement() {
    const error = validateFirstStep();
    if (error) { setFormError(error); return; }
    try {
      const result = await mutations.preview.mutateAsync({
        ...toInput(businessId, form),
        ...(campaign ? { editingCampaignId: campaign.id } : {}),
      });
      captureCampaignImpactEvent("campaign_previewed", { business_id: businessId, campaign_type: form.campaignType, event_kind: form.eventKind, has_overlap: result.contamination.length > 0 });
      setPreview(result);
      setStep(2);
    } catch (previewError) {
      setFormError(campaignApiError(previewError, "The comparison windows could not be previewed."));
    }
  }

  async function save() {
    const terms = trackedTerms(form.trackedTermsText);
    if (terms.length > 25) { setFormError("Add no more than 25 tracked search terms."); return; }
    if (form.limitLocations && locations.length > 0 && form.gbpLocationNames.length === 0) { setFormError("Select at least one GBP location or use all locations."); return; }
    const input = toInput(businessId, form);
    try {
      const saved = campaign
        ? await mutations.update.mutateAsync({ id: campaign.id, input, expectedVersion: campaign.version })
        : await mutations.create.mutateAsync({ input, idempotencyKey: requestKey.current });
      captureCampaignImpactEvent(campaign ? "campaign_updated" : "campaign_created", { business_id: businessId, campaign_type: form.campaignType, event_kind: form.eventKind, has_overlap: Boolean(preview?.contamination.length) });
      toast.success(campaign ? "Campaign updated" : "Campaign added");
      onSaved?.(saved);
      onOpenChange(false);
    } catch (saveError) {
      setFormError(campaignApiError(saveError, "The campaign could not be saved."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={next => !saving && onOpenChange(next)}>
      <DialogContent
        className="grid max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[10px] p-0 sm:max-w-[680px]"
        aria-describedby="campaign-form-description"
      >
        <DialogHeader className="gap-1 border-b border-general-border px-5 py-4 pr-12 sm:px-6 sm:pr-12">
          <DialogTitle className="text-lg font-medium">{campaign ? "Edit campaign" : "Add campaign"}</DialogTitle>
          <DialogDescription id="campaign-form-description">
            {step === 1
              ? campaign ? "Update the campaign details and dates." : "Add the campaign details and dates."
              : "Review the comparison and choose optional tracking."}
          </DialogDescription>
          <p className="pt-1 text-xs text-muted-foreground" aria-label={`Step ${step} of 2`}>
            Step {step} of 2 · {step === 1 ? "Details" : "Measurement"}
          </p>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Event type <span className="text-destructive" aria-hidden="true">*</span></Label>
                <RadioGroup
                  value={form.eventKind}
                  onValueChange={value => {
                    set("eventKind", value as CampaignEventKind);
                    if (value === "one_time") set("endDate", "");
                  }}
                  className="flex flex-wrap items-center gap-x-8 gap-y-2"
                  aria-label="Event type"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-general-unofficial-mid-alt">
                    <RadioGroupItem value="date_range" />
                    Campaign
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-general-unofficial-mid-alt">
                    <RadioGroupItem value="one_time" />
                    One-time event
                  </label>
                </RadioGroup>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-name">Campaign name <span className="text-destructive" aria-hidden="true">*</span></Label>
                  <Input id="campaign-name" value={form.name} onChange={event => set("name", event.target.value)} placeholder="Summer TV campaign" maxLength={160} aria-required="true" />
                </div>
                <div className="space-y-1.5">
                  <Label>Campaign type <span className="text-destructive" aria-hidden="true">*</span></Label>
                  <Select value={form.campaignType} onValueChange={value => set("campaignType", value as CampaignType)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{CAMPAIGN_TYPES.map(type => <SelectItem key={type} value={type}>{CAMPAIGN_TYPE_LABELS[type]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className={cn("grid gap-4", form.eventKind === "date_range" && "sm:grid-cols-2")}>
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-start">Start date <span className="text-destructive" aria-hidden="true">*</span></Label>
                  <DatePickerField id="campaign-start" value={form.startDate} onChange={value => set("startDate", value)} placeholder="Choose start date" maxDate={form.endDate || undefined} clearable required />
                </div>
                {form.eventKind === "date_range" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="campaign-end">End date</Label>
                    <DatePickerField id="campaign-end" value={form.endDate} onChange={value => set("endDate", value)} placeholder="Ongoing" minDate={form.startDate || undefined} clearable />
                    <p className="text-xs text-muted-foreground">Leave blank while the campaign is running.</p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="campaign-notes">Notes</Label>
                <Textarea id="campaign-notes" value={form.notes} onChange={event => set("notes", event.target.value)} placeholder="Where it ran or other useful context" maxLength={5000} rows={3} className="min-h-[80px] resize-y" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-spend">Spend</Label>
                  <Input id="campaign-spend" type="number" inputMode="decimal" min="0" step="0.01" value={form.spendAmount} onChange={event => set("spendAmount", event.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-currency">Currency {form.spendAmount ? <span className="text-destructive" aria-hidden="true">*</span> : null}</Label>
                  <Input id="campaign-currency" value={form.currencyCode} onChange={event => set("currencyCode", event.target.value.toUpperCase().slice(0, 3))} disabled={!form.spendAmount} maxLength={3} aria-label="Three-letter currency code" />
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-general-border pt-3 text-xs text-muted-foreground">
                <Globe2 className="size-4 shrink-0" strokeWidth={1.5} />
                <span>All pages</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div><h3 className="text-sm font-medium">Comparison periods</h3><p className="mt-0.5 text-sm text-muted-foreground">Massic will compare these date ranges.</p></div>
              <div className="divide-y divide-general-border overflow-hidden rounded-[8px] border border-general-border sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <WindowCard label="Before" window={preview?.windows.baseline || null} />
                <WindowCard label={form.eventKind === "one_time" ? "Impact" : "During"} window={preview?.windows.primary || null} />
                <WindowCard label="After" window={preview?.windows.post || null} />
              </div>
              {preview?.windows.isOngoing ? (
                <CampaignMessageBanner
                  icon={Clock3}
                  title="Ongoing campaign"
                  description="Results update while the campaign runs. Add an end date to calculate final results."
                />
              ) : null}
              {preview?.contamination.length ? <CampaignOverlapWarning overlaps={preview.contamination} context="form" primaryPeriodLabel={form.eventKind === "one_time" ? "Impact" : "During"} /> : null}
              <div className="space-y-1.5"><Label htmlFor="tracked-terms">Tracked search terms <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="tracked-terms" value={form.trackedTermsText} onChange={event => set("trackedTermsText", event.target.value)} placeholder={"Brand offer\nCampaign slogan"} rows={4} className="min-h-[88px] resize-y" /><p className="text-xs text-muted-foreground">One per line, up to 25.</p></div>
              {locations.length ? (
                <div className="space-y-1.5">
                  <div><Label>Business Profile locations</Label><p className="mt-0.5 text-xs text-muted-foreground">All locations are selected by default.</p></div>
                  <div className="max-h-40 divide-y divide-general-border overflow-y-auto rounded-[8px] border border-general-border bg-white">
                    {locations.map(location => {
                      const checked = !form.limitLocations || form.gbpLocationNames.includes(location.value);
                      return <label key={location.value} className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-general-secondary"><Checkbox className="mt-0.5" checked={checked} onCheckedChange={next => setLocationChecked(location.value, next === true)} /><span className="min-w-0 break-words text-sm leading-5">{location.label}</span></label>;
                    })}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">No GBP locations are connected. Search and website measurement will still work.</p>}
            </div>
          )}
          {formError ? (
            <CampaignMessageBanner
              icon={AlertTriangle}
              title="Check the campaign"
              description={formError}
              variant="destructive"
              className="mt-5"
            />
          ) : null}
        </div>

        <DialogFooter className="flex-row justify-between border-t border-general-border px-5 py-4 sm:px-6">
          {step === 2 ? <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={saving}>Back</Button> : <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>}
          {step === 1 ? <Button type="button" onClick={continueToMeasurement} disabled={mutations.preview.isPending}>{mutations.preview.isPending ? <><Loader2 className="size-4 animate-spin" />Checking</> : "Continue"}</Button> : <Button type="button" onClick={save} disabled={saving}>{saving ? <><Loader2 className="size-4 animate-spin" />Saving</> : <><Check className="size-4" />{campaign ? "Save changes" : "Add campaign"}</>}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
