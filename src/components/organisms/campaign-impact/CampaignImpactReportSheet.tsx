"use client";

import * as React from "react";
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
  const contentRef = React.useRef<HTMLDivElement>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={contentRef}
        showClose={false}
        tabIndex={-1}
        onOpenAutoFocus={event => {
          event.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }}
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
