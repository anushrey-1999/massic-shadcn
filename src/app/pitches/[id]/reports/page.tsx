"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  Zap,
  ListChecks,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  useStartQuickyReport,
  useQuickyReportStatus,
  useFetchReportFromDownloadUrl,
  extractSnapshotSectionsMarkdown,
} from "@/hooks/use-pitch-reports";
import { PitchReportViewer } from "@/components/templates/PitchReportViewer";
import {
  useGenerateDetailedReport,
} from "@/hooks/use-detailed-pitch-workflow";
import { api } from "@/hooks/use-api";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PitchesHistoryTable } from "@/components/organisms/PitchesTable/pitches-history-table";

export default function PitchReportsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const businessId = (params as any)?.id as string | undefined;

  const startQuickyMutation = useStartQuickyReport();
  const fetchReportMutation = useFetchReportFromDownloadUrl();
  const [snapshotStarted, setSnapshotStarted] = React.useState(false);
  const [detailedPolling, setDetailedPolling] = React.useState(false);

  const [activeReport, setActiveReport] = React.useState<
    "snapshot" | "detailed" | null
  >(null);
  const [reportContent, setReportContent] = React.useState<string>("");

  const generateDetailedReportMutation = useGenerateDetailedReport();

  const snapshotExistingQuery = useQuery({
    queryKey: ["quicky", "status", "existing", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      try {
        return await api.get("/client/quicky", "python", {
          params: { business_id: businessId },
        });
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!businessId && activeReport === null,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      const status = String(data?.status || "").trim().toLowerCase();
      return status === "pending" || status === "processing" ? 10_000 : false;
    },
  });

  const businessPitchesQuery = useQuery({
    queryKey: ["pitches", "business", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const res = await api.post<{ pitches?: any[] }>(
        "/pitches",
        "python",
        { business_ids: [businessId] }
      );
      const rows = Array.isArray(res?.pitches) ? res.pitches : [];
      // newest first
      return rows.slice().sort((a, b) => String(b?.created_at || "").localeCompare(String(a?.created_at || "")));
    },
    enabled: !!businessId && activeReport === null,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => {
      const rows = query.state.data as any[] | undefined;
      if (!Array.isArray(rows) || rows.length === 0) return false;
      const shouldPoll = rows.some((row) => {
        const status = String(row?.status || "").trim().toLowerCase();
        return status === "pending" || status === "processing" || status === "in_progress";
      });
      return shouldPoll ? 10_000 : false;
    },
  });

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

  const businessPitchRows = React.useMemo(() => {
    const rows = Array.isArray(businessPitchesQuery.data)
      ? businessPitchesQuery.data
      : [];
    return rows.map((pitch: any) => ({
      id: `${pitch.business_id}-${pitch.pitch_type}-${pitch.created_at}`,
      business_id: String(pitch.business_id || businessId || ""),
      business: businessName,
      type: String(pitch.pitch_type || "Unknown"),
      status: String(pitch.status || "N/A"),
      dateTime: String(pitch.created_at || "N/A"),
    }));
  }, [businessPitchesQuery.data, businessId, businessName]);

  const detailedExistingQuery = useQuery({
    queryKey: ["pitches", "status", "existing", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      try {
        return await api.get("/client/pitches", "python", {
          params: { business_id: businessId },
        });
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: false,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      const status = String(data?.status || "").trim().toLowerCase();
      return status === "pending" || status === "processing" ? 10_000 : false;
    },
  });

  const quickyStatusQuery = useQuickyReportStatus({
    businessId: activeReport === "snapshot" && snapshotStarted ? businessId ?? null : null,
    enabled: activeReport === "snapshot" && snapshotStarted,
  });

  const detailedReportQuery = useQuery({
    queryKey: ["detailed-report", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      try {
        return await api.get("/client/pitches", "python", {
          params: { business_id: businessId },
        });
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: activeReport === "detailed" && detailedPolling && !!businessId,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      const status = String(data?.status || "").trim().toLowerCase();
      return status === "pending" || status === "processing" ? 4000 : false;
    },
  });

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Pitches", href: "/pitches" },
    { label: businessName },
    { label: "Reports" },
  ];

  const isGenerating =
    startQuickyMutation.isPending ||
    fetchReportMutation.isPending ||
    generateDetailedReportMutation.isPending ||
    (activeReport === "snapshot" && snapshotStarted && quickyStatusQuery.isFetching) ||
    (activeReport === "detailed" && detailedPolling && detailedReportQuery.isFetching) ||
    false;

  const quickyStatus = React.useMemo(() => {
    const fromPoll = quickyStatusQuery.data?.status;
    const fromStart = startQuickyMutation.data?.status;
    return String(fromPoll ?? fromStart ?? "");
  }, [quickyStatusQuery.data?.status, startQuickyMutation.data?.status]);

  const snapshotStatus = React.useMemo(() => {
    return String(quickyStatus || "").trim().toLowerCase();
  }, [quickyStatus]);

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

  const detailedStatus = React.useMemo(() => {
    const data = detailedReportQuery.data as any;
    return String(data?.status || "").trim().toLowerCase();
  }, [detailedReportQuery.data]);

  const hasExistingSnapshot = snapshotExistingQuery.data != null;

  const viewerWorkflowStatus = React.useMemo(() => {
    if (activeReport === "snapshot") return snapshotStatus || "processing";
    if (activeReport === "detailed") {
      return detailedStatus || (generateDetailedReportMutation.isPending ? "processing" : "processing");
    }
    return undefined;
  }, [activeReport, snapshotStatus, detailedStatus, generateDetailedReportMutation.isPending]);

  const viewerShowWorkflowMessage = React.useMemo(() => {
    if (reportContent.trim()) return false;
    if (activeReport === "snapshot") {
      return (
        snapshotStarted ||
        startQuickyMutation.isPending ||
        Boolean(snapshotStatus)
      );
    }
    if (activeReport === "detailed") {
      return (
        detailedPolling ||
        generateDetailedReportMutation.isPending ||
        Boolean(detailedStatus)
      );
    }
    return false;
  }, [
    reportContent,
    activeReport,
    snapshotStarted,
    startQuickyMutation.isPending,
    snapshotStatus,
    detailedPolling,
    generateDetailedReportMutation.isPending,
    detailedStatus,
  ]);

  const shouldShowProcessingEmptyState = React.useMemo(() => {
    if (activeReport === null) return false;
    if (reportContent.trim()) return false;
    const status = String(viewerWorkflowStatus || "").trim().toLowerCase();
    return status === "pending" || status === "processing" || status === "error";
  }, [activeReport, reportContent, viewerWorkflowStatus]);

  const processingEmptyState = React.useMemo(() => {
    const status = String(viewerWorkflowStatus || "").trim().toLowerCase();

    if (status === "error") {
      return {
        title: "Report Error",
        description: "Something went wrong while preparing your report. Please try again.",
        isProcessing: false,
      };
    }

    if (status === "pending" || status === "processing") {
      return {
        title: "Report Processing",
        description: "Your report is being prepared. Data will be available shortly.",
        isProcessing: true,
      };
    }

    return {
      title: "Preparing Report",
      description: "Please wait.",
      isProcessing: true,
    };
  }, [viewerWorkflowStatus]);

  React.useEffect(() => {
    if (activeReport !== "detailed") return;
    if (!detailedPolling) return;

    if (detailedReportQuery.isError) {
      setActiveReport(null);
      setReportContent("");
      setDetailedPolling(false);
      toast.error("Failed to load detailed pitch", {
        description:
          (detailedReportQuery.error as any)?.message || "Please try again.",
      });
      return;
    }

    if (!detailedReportQuery.isSuccess) return;

    if (detailedReportQuery.data == null) {
      setActiveReport(null);
      setReportContent("");
      setDetailedPolling(false);
      toast.error("No detailed pitch found. Please generate it first.");
      return;
    }

    const data = detailedReportQuery.data as any;
    const content = String(data?.report || data?.content || "").trim();
    if (content && !reportContent.trim()) {
      setReportContent(content);
      setDetailedPolling(false);
      return;
    }
  }, [
    activeReport,
    detailedPolling,
    detailedReportQuery.isError,
    detailedReportQuery.isSuccess,
    detailedReportQuery.data,
    detailedReportQuery.error,
    detailedStatus,
    reportContent,
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

  const showReportView = activeReport !== null;

  const openDetailed = React.useMemo(() => {
    return String(searchParams?.get("open") || "").trim().toLowerCase() === "detailed";
  }, [searchParams]);

  const openSnapshot = React.useMemo(() => {
    return String(searchParams?.get("open") || "").trim().toLowerCase() === "snapshot";
  }, [searchParams]);

  const viewCards = React.useMemo(() => {
    return String(searchParams?.get("view") || "").trim().toLowerCase() === "cards";
  }, [searchParams]);

  const openParam = React.useMemo(() => {
    return String(searchParams?.get("open") || "").trim().toLowerCase();
  }, [searchParams]);
  const prevOpenParamRef = React.useRef<string>("");
  const handledViewCardsRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!viewCards || !businessId) {
      handledViewCardsRef.current = null;
      return;
    }

    // Guard against infinite loops: while `view=cards` is still in the URL,
    // `router.replace()` hasn't taken effect yet, so we must only run once.
    if (handledViewCardsRef.current === businessId) return;
    handledViewCardsRef.current = businessId;

    setActiveReport(null);
    setReportContent("");
    setSnapshotStarted(false);
    setDetailedPolling(false);
    startQuickyMutation.reset();
    fetchReportMutation.reset();
    generateDetailedReportMutation.reset();

    router.replace(`/pitches/${businessId}/reports`);
  }, [
    viewCards,
    businessId,
    router,
    startQuickyMutation,
    fetchReportMutation,
    generateDetailedReportMutation,
  ]);

  React.useEffect(() => {
    const prev = prevOpenParamRef.current;
    // If we arrived via deep link (?open=...) and then navigated to plain /reports,
    // reset the viewer state so the user sees the Snapshot/Detailed cards again.
    if (prev && !openParam) {
      setActiveReport(null);
      setReportContent("");
      setSnapshotStarted(false);
      setDetailedPolling(false);
      startQuickyMutation.reset();
      fetchReportMutation.reset();
      generateDetailedReportMutation.reset();
    }
    prevOpenParamRef.current = openParam;
  }, [
    openParam,
    startQuickyMutation,
    fetchReportMutation,
    generateDetailedReportMutation,
  ]);

  React.useEffect(() => {
    if (!openDetailed) return;
    if (!businessId) return;
    if (activeReport) return;

    queryClient.removeQueries({ queryKey: ["detailed-report", businessId] });
    setActiveReport("detailed");
    setReportContent("");
    setDetailedPolling(true);
  }, [openDetailed, businessId, activeReport, queryClient]);

  React.useEffect(() => {
    if (!openSnapshot) return;
    if (!businessId) return;
    if (activeReport) return;

    queryClient.removeQueries({ queryKey: ["quicky", "status", businessId] });
    setActiveReport("snapshot");
    setReportContent("");
    setSnapshotStarted(true);
    startQuickyMutation.reset();
    fetchReportMutation.reset();
  }, [openSnapshot, businessId, activeReport, queryClient, startQuickyMutation, fetchReportMutation]);

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />

      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5">
        {showReportView ? (
          shouldShowProcessingEmptyState ? (
            <EmptyState
              title={processingEmptyState.title}
              description={processingEmptyState.description}
              className="h-[calc(100vh-12rem)]"
              isProcessing={processingEmptyState.isProcessing}
              buttons={[
                {
                  label: "Back",
                  href: businessId ? `/pitches/${businessId}/reports?view=cards` : "/pitches",
                  variant: "outline",
                  size: "lg",
                },
              ]}
            />
          ) : (
            <PitchReportViewer
              content={reportContent}
              reportTitle={reportTitle}
              isEditable={true}
              isGenerating={isGenerating}
              showStatus={
                activeReport === "snapshot" &&
                !reportContent.trim() &&
                (snapshotStarted ||
                  startQuickyMutation.isPending ||
                  Boolean(startQuickyMutation.data?.status))
              }
              statusText={quickyStatus ? `Status: ${quickyStatus}` : "Status: generating"}
              showWorkflowMessage={viewerShowWorkflowMessage}
              workflowStatus={viewerWorkflowStatus}
              onBack={() => {
                router.push(businessId ? `/pitches/${businessId}/reports?view=cards` : "/pitches");
              }}
            />
          )
        ) : (
          <div className="h-full bg-white rounded-lg p-6 flex flex-col gap-6 overflow-hidden">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => router.push("/pitches")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>

            <div className="flex gap-4 items-stretch justify-center ">
              <Card className="bg-white border border-general-primary p-8 w-[488px] shadow-none">
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
                    {hasExistingSnapshot ? (
                      <div className="flex gap-2">
                        <Button
                          size="lg"
                          className="flex-1"
                          disabled={!businessId}
                          onClick={() => {
                            if (!businessId) return;
                            queryClient.removeQueries({ queryKey: ["quicky", "status", businessId] });
                            setActiveReport("snapshot");
                            setReportContent("");
                            setSnapshotStarted(true);
                            startQuickyMutation.reset();
                            fetchReportMutation.reset();
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="flex-1"
                          disabled={!businessId || startQuickyMutation.isPending}
                          onClick={async () => {
                            if (!businessId) return;
                            queryClient.removeQueries({ queryKey: ["quicky", "status", businessId] });
                            setActiveReport("snapshot");
                            setReportContent("");
                            // Important: start POST first, then enable polling GET.
                            setSnapshotStarted(false);
                            startQuickyMutation.reset();
                            fetchReportMutation.reset();
                            await startQuickyMutation.mutateAsync({ businessId });
                            setSnapshotStarted(true);
                          }}
                        >
                          {startQuickyMutation.isPending ? "Generating..." : "Regenerate"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full"
                        disabled={!businessId || startQuickyMutation.isPending}
                        onClick={async () => {
                          if (!businessId) return;
                          queryClient.removeQueries({ queryKey: ["quicky", "status", businessId] });
                          setActiveReport("snapshot");
                          setReportContent("");
                          setSnapshotStarted(false);
                          startQuickyMutation.reset();
                          fetchReportMutation.reset();
                          await startQuickyMutation.mutateAsync({ businessId });
                          setSnapshotStarted(true);
                        }}
                      >
                        {startQuickyMutation.isPending ? "Generating..." : "Generate"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-general-primary p-8 w-[488px] shadow-none ">
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
                    <div className="w-full rounded-md bg-foreground-light px-4 py-2 text-center">
                      <Typography variant="small" className="text-general-muted-foreground">
                        Coming soon
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

             <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
               <div className="flex items-center justify-between mb-3">
                 <Typography variant="h4">Pitch history</Typography>
               </div>

               <PitchesHistoryTable
                 businessId={businessId || ""}
                 data={businessPitchRows}
                 isLoading={businessPitchesQuery.isLoading}
               />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
