"use client";

import React from "react";
import { useParams } from "next/navigation";
import {
  Zap,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/molecules/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  useBusinessProfileById,
  useBusinessProfiles,
} from "@/hooks/use-business-profiles";
import { Badge } from "@/components/ui/badge";
import {
  useGenerateDetailedPitch,
  useStartQuickyReport,
  useQuickyReportStatus,
  useFetchReportFromDownloadUrl,
  extractSnapshotSectionsMarkdown,
} from "@/hooks/use-pitch-reports";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";
import { PitchReportViewer } from "@/components/templates/PitchReportViewer";
import {
  useTriggerWorkflow,
  usePollWorkflowStatus,
  useGetDetailedReport,
  useGenerateDetailedReport,
} from "@/hooks/use-detailed-pitch-workflow";

export default function PitchReportsPage() {
  const params = useParams();
  const businessId = (params as any)?.id as string | undefined;

  const startQuickyMutation = useStartQuickyReport();
  const fetchReportMutation = useFetchReportFromDownloadUrl();
  const detailedMutation = useGenerateDetailedPitch();

  // Detailed report workflow hooks
  const triggerWorkflowMutation = useTriggerWorkflow();
  const [snapshotStarted, setSnapshotStarted] = React.useState(false);
  const [detailedWorkflowStarted, setDetailedWorkflowStarted] = React.useState(false);

  const [activeReport, setActiveReport] = React.useState<
    "snapshot" | "detailed" | null
  >(null);
  const [reportContent, setReportContent] = React.useState<string>("");

  const detailedReportQuery = useGetDetailedReport(
    activeReport === "detailed" ? businessId ?? null : null
  );
  const generateDetailedReportMutation = useGenerateDetailedReport();

  const quickyStatusQuery = useQuickyReportStatus({
    businessId: activeReport === "snapshot" && snapshotStarted ? businessId ?? null : null,
    enabled: activeReport === "snapshot" && snapshotStarted,
  });

  const workflowStatusQuery = usePollWorkflowStatus(
    activeReport === "detailed" && detailedWorkflowStarted ? businessId ?? null : null,
    activeReport === "detailed" && detailedWorkflowStarted
  );

  const { profiles } = useBusinessProfiles();
  const { profileData: businessProfile } = useBusinessProfileById(
    businessId ?? null
  );

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
    { label: "Reports" },
  ];

  const isGenerating =
    detailedMutation.isPending ||
    startQuickyMutation.isPending ||
    fetchReportMutation.isPending ||
    triggerWorkflowMutation.isPending ||
    generateDetailedReportMutation.isPending ||
    (activeReport === "snapshot" && snapshotStarted && quickyStatusQuery.isFetching) ||
    (activeReport === "detailed" && detailedWorkflowStarted && workflowStatusQuery.isFetching);

  const quickyStatus = React.useMemo(() => {
    const fromPoll = quickyStatusQuery.data?.status;
    const fromStart = startQuickyMutation.data?.status;
    return String(fromPoll ?? fromStart ?? "");
  }, [quickyStatusQuery.data?.status, startQuickyMutation.data?.status]);

  // Auto-resume detailed report polling if workflow is still in progress
  React.useEffect(() => {
    if (!businessId) return;
    if (activeReport === "detailed") return; // Already polling
    if (detailedWorkflowStarted) return; // Already started
    
    // Check if workflow is still in progress by triggering once
    triggerWorkflowMutation
      .mutateAsync({ businessId })
      .then((data) => {
        const status = String(data?.status || "").toLowerCase().trim();
        // If workflow is still processing, resume polling
        if (status === "pending" || status === "processing") {
          setActiveReport("detailed");
          setReportContent("");
          setDetailedWorkflowStarted(true);
        }
      })
      .catch(() => {
        // Silent fail - workflow might not exist yet
      });
  }, [businessId]); // Only run once on mount

  React.useEffect(() => {
    if (activeReport !== "snapshot") return;
    if (!snapshotStarted) return;
    if (!businessId) return;

    const status = String(quickyStatus).trim().toLowerCase();
    const snapshotFromPayload =
      extractSnapshotSectionsMarkdown(quickyStatusQuery.data) ||
      extractSnapshotSectionsMarkdown(startQuickyMutation.data);
    const downloadUrl =
      quickyStatusQuery.data?.output_data?.download_url ||
      startQuickyMutation.data?.output_data?.download_url;

    if (status !== "success") return;

    if (snapshotFromPayload && !reportContent.trim()) {
      setReportContent(snapshotFromPayload);
      return;
    }

    if (!downloadUrl) return;
    if (reportContent.trim()) return;
    if (fetchReportMutation.isPending || fetchReportMutation.isSuccess) return;

    fetchReportMutation
      .mutateAsync({ downloadUrl })
      .then((content) => {
        setReportContent(content);
      })
      .catch(() => {
        // toast handled in hook
      });
  }, [
    activeReport,
    snapshotStarted,
    businessId,
    quickyStatus,
    quickyStatusQuery.data?.output_data?.download_url,
    startQuickyMutation.data?.output_data?.download_url,
    reportContent,
    fetchReportMutation.isPending,
    fetchReportMutation.isSuccess,
  ]);

  const reportTitle = React.useMemo(() => {
    const match = (reportContent || "").match(/^#{1,6}\s+(.+)$/m);
    if (match?.[1]) return match[1].trim();
    return activeReport === "detailed"
      ? "Detailed Report"
      : activeReport === "snapshot"
        ? "Snapshot Report"
        : "Report";
  }, [reportContent, activeReport]);

  // Handle detailed report workflow
  const workflowStatus = React.useMemo(() => {
    return String(workflowStatusQuery.data?.status || "").toLowerCase().trim();
  }, [workflowStatusQuery.data?.status]);

  React.useEffect(() => {
    if (activeReport !== "detailed") return;
    if (!detailedWorkflowStarted) return;
    if (!businessId) return;

    // Workflow is success, try to get the report
    if (workflowStatus === "success") {
      if (reportContent.trim()) return; // Already have content

      // Check if report already exists
      if (detailedReportQuery.isSuccess && detailedReportQuery.data) {
        const existingContent = detailedReportQuery.data?.report || detailedReportQuery.data?.content;
        if (existingContent) {
          setReportContent(existingContent);
          return;
        }
      }

      // Report doesn't exist, generate it
      if (generateDetailedReportMutation.isPending) return;
      if (generateDetailedReportMutation.isSuccess) return;

      generateDetailedReportMutation
        .mutateAsync({ businessId })
        .then((data) => {
          const content = data?.report || data?.content || "";
          setReportContent(content);
        })
        .catch(() => {
          // toast handled in hook
        });
    }
  }, [
    activeReport,
    detailedWorkflowStarted,
    businessId,
    workflowStatus,
    reportContent,
    detailedReportQuery.data,
    detailedReportQuery.isSuccess,
    generateDetailedReportMutation,
  ]);

  const showReportView = activeReport !== null;

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />

      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5">
        {showReportView ? (
          <PitchReportViewer
            content={reportContent}
            reportTitle={reportTitle}
            isEditable={true}
            isGenerating={isGenerating}
            showStatus={activeReport === "snapshot" && snapshotStarted && !reportContent.trim()}
            statusText={quickyStatus ? `Status: ${quickyStatus}` : "Status: generating"}
            showWorkflowMessage={activeReport === "detailed" && detailedWorkflowStarted && workflowStatus !== "success"}
            workflowStatus={workflowStatus}
            onBack={() => {
              setActiveReport(null);
              setReportContent("");
              setSnapshotStarted(false);
              startQuickyMutation.reset();
              fetchReportMutation.reset();
            }}
          />
        ) : (
          <div className="flex gap-4 h-full bg-white rounded-lg items-center justify-center p-6">
          <Card className="bg-white border border-general-primary p-8 h-[652px] w-[488px] shadow-none">
            <CardContent className="p-0 h-full flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Zap className="h-7.5 w-7.5 text-general-primary" />
                <Typography
                  variant="h2"
                  className="text-general-primary font-semibold"
                >
                  Snapshot
                </Typography>
              </div>

              <div className="flex gap-2">
                <Badge
                  variant={"outline"}
                  className="text-[10px] text-primary py-1"
                >
                  5 pitches included in your Starter plan
                </Badge>
                <Badge
                  variant={"secondary"}
                  className="text-[10px] text-primary py-1"
                >
                  2 of 5 used
                </Badge>
              </div>

              <div className="flex-1">
                <Typography variant="p" className="text-primary">
                  A super-fast, low-cost snapshot of your SEO opportunity. In
                  10-20 seconds, it gives you a personalized, high-impact teaser
                  of where you stand and what you could gain—using only your
                  basic business info and current rankings. It's designed to
                  spark quick insight and help you decide when it's worth diving
                  deeper with a full Massic Pitch.
                </Typography>
              </div>

              <div className="mt-4">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!businessId || startQuickyMutation.isPending}
                  onClick={async () => {
                    if (!businessId) return;
                    setActiveReport("snapshot");
                    setReportContent("");
                    setSnapshotStarted(true);
                    startQuickyMutation.reset();
                    fetchReportMutation.reset();
                    await startQuickyMutation.mutateAsync({ businessId });
                  }}
                >
                  {startQuickyMutation.isPending ? "Generating..." : "Generate"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-general-primary p-8 h-[652px] w-[488px] shadow-none ">
            <CardContent className="p-0 h-full flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-7.5 w-7.5 text-general-primary" />
                <Typography
                  variant="h2"
                  className="text-general-primary font-semibold"
                >
                  Detailed
                </Typography>
              </div>

              <div className="flex gap-2">
                <Badge
                  variant={"outline"}
                  className="text-[10px] text-primary py-1"
                >
                 100 credits per pitch
                </Badge>
              </div>

              <div className="flex-1">
                <Typography
                  variant="p"
                  className="text-primary leading-relaxed"
                >
                  A full, data-driven growth proposal built from Massic's
                  complete strategy workflows. It combines deterministic
                  calculations, real search data, and the SEO Segment Matrix to
                  generate a rich, narrative plan tailored to your business.
                  This is the in-depth version—actionable, comprehensive, and
                  grounded entirely in your actual inputs and proven tactics.
                </Typography>
              </div>

              {/* <div className="mt-4">
                <Typography variant="small" className="text-general-muted-foreground text-center">
                  Generated on —
                </Typography>
              </div> */}

              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  disabled={!businessId || triggerWorkflowMutation.isPending || generateDetailedReportMutation.isPending}
                  onClick={async () => {
                    if (!businessId) return;
                    
                    setActiveReport("detailed");
                    setReportContent("");
                    setDetailedWorkflowStarted(true);
                    triggerWorkflowMutation.reset();
                    generateDetailedReportMutation.reset();
                    detailedReportQuery.refetch();
                    
                    // Trigger workflow to prepare detailed report
                    await triggerWorkflowMutation.mutateAsync({ businessId });
                  }}
                >
                  {triggerWorkflowMutation.isPending || generateDetailedReportMutation.isPending ? "Preparing..." : "View"}
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}
