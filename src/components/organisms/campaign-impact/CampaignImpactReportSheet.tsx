"use client";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { CampaignImpactReportContent } from "@/components/organisms/campaign-impact/CampaignImpactReportContent";

interface CampaignImpactReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string | null;
  campaignId: string | null;
}

export function CampaignImpactReportSheet({
  open,
  onOpenChange,
  businessId,
  campaignId,
}: CampaignImpactReportSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showClose={false}
        className="w-full gap-0 overflow-y-auto border-l border-general-border p-0 sm:max-w-[920px]"
      >
        <SheetTitle className="sr-only">Campaign impact report</SheetTitle>
        {open && businessId && campaignId ? (
          <CampaignImpactReportContent
            businessId={businessId}
            campaignId={campaignId}
            variant="sheet"
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
