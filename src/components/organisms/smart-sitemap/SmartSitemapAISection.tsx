"use client";

import { useMemo, useState } from "react";
import { AITrafficSection } from "@/components/organisms/analytics/AITrafficSection";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AIPageScope } from "@/hooks/use-ai-traffic";
import type { TimePeriodValue } from "@/utils/analytics-period";
import {
  getAvailableAnalyticsGroupings,
  getFallbackAnalyticsGrouping,
  type AnalyticsGroupBy,
} from "@/utils/analytics-chart-grouping";

const GROUPINGS: AnalyticsGroupBy[] = ["day", "week", "month"];

export function SmartSitemapAISection({
  businessId,
  period,
  scopeRevision,
  pageScope,
}: {
  businessId: string;
  period: TimePeriodValue;
  scopeRevision: number;
  pageScope: AIPageScope;
}) {
  const [desiredGrouping, setGrouping] = useState<AnalyticsGroupBy>("day");
  const [available, setAvailable] = useState(() =>
    getAvailableAnalyticsGroupings(pageScope.from, pageScope.to),
  );
  const groupBy = getFallbackAnalyticsGrouping(desiredGrouping, available);
  const scope = useMemo(
    () => ({ pageId: pageScope.pageId, from: pageScope.from, to: pageScope.to }),
    [pageScope.pageId, pageScope.from, pageScope.to],
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-general-muted-foreground">
          Sessions that started on this page. Goals are GA4 key events from those sessions.
        </p>
        <Tabs value={groupBy} onValueChange={(value) => setGrouping(value as AnalyticsGroupBy)}>
          <TabsList aria-label="AI chart grouping">
            {GROUPINGS.map((value) => (
              <TabsTrigger key={value} value={value} disabled={!available.includes(value)} className="cursor-pointer capitalize">
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <AITrafficSection
        businessId={businessId}
        period={period}
        scopeRevision={scopeRevision}
        pageScope={scope}
        groupBy={groupBy}
        onAvailableGroupingsChange={setAvailable}
        visibleLines={{ clicks: true, sessions: false }}
      />
    </div>
  );
}
