"use client";

import * as React from "react";

import {
  buildPerformanceReportV2BodyHtml,
  PERFORMANCE_REPORT_V2_SCOPED_CSS,
  type PerformanceReportV2TemplateContext,
} from "@/utils/performance-report-v2-template";

interface PerformanceReportV2ViewProps {
  performanceReport: unknown;
  context?: PerformanceReportV2TemplateContext;
}

export function PerformanceReportV2View({ performanceReport, context }: PerformanceReportV2ViewProps) {
  const html = React.useMemo(
    () => buildPerformanceReportV2BodyHtml(performanceReport, context),
    [performanceReport, context]
  );

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#E3E2DF] bg-[#F4F3F0] shadow-sm">
      <style>{PERFORMANCE_REPORT_V2_SCOPED_CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
