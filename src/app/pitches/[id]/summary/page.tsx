"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/molecules/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  useBusinessProfileById,
  useBusinessProfiles,
} from "@/hooks/use-business-profiles";
import { usePitchSummary } from "@/hooks/use-pitch-reports";
import { PitchReportViewer } from "@/components/templates/PitchReportViewer";

export default function PitchSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = (params as any)?.id as string | undefined;
  const [requestKey] = React.useState(() => crypto.randomUUID());

  const { profiles } = useBusinessProfiles();
  const { profileData: businessProfile } = useBusinessProfileById(
    businessId ?? null
  );

  const {
    data: summaryData,
    isLoading,
    isError,
    error,
  } = usePitchSummary(businessId ?? null, { requestKey });

  const businessName = React.useMemo(() => {
    const profileFromList = profiles.find((p) => p.UniqueId === businessId);
    return (
      profileFromList?.Name ||
      profileFromList?.DisplayName ||
      businessProfile?.Name ||
      businessProfile?.DisplayName ||
      "Business"
    );
  }, [
    profiles,
    businessId,
    businessProfile?.Name,
    businessProfile?.DisplayName,
  ]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Pitches", href: "/pitches" },
    { label: businessName },
    { label: "Summary" },
  ];

  const reportTitle = React.useMemo(() => {
    if (!summaryData?.content) return "Pitch Summary";
    const match = summaryData.content.match(/^#{1,6}\s+(.+)$/m);
    return match?.[1]?.trim() || "Pitch Summary";
  }, [summaryData?.content]);

  const summaryStatus = React.useMemo(() => {
    return String(summaryData?.status || "").trim().toLowerCase();
  }, [summaryData?.status]);

  const isSummarySuccess =
    Boolean(summaryData?.content?.trim()) && summaryStatus === "success";

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />

      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5">
        {isLoading && !summaryData ? (
          <div className="h-full bg-white rounded-lg p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-general-primary" />
              <Typography variant="muted">Loading summary...</Typography>
            </div>
          </div>
        ) : isError ? (
          <div className="h-full bg-white rounded-lg p-6 flex items-center justify-center">
            <Card className="bg-general-background border border-general-border p-8 max-w-md">
              <CardContent className="p-0 flex flex-col items-center gap-4 text-center">
                <Typography variant="h3" className="text-general-destructive">
                  Unable to load summary
                </Typography>
                <Typography variant="p" className="text-general-muted-foreground">
                  {error?.message || "Please try again."}
                </Typography>
                <Button
                  variant="default"
                  onClick={() => router.push(`/pitches/${businessId}/reports`)}
                  className="mt-4"
                >
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : !summaryData ? (
          <div className="h-full bg-white rounded-lg p-6 flex items-center justify-center">
            <Card className="bg-general-background border border-general-border p-8 max-w-md">
              <CardContent className="p-0 flex flex-col items-center gap-4 text-center">
                <Typography variant="h3" className="text-general-destructive">
                  No Summary Found
                </Typography>
                <Typography variant="p" className="text-general-muted-foreground">
                  No pitch summary has been generated for this business yet.
                </Typography>
                <Button
                  variant="default"
                  onClick={() => router.push(`/pitches/${businessId}/reports`)}
                  className="mt-4"
                >
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : !isSummarySuccess ? (
          <div className="h-full bg-white rounded-lg p-6 flex items-center justify-center">
            <Card className="bg-general-background border border-general-border p-8 max-w-md">
              <CardContent className="p-0 flex flex-col items-center gap-4 text-center">
                <Typography variant="h3" className="text-general-primary">
                  Summary Status
                </Typography>
                <Typography variant="p" className="text-general-muted-foreground">
                  Status: {summaryStatus || "unknown"}
                </Typography>
                <Button
                  variant="default"
                  onClick={() => router.push(`/pitches/${businessId}/reports`)}
                  className="mt-4"
                >
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <PitchReportViewer
            content={summaryData?.content || ""}
            reportTitle={reportTitle}
            isEditable={true}
            isGenerating={false}
            showStatus={false}
            onBack={() =>
              router.push(businessId ? `/pitches/${businessId}/reports?view=cards` : "/pitches")
            }
          />
        )}
      </div>
    </div>
  );
}
