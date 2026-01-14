"use client";

import * as React from "react";

import { PageHeader } from "@/components/molecules/PageHeader";
import { useBusinessProfileById } from "@/hooks/use-business-profiles";
import { ReportDetailClient } from "@/components/organisms/ReportDetail/report-detail-client";

interface PageProps {
  params: Promise<{
    id: string;
    reportRunId: string;
  }>;
}

export default function ReportRunDetailPage({ params }: PageProps) {
  const [state, setState] = React.useState<{ id: string; reportRunId: string } | null>(null);

  React.useEffect(() => {
    params.then(({ id, reportRunId }) => setState({ id, reportRunId }));
  }, [params]);

  const businessId = state?.id || null;
  const reportRunId = state?.reportRunId || null;

  const { profileData } = useBusinessProfileById(businessId);
  const businessName = profileData?.Name || profileData?.DisplayName || "Business";

  const breadcrumbs = React.useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: businessName },
      { label: "Analytics", href: state ? `/business/${state.id}/analytics` : undefined },
      { label: "Reports", href: state ? `/business/${state.id}/reports` : undefined },
      { label: "Report Details" },
    ],
    [state, businessName]
  );

  if (!state || !businessId || !reportRunId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} />
      <div className="w-full max-w-[1224px] flex-1 min-h-0 flex flex-col">
        <ReportDetailClient businessId={businessId} reportRunId={reportRunId} />
      </div>
    </div>
  );
}

