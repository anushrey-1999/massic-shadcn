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
  extractExpressPitch,
  extractSnapshotSectionsMarkdown,
  extractDetailedSectionsMarkdown,
} from "@/hooks/use-pitch-reports";
import { PitchReportViewer } from "@/components/templates/PitchReportViewer";
import { SnapshotReportViewer } from "@/components/templates/SnapshotReportViewer";
import {
  useGenerateDetailedReport,
} from "@/hooks/use-detailed-pitch-workflow";
import { api } from "@/hooks/use-api";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PitchesHistoryTable } from "@/components/organisms/PitchesTable/pitches-history-table";
import { MassicOpportunitiesModal } from "@/components/molecules/MassicOpportunitiesModal";
import { ApplyCreditsModal } from "@/components/molecules/ApplyCreditsModal";
import { CreditModal } from "@/components/molecules/settings/CreditModal";
import { useCanExecuteMassicOpportunities, useCancelMassicOpportunities, useSubscribeMassicOpportunities, useReactivateMassicOpportunities } from "@/hooks/use-massic-opportunities";
import { useExecutionCredits } from "@/hooks/use-execution-credits";
import { useAuthStore } from "@/store/auth-store";
import { formatDate, formatVolume } from "@/lib/format";
import { useQuickEvaluation } from "@/hooks/use-quick-evaluation";
import { useAgencyInfo } from "@/hooks/use-agency-settings";

export default function PitchReportsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const businessId = (params as any)?.id as string | undefined;
  const { user } = useAuthStore();
  const { agencyInfo } = useAgencyInfo();

  const startQuickyMutation = useStartQuickyReport();
  const fetchReportMutation = useFetchReportFromDownloadUrl();
  const quickEvaluationMutation = useQuickEvaluation();
  const [snapshotStarted, setSnapshotStarted] = React.useState(false);
  const [detailedPolling, setDetailedPolling] = React.useState(false);
  const [downloadedSnapshotExpressPitch, setDownloadedSnapshotExpressPitch] =
    React.useState<ReturnType<typeof extractExpressPitch>>(null);

  const [activeReport, setActiveReport] = React.useState<
    "snapshot" | "detailed" | null
  >(null);
  const [reportContent, setReportContent] = React.useState<string>("");
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = React.useState<string>("");

  const [showApplyCreditsModal, setShowApplyCreditsModal] = React.useState(false);
  const [applyCreditsReportType, setApplyCreditsReportType] = React.useState<"snapshot" | "detailed">("snapshot");
  const [showBuyCreditsModal, setShowBuyCreditsModal] = React.useState(false);
  const [buyCreditsAlertMessage, setBuyCreditsAlertMessage] = React.useState<string>("");
  const [pendingGenerateAction, setPendingGenerateAction] = React.useState<(() => Promise<void>) | null>(null);

  const {
    canExecuteSnapshot,
    canExecuteDetailed,
    needsUpgradeForSnapshot,
    needsUpgradeForDetailed,
    isLoading: massicOpportunitiesLoading,
    status,
    getSnapshotChipsData,
    getDetailedChipsData,
  } = useCanExecuteMassicOpportunities();

  const {
    creditsBalance,
    purchaseCredits,
    refetchData: refetchCreditsData,
  } = useExecutionCredits();

  const snapshotChips = getSnapshotChipsData();
  const detailedChips = getDetailedChipsData();

  const cancelMassicOpportunities = useCancelMassicOpportunities();
  const subscribeMassicOpportunities = useSubscribeMassicOpportunities();
  const reactivateMassicOpportunities = useReactivateMassicOpportunities();

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
        if (error?.response?.status === 403) return null;
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
    enabled: !!businessId,
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

  const businessWebsite = React.useMemo(() => {
    const profileFromList = profiles.find((p) => p.UniqueId === businessId) as any;
    const fromList = String(profileFromList?.Website || "").trim();
    const fromProfile = String((businessProfile as any)?.Website || "").trim();
    return fromList || fromProfile;
  }, [profiles, businessId, businessProfile]);

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

  const normalizeStatus = React.useCallback((value: unknown) => {
    return String(value || "").trim().toLowerCase();
  }, []);

  const isPitchTypeProcessing = React.useCallback(
    (pitchType: "snapshot" | "detailed") => {
      const rows = Array.isArray(businessPitchesQuery.data)
        ? businessPitchesQuery.data
        : [];
      return rows.some((row: any) => {
        const type = String(row?.pitch_type || "").trim().toLowerCase();
        if (type !== pitchType) return false;
        const status = normalizeStatus(row?.status);
        return status === "pending" || status === "processing" || status === "in_progress";
      });
    },
    [businessPitchesQuery.data, normalizeStatus]
  );

  const parseCreatedAt = React.useCallback((value: unknown): Date | null => {
    const raw = String(value || "").trim();
    if (!raw) return null;

    const native = new Date(raw);
    if (!Number.isNaN(native.getTime())) return native;

    // Supports "19-1-2026 5:31 AM" or "19-01-2026 05:31 PM"
    const m = raw.match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
    );
    if (!m) return null;

    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    let hour = Number(m[4]);
    const minute = Number(m[5]);
    const ampm = String(m[6]).toUpperCase();

    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }, []);

  const latestSuccessfulSnapshotCreatedAt = React.useMemo(() => {
    const rows = Array.isArray(businessPitchesQuery.data)
      ? businessPitchesQuery.data
      : [];

    const snapshots = rows
      .filter((r: any) => String(r?.pitch_type || "").trim().toLowerCase() === "snapshot")
      .filter((r: any) => String(r?.status || "").trim().toLowerCase() === "success");

    let latest: Date | null = null;
    for (const row of snapshots) {
      const dt = parseCreatedAt(row?.created_at);
      if (!dt) continue;
      if (!latest || dt.getTime() > latest.getTime()) latest = dt;
    }
    return latest;
  }, [businessPitchesQuery.data, parseCreatedAt]);

  const isSnapshotExpired = React.useMemo(() => {
    if (activeReport !== "snapshot") return false;
    if (!latestSuccessfulSnapshotCreatedAt) return false;

    // If user is generating/polling, do not block with expiry state.
    if (startQuickyMutation.isPending || snapshotStarted) return false;

    const now = Date.now();
    const ageMs = now - latestSuccessfulSnapshotCreatedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return ageDays > 30;
  }, [
    activeReport,
    latestSuccessfulSnapshotCreatedAt,
    startQuickyMutation.isPending,
    snapshotStarted,
  ]);

  const hasUsageRemaining = React.useCallback((type: "snapshot" | "detailed") => {
    if (!status) return false;
    if (status.whitelisted) return true;

    const hasSubscription = status.has_subscription && status.status === "active";

    if (type === "snapshot") {
      if (hasSubscription) {
        const used = status.usage?.snapshot_report?.used ?? 0;
        const limit = status.usage?.snapshot_report?.limit ?? 15;
        return used < limit;
      } else {
        const used = status.free_snapshots?.used ?? 0;
        const limit = status.free_snapshots?.limit ?? 3;
        return used < limit;
      }
    }

    if (type === "detailed") {
      if (hasSubscription) {
        const used = status.usage?.detailed_pitch?.used ?? 0;
        const limit = status.usage?.detailed_pitch?.limit ?? 3;
        return used < limit;
      }
      return false;
    }

    return false;
  }, [status]);

  const getUsageLimitForType = React.useCallback((type: "snapshot" | "detailed") => {
    if (!status) return 0;
    const hasSubscription = status.has_subscription && status.status === "active";

    if (type === "snapshot") {
      if (hasSubscription) {
        return status.usage?.snapshot_report?.limit ?? 15;
      }
      return status.free_snapshots?.limit ?? 3;
    }

    if (type === "detailed") {
      if (hasSubscription) {
        return status.usage?.detailed_pitch?.limit ?? 3;
      }
    }

    return 0;
  }, [status]);

  const getCreditsRequiredForType = (type: "snapshot" | "detailed") => {
    return type === "snapshot" ? 10 : 100;
  };

  const handleGenerateWithCreditsCheck = React.useCallback(
    async (
      type: "snapshot" | "detailed",
      generateFn: () => Promise<void>
    ) => {
      if (!status) return;

      const hasSubscription = status.has_subscription && status.status === "active";
      const hasUsage = hasUsageRemaining(type);

      if (!hasSubscription && type === "detailed") {
        setUpgradeModalMessage("Subscribe to Massic Opportunities to generate detailed reports.");
        setShowUpgradeModal(true);
        return;
      }

      if (!hasSubscription && type === "snapshot" && !hasUsage) {
        const freeLimit = status.free_snapshots?.limit ?? 3;
        setUpgradeModalMessage(`You've used all ${freeLimit} free snapshot reports. Subscribe to Massic Opportunities to continue generating snapshot reports.`);
        setShowUpgradeModal(true);
        return;
      }

      if (hasUsage) {
        await generateFn();
        return;
      }

      const creditsRequired = getCreditsRequiredForType(type);
      const currentCredits = creditsBalance?.current_balance ?? 0;

      if (currentCredits >= creditsRequired) {
        setApplyCreditsReportType(type);
        setPendingGenerateAction(() => generateFn);
        setShowApplyCreditsModal(true);
      } else {
        const limit = getUsageLimitForType(type);
        const reportTypeName = type === "snapshot" ? "snapshot reports" : "detailed reports";
        setBuyCreditsAlertMessage(
          `You've used all ${limit} ${reportTypeName} on the Massic Opportunities plan. Apply ${creditsRequired} Execution Credits to keep generating.`
        );
        setApplyCreditsReportType(type);
        setPendingGenerateAction(() => generateFn);
        setShowBuyCreditsModal(true);
      }
    },
    [status, hasUsageRemaining, creditsBalance, getUsageLimitForType]
  );

  const handleApplyCreditsConfirm = React.useCallback(async () => {
    if (pendingGenerateAction) {
      setShowApplyCreditsModal(false);
      await pendingGenerateAction();
      setPendingGenerateAction(null);
      refetchCreditsData();
    }
  }, [pendingGenerateAction, refetchCreditsData]);

  const detailedExistingQuery = useQuery({
    queryKey: ["detailed", "status", "existing", businessId],
    queryFn: async () => {
      if (!businessId) return null;
      try {
        return await api.get("/client/pitches", "python", {
          params: { business_id: businessId },
        });
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        if (error?.response?.status === 403) return null;
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
        if (error?.response?.status === 403) return null;
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

  const snapshotExpressPitch = React.useMemo(() => {
    return (
      downloadedSnapshotExpressPitch ||
      extractExpressPitch(quickyStatusQuery.data) ||
      extractExpressPitch(startQuickyMutation.data) ||
      extractExpressPitch(snapshotExistingQuery.data)
    );
  }, [
    downloadedSnapshotExpressPitch,
    quickyStatusQuery.data,
    startQuickyMutation.data,
    snapshotExistingQuery.data,
  ]);

  const snapshotProfileTags = React.useMemo(() => {
    const tags: { label: string; value: string }[] = [];

    const objective = String((businessProfile as any)?.BusinessObjective || "").trim().toLowerCase();
    const market =
      objective === "local"
        ? "Local"
        : objective === "online"
          ? "Online"
          : "";
    if (market) tags.push({ label: "Market", value: market });

    const locationType = String((businessProfile as any)?.LocationType || "").trim().toLowerCase();
    const sells =
      locationType === "products"
        ? "Products"
        : locationType === "services"
          ? "Services"
          : locationType === "both"
            ? "Both"
            : "";
    if (sells) tags.push({ label: "Sells", value: sells });

    const ltvRaw = (businessProfile as any)?.LTV ?? (businessProfile as any)?.ltv;
    const ltvNum = typeof ltvRaw === "number" ? ltvRaw : Number(ltvRaw);
    if (Number.isFinite(ltvNum) && ltvNum > 0) {
      tags.push({ label: "LTV", value: `$${formatVolume(ltvNum)}` });
    } else {
      const ltvStr = String(ltvRaw ?? "").trim();
      if (ltvStr) tags.push({ label: "LTV", value: ltvStr });
    }

    const segment = snapshotExpressPitch?.segment;
    const segmentNum = typeof segment === "number" ? segment : Number(segment);
    if (Number.isFinite(segmentNum)) {
      tags.push({ label: "Segment", value: `#${segmentNum}` });
    }

    return tags;
  }, [businessProfile, snapshotExpressPitch?.segment]);

  const snapshotCompetitors = React.useMemo(() => {
    const rows = (businessProfile as any)?.Competitors;
    if (!Array.isArray(rows)) return [];
    return rows
      .map((c: any) => ({
        name: String(c?.name || "").trim() || null,
        website: String(c?.website || "").trim(),
      }))
      .filter((c: any) => c.website);
  }, [businessProfile]);

  const snapshotFooterSummary = React.useMemo(() => {
    const parts: string[] = [];
    const segment = snapshotExpressPitch?.segment;
    const segmentNum = typeof segment === "number" ? segment : Number(segment);
    if (Number.isFinite(segmentNum)) parts.push(`Segment #${segmentNum}`);

    for (const t of snapshotProfileTags) {
      const label = String(t.label || "").trim().toLowerCase();
      const value = String(t.value || "").trim();
      if (label === "segment") continue;
      if (!value) continue;

      if (label === "ltv") {
        const v = value.toLowerCase();
        if (v === "high" || v === "medium" || v === "low") {
          parts.push(`${v.charAt(0).toUpperCase()}${v.slice(1)} LTV`);
          continue;
        }
      }

      parts.push(value);
    }

    return parts.join(" · ");
  }, [snapshotExpressPitch?.segment, snapshotProfileTags]);

  const snapshotGeneratedAt = React.useMemo(() => {
    const fromHistory = latestSuccessfulSnapshotCreatedAt
      ? formatDate(latestSuccessfulSnapshotCreatedAt, "MMMM d, yyyy")
      : "";
    if (fromHistory) return fromHistory;
    return formatDate(new Date(), "MMMM d, yyyy");
  }, [latestSuccessfulSnapshotCreatedAt]);

  const quickEvaluationBusinessUrl = React.useMemo(() => {
    const fromSnapshot = String(snapshotExpressPitch?.url || "").trim();
    if (fromSnapshot) return fromSnapshot;
    return String(businessWebsite || "").trim();
  }, [snapshotExpressPitch?.url, businessWebsite]);

  const triggerQuickEvaluation = React.useCallback(
    (urlOverride?: string) => {
      const url = String(urlOverride || quickEvaluationBusinessUrl || "").trim();
      if (!url) return;
      if (quickEvaluationMutation.isPending) return;
      quickEvaluationMutation.mutate({ businessUrl: url });
    },
    [quickEvaluationBusinessUrl, quickEvaluationMutation]
  );

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
      .then((result) => {
        setReportContent(result.content);
        if (result.expressPitch) {
          setDownloadedSnapshotExpressPitch(result.expressPitch);
        }
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
  const hasExistingDetailed = detailedExistingQuery.data != null;

  const snapshotExistingStatus = React.useMemo(() => {
    return normalizeStatus((snapshotExistingQuery.data as any)?.status);
  }, [snapshotExistingQuery.data, normalizeStatus]);

  const detailedExistingStatus = React.useMemo(() => {
    return normalizeStatus((detailedExistingQuery.data as any)?.status);
  }, [detailedExistingQuery.data, normalizeStatus]);

  const isSnapshotProcessing = React.useMemo(() => {
    const fromExisting =
      snapshotExistingStatus === "pending" || snapshotExistingStatus === "processing";
    return fromExisting || isPitchTypeProcessing("snapshot");
  }, [snapshotExistingStatus, isPitchTypeProcessing]);

  const isDetailedProcessing = React.useMemo(() => {
    const fromExisting =
      detailedExistingStatus === "pending" || detailedExistingStatus === "processing";
    return fromExisting || isPitchTypeProcessing("detailed");
  }, [detailedExistingStatus, isPitchTypeProcessing]);

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

    const detailedFromPayload = extractDetailedSectionsMarkdown(data);
    if (detailedFromPayload && !reportContent.trim()) {
      setReportContent(detailedFromPayload);
      setDetailedPolling(false);
      return;
    }

    const content = String(data?.report || data?.content || "").trim();
    if (content && !reportContent.trim()) {
      setReportContent(content);
      setDetailedPolling(false);
      return;
    }

    const downloadUrl = String(data?.output_data?.download_url || "").trim();
    if (downloadUrl && !reportContent.trim() && !fetchReportMutation.isPending) {
      fetchReportMutation
        .mutateAsync({ downloadUrl })
        .then((result) => {
          setReportContent(result.content);
          setDetailedPolling(false);
        })
        .catch(() => {
          // toast handled in hook
        });
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
    setDownloadedSnapshotExpressPitch(null);
    startQuickyMutation.reset();
    fetchReportMutation.reset();
    quickEvaluationMutation.reset();
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
      setDownloadedSnapshotExpressPitch(null);
      startQuickyMutation.reset();
      fetchReportMutation.reset();
      quickEvaluationMutation.reset();
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
    setDownloadedSnapshotExpressPitch(null);
    setSnapshotStarted(true);
    quickEvaluationMutation.reset();
    triggerQuickEvaluation();
    startQuickyMutation.reset();
    fetchReportMutation.reset();
  }, [
    openSnapshot,
    businessId,
    activeReport,
    queryClient,
    triggerQuickEvaluation,
    startQuickyMutation,
    fetchReportMutation,
    quickEvaluationMutation,
  ]);

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} showAskMassic={false} />

      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5">
        {showReportView ? (
          isSnapshotExpired ? (
            <EmptyState
              title="Report Expired"
              description="This report is older than 30 days. Please regenerate to view the latest report."
              className="h-[calc(100vh-12rem)]"
              buttons={[
                {
                  label: startQuickyMutation.isPending ? "Regenerating..." : "Regenerate",
                  variant: "default",
                  size: "lg",
                  onClick: async () => {
                    if (!businessId) return;

                    const generateSnapshot = async () => {
                      triggerQuickEvaluation();
                      queryClient.removeQueries({ queryKey: ["quicky", "status", businessId] });
                      setActiveReport("snapshot");
                      setReportContent("");
                      setSnapshotStarted(false);
                      startQuickyMutation.reset();
                      fetchReportMutation.reset();
                      await startQuickyMutation.mutateAsync({ businessId });
                      queryClient.invalidateQueries({ queryKey: ["pitches"] });
                      setSnapshotStarted(true);
                    };

                    await handleGenerateWithCreditsCheck("snapshot", generateSnapshot);
                  },
                },
                {
                  label: "Back",
                  href: businessId ? `/pitches/${businessId}/reports?view=cards` : "/pitches",
                  variant: "outline",
                  size: "lg",
                },
              ]}
            />
          ) : (
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
              activeReport === "snapshot" && snapshotExpressPitch ? (
                <SnapshotReportViewer
                  expressPitch={snapshotExpressPitch}
                  generatedAt={snapshotGeneratedAt}
                  profileTags={snapshotProfileTags}
                  competitors={snapshotCompetitors}
                  footerSummary={snapshotFooterSummary}
                  poweredByName={agencyInfo?.name}
                  quickEvaluation={quickEvaluationMutation.data}
                  quickEvaluationLoading={quickEvaluationMutation.isPending}
                  quickEvaluationErrorMessage={quickEvaluationMutation.error?.message}
                  onBack={() => {
                    router.push(
                      businessId
                        ? `/pitches/${businessId}/reports?view=cards`
                        : "/pitches"
                    );
                  }}
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
                  statusText={
                    quickyStatus ? `Status: ${quickyStatus}` : "Status: generating"
                  }
                  showWorkflowMessage={viewerShowWorkflowMessage}
                  workflowStatus={viewerWorkflowStatus}
                  onBack={() => {
                    router.push(
                      businessId
                        ? `/pitches/${businessId}/reports?view=cards`
                        : "/pitches"
                    );
                  }}
                />
              )
            )
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

                  {snapshotChips && (
                    <div className="flex gap-2">
                      {snapshotChips.usageChip && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-primary py-1"
                        >
                          {snapshotChips.usageChip}
                        </Badge>
                      )}
                      {snapshotChips.creditsChip && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] text-primary py-1"
                        >
                          {snapshotChips.creditsChip}
                        </Badge>
                      )}
                    </div>
                  )}

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
                          disabled={!businessId || isSnapshotProcessing}
                          onClick={() => {
                            if (!businessId) return;
                            if (!canExecuteSnapshot) {
                              const freeUsed = status?.free_snapshots?.used || 0;
                              const freeLimit = status?.free_snapshots?.limit || 3;
                              setUpgradeModalMessage(`You've used all ${freeLimit} free snapshot reports. Subscribe to Massic Opportunities to continue generating snapshot reports.`);
                              setShowUpgradeModal(true);
                              return;
                            }
                            triggerQuickEvaluation();
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
                          disabled={
                            !businessId ||
                            startQuickyMutation.isPending ||
                            isSnapshotProcessing
                          }
                          onClick={async () => {
                            if (!businessId) return;

                            const generateSnapshot = async () => {
                              triggerQuickEvaluation();
                              queryClient.removeQueries({ queryKey: ["quicky", "status", businessId] });
                              setActiveReport("snapshot");
                              setReportContent("");
                              setSnapshotStarted(false);
                              startQuickyMutation.reset();
                              fetchReportMutation.reset();
                              try {
                                await startQuickyMutation.mutateAsync({ businessId });
                                queryClient.invalidateQueries({ queryKey: ["pitches"] });
                                setSnapshotStarted(true);
                              } catch (error) {
                                // Error is already handled by mutation's onError (toast)
                                // Reset states to hide the processing UI
                                setActiveReport(null);
                                setSnapshotStarted(false);
                              }
                            };

                            await handleGenerateWithCreditsCheck("snapshot", generateSnapshot);
                          }}
                        >
                          {startQuickyMutation.isPending ? "Generating..." : "Regenerate"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full"
                        disabled={
                          !businessId ||
                          startQuickyMutation.isPending ||
                          isSnapshotProcessing
                        }
                        onClick={async () => {
                          if (!businessId) return;

                          const generateSnapshot = async () => {
                            triggerQuickEvaluation();
                            queryClient.removeQueries({ queryKey: ["quicky", "status", businessId] });
                            setActiveReport("snapshot");
                            setReportContent("");
                            setSnapshotStarted(false);
                            startQuickyMutation.reset();
                            fetchReportMutation.reset();
                            try {
                              await startQuickyMutation.mutateAsync({ businessId });
                              queryClient.invalidateQueries({ queryKey: ["pitches"] });
                              setSnapshotStarted(true);
                            } catch (error) {
                              // Error is already handled by mutation's onError (toast)
                              // Reset states to hide the processing UI
                              setActiveReport(null);
                              setSnapshotStarted(false);
                            }
                          };

                          await handleGenerateWithCreditsCheck("snapshot", generateSnapshot);
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

                  {detailedChips && (
                    <div className="flex gap-2">
                      {detailedChips.usageChip && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-primary py-1"
                        >
                          {detailedChips.usageChip}
                        </Badge>
                      )}
                      {detailedChips.creditsChip && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] text-primary py-1"
                        >
                          {detailedChips.creditsChip}
                        </Badge>
                      )}
                    </div>
                  )}

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
                      size="lg"
                      className="w-full"
                      disabled
                    >
                      Coming Soon
                    </Button>
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

      <MassicOpportunitiesModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        isActive={status?.status === "active" && status?.has_subscription}
        isUpgrading={subscribeMassicOpportunities.isPending}
        isDeactivating={cancelMassicOpportunities.isPending}
        isReactivating={reactivateMassicOpportunities.isPending}
        cancelAtPeriodEnd={status?.cancel_at_period_end || false}
        periodEndDate={status?.current_period_end}
        alertMessage={upgradeModalMessage}
        onDeactivate={async () => {
          await cancelMassicOpportunities.mutateAsync();
          setShowUpgradeModal(false);
        }}
        onReactivate={async () => {
          await reactivateMassicOpportunities.mutateAsync();
          setShowUpgradeModal(false);
        }}
        onUpgrade={() => {
          const currentUrl = typeof window !== "undefined" ? window.location.href : "";
          subscribeMassicOpportunities.mutate({ returnUrl: currentUrl });
        }}
      />

      <ApplyCreditsModal
        open={showApplyCreditsModal}
        onOpenChange={(open) => {
          setShowApplyCreditsModal(open);
          if (!open) setPendingGenerateAction(null);
        }}
        onApplyCredits={handleApplyCreditsConfirm}
        creditsBalance={creditsBalance?.current_balance ?? 0}
        creditsToApply={getCreditsRequiredForType(applyCreditsReportType)}
        reportType={applyCreditsReportType}
        isApplying={startQuickyMutation.isPending || generateDetailedReportMutation.isPending}
      />

      <CreditModal
        open={showBuyCreditsModal}
        onClose={() => {
          setShowBuyCreditsModal(false);
          setBuyCreditsAlertMessage("");
          setPendingGenerateAction(null);
        }}
        currentBalance={creditsBalance?.current_balance ?? 0}
        autoTopupEnabled={creditsBalance?.auto_topup_enabled ?? false}
        autoTopupThreshold={creditsBalance?.auto_topup_threshold ?? 0}
        onPurchaseCredits={purchaseCredits}
        alertMessage={buyCreditsAlertMessage}
        description={`You need more execution credits to generate ${applyCreditsReportType} reports. Purchase credits to continue.`}
      />
    </div>
  );
}
