"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlansWrapper } from "../../molecules/settings/PlansWrapper";
import { DataTable } from "@/components/filter-table";
import { DataTableSearch } from "@/components/filter-table/data-table-search";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { PlanModal, PlanData } from "../../molecules/settings/PlanModal";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { useExecutionCredits } from "@/hooks/use-execution-credits";
import { useBusinessStore, BusinessProfile } from "@/store/business-store";
import { useSubscription } from "@/hooks/use-subscription";
import { ChartLine, ChevronRight, Loader2, Puzzle, RefreshCw, X, Zap } from "lucide-react";
import { Typography } from "@/components/ui/typography";
import { useMassicOpportunitiesStatus, useCancelMassicOpportunities, useSubscribeMassicOpportunities, useReactivateMassicOpportunities } from "@/hooks/use-massic-opportunities";
import { MassicOpportunitiesModal } from "@/components/molecules/MassicOpportunitiesModal";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import { useBillingReconciliation } from "@/hooks/use-billing-reconciliation";
import { BillingReconciliationReport as BillingReconciliationReportView } from "@/components/organisms/settings/BillingReconciliationReport";
import type { BillingReconciliationReport } from "@/types/billing-reconciliation-types";
import { generatePdfFromBillingReconciliation } from "@/utils/pdf-generator";
import { cn } from "@/lib/utils";

const toTitleCasePlan = (planType?: string) => {
  if (!planType) return "";
  return planType.charAt(0).toUpperCase() + planType.slice(1).toLowerCase();
};

const formatTrialLabel = (remainingTrialDays?: number) => {
  if (!remainingTrialDays || remainingTrialDays <= 0) return null;
  const dayLabel = remainingTrialDays === 1 ? "day" : "days";
  return `Trial: ${remainingTrialDays} ${dayLabel} remaining`;
};

const formatDate = (value?: string | number | Date | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatShortDate = (value?: string | number | Date | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getBusinessPlanName = (profile: BusinessProfile, isAgencyWhitelisted: boolean) => {
  if (isAgencyWhitelisted) return "Whitelisted";

  const subscription = profile.SubscriptionItems;
  if (subscription?.plan_type && subscription?.status !== "cancelled") {
    return toTitleCasePlan(subscription.plan_type);
  }

  return "No Plan";
};

const getBusinessPlanIcon = (planName: string) => {
  switch (planName) {
    case "Starter":
      return ChartLine;
    case "Core":
      return Puzzle;
    case "Growth":
      return Zap;
    default:
      return ChartLine;
  }
};

const getBusinessPlanClassName = (planName: string) => {
  switch (planName) {
    case "Growth":
      return "text-[#2E9B6F]";
    case "Starter":
      return "text-[#60646C]";
    case "Core":
      return "text-[#44474F]";
    default:
      return "text-[#8A8F98]";
  }
};

const getBusinessStatus = (profile: BusinessProfile, isAgencyWhitelisted: boolean) => {
  if (isAgencyWhitelisted) {
    return {
      label: "Whitelisted",
      className:
        "h-6 rounded-md border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold leading-none text-emerald-700",
      tooltip: null as string | null,
    };
  }

  const subscription = profile.SubscriptionItems;
  const subscriptionStatus = subscription?.status;
  const planType = subscription?.plan_type;
  const hasSubscription =
    typeof planType === "string" &&
    planType.length > 0 &&
    subscriptionStatus !== "cancelled";

  if (!hasSubscription && profile.isTrialActive && profile.remainingTrialDays) {
    const dayLabel = profile.remainingTrialDays === 1 ? "day" : "days";
    return {
      label: `${profile.remainingTrialDays} ${dayLabel} left`,
      className:
        "h-6 rounded-md border-sky-200 bg-sky-50 px-2.5 text-[11px] font-semibold leading-none text-sky-700",
      tooltip: "Trial access is currently active.",
    };
  }

  if (!hasSubscription) {
    return {
      label: "Inactive",
      className:
        "h-6 rounded-full border border-[#FFD7D7] bg-[#FFF0F0] px-2.5 text-[11px] font-medium leading-none text-[#F04438]",
      tooltip: null,
    };
  }

  if (subscription?.cancel_at_period_end && subscription?.cancelled_date) {
    return {
      label: `Cancels ${formatShortDate(subscription.cancelled_date)}`,
      className:
        "h-6 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-medium leading-none text-amber-700",
      tooltip: `Access continues until ${formatDate(subscription.cancelled_date)}.`,
    };
  }

  if (subscriptionStatus === "active") {
    return {
      label: "Active",
      className:
        "h-6 rounded-full border border-[#CDEFD9] bg-[#E8F9EE] px-2.5 text-[11px] font-medium leading-none text-[#16A34A]",
      tooltip: null,
    };
  }

  const normalizedStatus = subscriptionStatus
    ? subscriptionStatus.replace(/_/g, " ")
    : "Inactive";

  return {
    label: normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1),
    className:
      "h-6 rounded-full border border-muted-foreground/20 px-2.5 text-[11px] font-medium leading-none text-muted-foreground",
    tooltip: null,
  };
};

const getBusinessCycle = (profile: BusinessProfile, isAgencyWhitelisted: boolean) => {
  if (isAgencyWhitelisted) {
    return {
      primary: "Unlimited access",
      secondary: "Agency-level billing",
    };
  }

  const subscription = profile.SubscriptionItems;
  const hasSubscription =
    Boolean(subscription?.plan_type) && subscription?.status !== "cancelled";

  if (subscription?.current_period_start && subscription?.current_period_end) {
    return {
      primary: `${formatDate(subscription.current_period_start).replace(/, \d{4}$/, "")} - ${formatShortDate(subscription.current_period_end)}`,
      secondary: subscription.cancel_at_period_end && subscription.cancelled_date
        ? `Cancel date ${formatDate(subscription.cancelled_date)}`
        : `Renews ${formatDate(subscription.current_period_end)}`,
    };
  }

  if (!hasSubscription && profile.isTrialActive) {
    const hasTrialRange = profile.TrialStartDate && profile.TrialEndDate;
    return {
      primary: hasTrialRange
        ? `${formatDate(profile.TrialStartDate).replace(/, \d{4}$/, "")} - ${formatShortDate(profile.TrialEndDate)}`
        : "Trial period",
      secondary: profile.TrialEndDate
        ? `Trial ends ${formatDate(profile.TrialEndDate)}`
        : formatTrialLabel(profile.remainingTrialDays) || "-",
    };
  }

  return {
    primary: "-",
    secondary: "No billing cycle",
  };
};

const getCurrentMonthValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const downloadTextFile = (filename: string, contents: string, mimeType: string) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const escapeCsvCell = (value: string | number | null | undefined) => {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

// Helper to calculate linked businesses count for plans
const getLinkedCount = (profiles: BusinessProfile[], planName: string) => {
  return profiles
    .filter(
      (p) =>
        p.SubscriptionItems?.status === "active" &&
        p.SubscriptionItems?.plan_type?.toLowerCase() === planName.toLowerCase()
    )
    .length.toString();
};

const defaultPlansData: PlanData[] = [
  {
    name: "Starter",
    price: "$49/mo per business",
    tags: ["ANALYTICS"],
    description:
      "Get the visibility you need to track growth at scale. Perfect for agencies and businesses who want always-on SEO insights without the noise.",
    features: [
      { text: "Unified, real-time analytics" },
      {
        text: "Google Search Console, GA4, and Google Business Profiles integrations",
      },
      {
        text: "Full performance breakdown: goals, clicks, impressions, funnel views, and more",
      },
      { text: "AI traffic tracking from major LLMs" },
      { text: "Local SEO visibility & review monitoring" },
    ],
    iconName: "ChartLine",
    isGradient: false,
  },
  {
    name: "Core",
    price: "$299/mo per business",
    tags: ["ANALYTICS", "STRATEGY"],
    description:
      "Client-ready strategies, built automatically. Ideal for agencies who want research, planning, and campaign direction without the manual work.",
    features: [
      { text: "Topics plan tailored to your business" },
      { text: "Audience profiles" },
      { text: "Web strategy (page recommendations + deep content plan)" },
      { text: "Social strategy (platform-specific campaign planning)" },
    ],
    iconName: "Puzzle",
    isGradient: false,
  },
  {
    name: "Growth",
    price: "$499/mo per business",
    tags: ["ANALYTICS", "STRATEGY", "CONTENT", "REVIEWS"],
    description:
      "Turn strategies into action — automatically. Ideal for agencies who want content, campaigns, and review management without adding more staff.",
    features: [
      { text: "Topics, audience profiles, web and social strategy" },
      {
        text: "Up to 30 web content pieces/month (blogs, service pages, landing pages)",
      },
      {
        text: "Up to 30 platform-ready social posts/month aligned to strategy",
      },
      { text: "Review campaigns: monitor, generate, and respond" },
    ],
    iconName: "Zap",
    isRecommended: true,
    isGradient: true,
  },
];

export function BillingSettings() {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [massicOpportunitiesModalOpen, setMassicOpportunitiesModalOpen] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [subscriptionAction, setSubscriptionAction] = useState<{
    type: "cancel" | "reactivate";
    business: BusinessProfile;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reconciliationSheetOpen, setReconciliationSheetOpen] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState(getCurrentMonthValue);
  const [reconciliationReport, setReconciliationReport] = useState<BillingReconciliationReport | null>(null);
  const [reconciliationPdfLoading, setReconciliationPdfLoading] = useState(false);
  const [planChangeConfirm, setPlanChangeConfirm] = useState<{
    planName: string;
    action: "UPGRADE" | "DOWNGRADE";
    business: BusinessProfile;
  } | null>(null);
  const [planSelectionResetKey, setPlanSelectionResetKey] = useState(0);

  const { profiles } = useBusinessStore();

  // Derive whitelist status from profiles (agency-level check from backend)
  const isAgencyWhitelisted = useMemo(() => {
    // Backend adds isWhitelisted flag to each business profile (agency-level)
    return profiles.some(profile => profile.isWhitelisted === true);
  }, [profiles]);

  const {
    loading: subscriptionLoading,
    handleSubscribeToPlan,
  } = useSubscription({ isWhitelisted: isAgencyWhitelisted });
  const {
    loading: creditsLoading,
    creditsBalance,
    purchaseCredits,
    refetchData: refetchCredits,
  } = useExecutionCredits();
  const { data: massicOpportunitiesStatus } = useMassicOpportunitiesStatus();
  const cancelMassicOpportunities = useCancelMassicOpportunities();
  const subscribeMassicOpportunities = useSubscribeMassicOpportunities();
  const reactivateMassicOpportunities = useReactivateMassicOpportunities();
  const queryClient = useQueryClient();
  const billingReconciliation = useBillingReconciliation();
  const headerClassName =
    "h-11 justify-start gap-1.5 bg-transparent px-0 text-[14px] font-medium text-[#181D27] hover:bg-transparent focus-visible:ring-0 [&_svg]:size-3.5 [&_svg]:text-[#98A2B3] [&>span:last-child]:opacity-100";

  const loading = subscriptionLoading || creditsLoading;
  const settingsReturnUrl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const url = new URL("/settings", window.location.origin);
    url.searchParams.set("t", "billing");
    return url.toString();
  }, []);
  const handlePurchaseCredits = useCallback((params?: { quantity?: number }) => {
    return purchaseCredits({ ...params, returnUrl: settingsReturnUrl });
  }, [purchaseCredits, settingsReturnUrl]);

  const handleGenerateReconciliationReport = useCallback(async () => {
    try {
      const report = await billingReconciliation.mutateAsync({ month: selectedReportMonth });
      setReconciliationReport(report);
      setReconciliationSheetOpen(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load billing reconciliation report"
      );
    }
  }, [billingReconciliation, selectedReportMonth]);

  const handleDownloadReconciliationCsv = useCallback(() => {
    if (!reconciliationReport) return;

    const header = [
      "Business",
      "Plan",
      "Billing Period Start",
      "Billing Period End",
      "Last Billed",
      "Next Billing",
      "Invoice",
      "Amount",
      "Currency",
      "Row Type",
      "Match Status",
    ];

    const rows = reconciliationReport.rows.map((row) => [
      row.businessName,
      row.planName,
      row.billingPeriodStart || "",
      row.billingPeriodEnd || "",
      row.lastBilledAt || "",
      row.nextBillingAt || "",
      row.invoiceNumber,
      row.amount,
      row.currency,
      row.rowType,
      row.matchStatus,
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((cell) => escapeCsvCell(cell)).join(","))
      .join("\n");

    downloadTextFile(
      `billing-reconciliation-${reconciliationReport.month}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  }, [reconciliationReport]);

  const handleDownloadReconciliationPdf = useCallback(async () => {
    if (!reconciliationReport) return;

    try {
      setReconciliationPdfLoading(true);
      await generatePdfFromBillingReconciliation(
        reconciliationReport,
        `billing-reconciliation-${reconciliationReport.month}`
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate reconciliation PDF");
    } finally {
      setReconciliationPdfLoading(false);
    }
  }, [reconciliationReport]);

  // Dynamic plans data based on current subscriptions
  const plansStats = useMemo(
    () => [
      {
        planName: "Starter",
        price: "49",
        businessesLinked: getLinkedCount(profiles, "starter"),
        iconName: "ChartLine",
        cardBackground: "#F5F5F5",
        isGradientPlanName: false,
        hasBorder: false,
        isRecommended: false,
        isAddOn: false,
      },
      {
        planName: "Core",
        price: "299",
        businessesLinked: getLinkedCount(profiles, "core"),
        iconName: "Puzzle",
        cardBackground: "#F5F5F5",
        isGradientPlanName: false,
        hasBorder: false,
        isRecommended: false,
        isAddOn: false,
      },
      {
        planName: "Growth",
        price: "499",
        businessesLinked: getLinkedCount(profiles, "growth"),
        iconName: "Zap",
        cardBackground: "#F5F5F5",
        isGradientPlanName: true,
        hasBorder: true,
        isRecommended: true,
        isAddOn: false,
      },
      {
        planName: "Massic Opportunities",
        price: "499",
        businessesLinked: massicOpportunitiesStatus?.cancel_at_period_end
          ? `Cancels ${massicOpportunitiesStatus?.current_period_end ? new Date(massicOpportunitiesStatus.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`
          : massicOpportunitiesStatus?.status === "active" && massicOpportunitiesStatus?.has_subscription
            ? "Active"
            : "Inactive",
        iconName: "Target",
        cardBackground: "#F5F5F5",
        isGradientPlanName: false,
        hasBorder: false,
        isRecommended: false,
        isAddOn: true,
        isMassicOpportunitiesActive: massicOpportunitiesStatus?.status === "active" && massicOpportunitiesStatus?.has_subscription,
      },
      {
        planName: "100 Execution Credits",
        price: "100",
        businessesLinked: `${creditsBalance?.current_balance || 0} credits`,
        iconName: "Gem",
        cardBackground: "#F5F5F5",
        isGradientPlanName: false,
        hasBorder: false,
        isRecommended: false,
        isAddOn: true,
      },
    ],
    [profiles, creditsBalance, massicOpportunitiesStatus]
  );

  const handleManagePlan = useCallback((businessId: string) => {
    setSelectedBusinessId(businessId);
    setPlanModalOpen(true);
  }, []);

  const handleClosePlanModal = () => {
    setPlanModalOpen(false);
    setSelectedBusinessId(null);
  };

  const refreshBillingData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["businessProfiles"] });
    await queryClient.invalidateQueries({ queryKey: ["subscription"] });
  }, [queryClient]);

  const openSubscriptionAction = useCallback(
    (business: BusinessProfile, type: "cancel" | "reactivate") => {
      setSubscriptionAction({ business, type });
    },
    []
  );

  const closeSubscriptionAction = useCallback(() => {
    setSubscriptionAction(null);
  }, []);

  const handleConfirmSubscriptionAction = useCallback(async () => {
    if (!subscriptionAction) return;
    const businessId = subscriptionAction.business.UniqueId;
    try {
      setActionLoading(true);
      const endpoint =
        subscriptionAction.type === "cancel"
          ? `/billing/businesses/${businessId}/cancel`
          : `/billing/businesses/${businessId}/reactivate`;
      const response: any = await api.post(endpoint, "node");
      if (response?.success) {
        toast.success(response?.message || "Subscription updated successfully");
        await refreshBillingData();
        closeSubscriptionAction();
      } else {
        toast.error(response?.message || "Failed to update subscription");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update subscription"
      );
    } finally {
      setActionLoading(false);
    }
  }, [subscriptionAction, refreshBillingData, closeSubscriptionAction]);

  const onSelectPlan = async (
    planName: string,
    action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE"
  ) => {
    if (!selectedBusinessId) return;
    const business = profiles.find((b) => b.UniqueId === selectedBusinessId);
    if (!business) return;

    if (action === "UPGRADE" || action === "DOWNGRADE") {
      setPlanChangeConfirm({ planName, action, business });
      return;
    }

    await handleSubscribeToPlan({
      business,
      planName,
      action,
      closeAllModals: handleClosePlanModal,
      returnUrl: settingsReturnUrl,
    });
  };

  const closePlanChangeConfirm = useCallback(() => {
    setPlanChangeConfirm(null);
    setPlanSelectionResetKey((prev) => prev + 1);
  }, []);

  const handleConfirmPlanChange = useCallback(async () => {
    if (!planChangeConfirm) return;
    const { business, planName, action } = planChangeConfirm;

    await handleSubscribeToPlan({
      business,
      planName,
      action,
      closeAllModals: handleClosePlanModal,
      returnUrl: settingsReturnUrl,
    });

    setPlanChangeConfirm(null);
    setPlanSelectionResetKey((prev) => prev + 1);
  }, [planChangeConfirm, handleSubscribeToPlan, handleClosePlanModal]);

  const columns = useMemo<ColumnDef<BusinessProfile>[]>(
    () => [
      {
        accessorKey: "Name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Business Name" disableHide className={headerClassName} />
        ),
        enableSorting: true,
        size: 52,
        minSize: 52,
        maxSize: 190,
        cell: ({ row }) => {
          return <div className="truncate text-[15px] font-medium text-[#181D27]" title={row.original.Name}>{row.original.Name}</div>;
        },
      },
      {
        id: "plan",
        accessorFn: (row) => getBusinessPlanName(row, isAgencyWhitelisted),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Plan" disableHide className={headerClassName} />
        ),
        enableSorting: true,
        size: 64,
        minSize: 64,
        maxSize: 220,
        cell: ({ row }) => {
          const planName = getBusinessPlanName(row.original, isAgencyWhitelisted);
          const PlanIcon = getBusinessPlanIcon(planName);
          const subscription = row.original.SubscriptionItems;
          const hasSubscription =
            subscription?.plan_type &&
            subscription?.status &&
            subscription?.status !== "cancelled";
          const cancelAtPeriodEnd = subscription?.cancel_at_period_end;
          const isProcessing =
            actionLoading &&
            subscriptionAction?.business.UniqueId === row.original.UniqueId;

          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleManagePlan(row.original.UniqueId)}
                className="group flex h-9 w-full max-w-[132px] items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-2.5 text-left transition hover:border-[#D0D5DD] hover:bg-[#FAFAFA]"
              >
                <PlanIcon className={cn("h-4 w-4 shrink-0", getBusinessPlanClassName(planName))} />
                <Typography
                  variant="p"
                  className={cn("text-[13px] font-medium leading-none whitespace-nowrap", getBusinessPlanClassName(planName))}
                >
                  {planName}
                </Typography>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#B8BDC7] group-hover:text-[#98A2B3]" />
              </button>

              {!isAgencyWhitelisted && hasSubscription && (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-9 w-9 rounded-xl border p-0",
                    cancelAtPeriodEnd
                      ? "border-[#D0D5DD] bg-white text-[#667085] hover:bg-[#F9FAFB] hover:text-[#475467]"
                      : "border-[#FECACA] bg-white text-[#F04438] hover:bg-[#FEF2F2] hover:text-[#D92D20]"
                  )}
                  disabled={loading || actionLoading}
                  aria-label={cancelAtPeriodEnd ? "Reactivate subscription" : "Cancel subscription"}
                  onClick={() =>
                    openSubscriptionAction(
                      row.original,
                      cancelAtPeriodEnd ? "reactivate" : "cancel"
                    )
                  }
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : cancelAtPeriodEnd ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => getBusinessStatus(row, isAgencyWhitelisted).label,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Status" disableHide className={headerClassName} />
        ),
        enableSorting: true,
        size: 42,
        minSize: 42,
        maxSize: 120,
        cell: ({ row }) => {
          const status = getBusinessStatus(row.original, isAgencyWhitelisted);

          return (
            <div className="flex items-center">
              {status.tooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{status.tooltip}</TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "cycle",
        accessorFn: (row) => getBusinessCycle(row, isAgencyWhitelisted).primary,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Cycle" disableHide className={headerClassName} />
        ),
        enableSorting: true,
        size: 52,
        minSize: 52,
        maxSize: 180,
        cell: ({ row }) => {
          const cycle = getBusinessCycle(row.original, isAgencyWhitelisted);

          return (
            <div className="min-w-0">
              <p className="truncate text-[14px] font-normal text-[#7A7F87]">{cycle.primary}</p>
              {cycle.secondary && cycle.secondary !== "-" && (
                <p className="truncate text-[12px] font-normal text-[#98A2B3]">{cycle.secondary}</p>
              )}
            </div>
          );
        },
      },
    ],
    [isAgencyWhitelisted, handleManagePlan, loading, actionLoading, subscriptionAction, openSubscriptionAction]
  );

  const table = useReactTable({
    data: useMemo(() => {
      const getHasPlan = (profile: BusinessProfile) => {
        if (isAgencyWhitelisted) return true;
        const subscription = profile.SubscriptionItems;
        if (!subscription) return false;
        if (subscription.status === "cancelled") return false;
        return Boolean(subscription.plan_type);
      };

      const sorted = [...profiles].sort((a, b) => {
        const aHasPlan = getHasPlan(a);
        const bHasPlan = getHasPlan(b);
        if (aHasPlan !== bHasPlan) return aHasPlan ? -1 : 1;
        const aName = (a.Name || "").toLowerCase();
        const bName = (b.Name || "").toLowerCase();
        return aName.localeCompare(bName);
      });

      return sorted;
    }, [profiles, isAgencyWhitelisted]),
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const name = row.original.Name?.toLowerCase() || "";
      return name.includes(search);
    },
    initialState: {
      pagination: {
        pageSize: 100,
      },
    },
  });

  const actionTitle =
    subscriptionAction?.type === "cancel" ? "Cancel plan?" : "Reactivate plan?";
  const actionDescription =
    subscriptionAction?.type === "cancel"
      ? `Your plan will remain active until ${subscriptionAction?.business.SubscriptionItems?.current_period_end
        ? formatDate(
          subscriptionAction?.business.SubscriptionItems?.current_period_end
        )
        : "the end of the current billing period"
      }.`
      : "Your cancellation will be removed and billing will continue.";
  const actionConfirmLabel =
    subscriptionAction?.type === "cancel" ? "Cancel Plan" : "Reactivate";
  const actionCancelLabel =
    subscriptionAction?.type === "cancel" ? "Keep Plan" : "Close";

  return (
    <div className="flex gap-6 bg-white p-6 rounded-xl border border-muted/40 shadow-sm h-[calc(100vh-12rem)]">
      {/* Left Section - Payment & Billing */}
      <div className="flex-[1.2] min-w-0 h-full overflow-hidden">
        <Card className="flex h-full flex-col border-none py-0 shadow-none">
          <CardHeader className="px-0 pb-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="font-mono text-base font-normal">Business Billing</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReconciliationSheetOpen(true)}
              >
                Generate Reconciliation Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-0">
            {loading && profiles.length === 0 ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <DataTableSearch
                  value={globalFilter}
                  onChange={setGlobalFilter}
                  placeholder="Search business name..."
                  className="max-w-none"
                  inputClassName="shadow-none focus-visible:ring-1 focus-visible:ring-ring/40"
                />
                <DataTable
                  table={table}
                  isLoading={loading}
                  emptyMessage="No businesses found."
                  disableHorizontalScroll={true}
                  showPagination={false}
                  toolbarPosition="belowHeader"
                  className="min-h-0 flex-1 gap-0 [&_table]:border-separate [&_table]:border-spacing-0 [&_thead]:bg-white [&_thead_th]:h-11 [&_thead_th]:border-b [&_thead_th]:border-[#E6E8EC] [&_thead_th]:bg-white [&_thead_th]:px-3 [&_thead_th]:py-0 [&_tbody_td]:border-b [&_tbody_td]:border-[#EAECF0] [&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_tr]:bg-white **:data-[toolbar-row='true']:border-0 **:data-[toolbar-row='true']:bg-transparent **:data-[toolbar-cell='true']:border-0 **:data-[toolbar-cell='true']:bg-transparent **:data-[toolbar-cell='true']:px-0 **:data-[toolbar-cell='true']:py-0"
                >
                  <div
                    role="toolbar"
                    aria-orientation="horizontal"
                    className="flex h-8 w-full items-center justify-between bg-[#F7F7F8]"
                  >
                    <p className="px-3 text-xs font-normal text-[#8A8F98]">
                      {table.getFilteredRowModel().rows.length} businesses linked
                    </p>
                  </div>
                </DataTable>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Section - Plans */}
      <div className="w-[440px] shrink-0 overflow-auto">
        <PlansWrapper
          plansData={plansStats}
          modalPlansData={defaultPlansData}
          currentCreditBalance={creditsBalance?.current_balance || 0}
          onPurchaseCredits={handlePurchaseCredits}
          onCreditsRefresh={refetchCredits}
          onMassicOpportunitiesClick={() => setMassicOpportunitiesModalOpen(true)}
          onMassicOpportunitiesDeactivate={() => cancelMassicOpportunities.mutate()}
        />
      </div>

      <PlanModal
        open={planModalOpen}
        onClose={handleClosePlanModal}
        plansData={defaultPlansData}
        currentPlan={(() => {
          const business = profiles.find(
            (b) => b.UniqueId === selectedBusinessId
          );
          if (!business?.SubscriptionItems) return "No Plan";
          const status = business.SubscriptionItems.status;
          const planType = business.SubscriptionItems.plan_type;
          if (
            planType &&
            ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"].includes(
              status || ""
            )
          ) {
            return (
              planType.charAt(0).toUpperCase() +
              planType.slice(1).toLowerCase()
            );
          }
          return "No Plan";
        })()}
        showFooterButtons={true}
        onSelectPlan={onSelectPlan}
        loading={loading}
        selectionResetKey={planSelectionResetKey}
      />

      <Dialog
        open={!!subscriptionAction}
        onOpenChange={(open) => {
          if (!open) closeSubscriptionAction();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionTitle}</DialogTitle>
            <DialogDescription>{actionDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeSubscriptionAction}
              disabled={actionLoading}
            >
              {actionCancelLabel}
            </Button>
            <Button
              variant={subscriptionAction?.type === "cancel" ? "destructive" : "secondary"}
              onClick={handleConfirmSubscriptionAction}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : actionConfirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!planChangeConfirm}
        onOpenChange={(open) => {
          if (!open) closePlanChangeConfirm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {planChangeConfirm?.action === "UPGRADE"
                ? "Confirm upgrade?"
                : "Confirm downgrade?"}
            </DialogTitle>
            <DialogDescription>
              {(() => {
                if (!planChangeConfirm) return "";
                const currentPlan = planChangeConfirm.business.SubscriptionItems?.plan_type
                  ? toTitleCasePlan(planChangeConfirm.business.SubscriptionItems.plan_type)
                  : "No Plan";
                const targetPlan = planChangeConfirm.planName;
                if (planChangeConfirm.action === "UPGRADE") {
                  return `You're upgrading ${planChangeConfirm.business.Name} from ${currentPlan} to ${targetPlan}. This takes effect immediately and may create a prorated charge. If the plan was set to cancel, it will be reactivated.`;
                }
                return `You're downgrading ${planChangeConfirm.business.Name} from ${currentPlan} to ${targetPlan}. This takes effect immediately. No refunds are issued for the remaining period.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closePlanChangeConfirm}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              variant={planChangeConfirm?.action === "UPGRADE" ? "secondary" : "destructive"}
              onClick={handleConfirmPlanChange}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : planChangeConfirm?.action === "UPGRADE"
                  ? "Confirm Upgrade"
                  : "Confirm Downgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MassicOpportunitiesModal
        open={massicOpportunitiesModalOpen}
        onOpenChange={setMassicOpportunitiesModalOpen}
        isActive={massicOpportunitiesStatus?.status === "active" && massicOpportunitiesStatus?.has_subscription}
        isUpgrading={subscribeMassicOpportunities.isPending}
        isDeactivating={cancelMassicOpportunities.isPending}
        isReactivating={reactivateMassicOpportunities.isPending}
        cancelAtPeriodEnd={massicOpportunitiesStatus?.cancel_at_period_end || false}
        periodEndDate={massicOpportunitiesStatus?.current_period_end}
        alertMessage={massicOpportunitiesStatus?.whitelisted ? "You have unlimited access to Massic Opportunities." : undefined}
        onDeactivate={async () => {
          await cancelMassicOpportunities.mutateAsync();
          setMassicOpportunitiesModalOpen(false);
        }}
        onReactivate={async () => {
          await reactivateMassicOpportunities.mutateAsync();
          setMassicOpportunitiesModalOpen(false);
        }}
        onUpgrade={() => {
          subscribeMassicOpportunities.mutate({ returnUrl: settingsReturnUrl || "" });
        }}
      />

      <Sheet open={reconciliationSheetOpen} onOpenChange={setReconciliationSheetOpen}>
        <SheetContent side="right" className="w-[100vw] gap-0 p-0 sm:max-w-[1080px]">
          <SheetHeader className="border-b border-border/60 pr-12">
            <SheetTitle>Billing reconciliation report</SheetTitle>
            <SheetDescription>
              Review the selected month, export CSV, or download the PDF without leaving the billing screen.
            </SheetDescription>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  id="reconciliation-month-sheet"
                  type="month"
                  value={selectedReportMonth}
                  onChange={(event) => setSelectedReportMonth(event.target.value)}
                  max={getCurrentMonthValue()}
                  aria-label="Select reconciliation month"
                  className="max-w-[220px]"
                />
              </div>
              <Button
                onClick={handleGenerateReconciliationReport}
                disabled={!selectedReportMonth || billingReconciliation.isPending}
                className="sm:self-end"
              >
                {billingReconciliation.isPending ? "Loading..." : "Load report"}
              </Button>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {reconciliationReport ? (
              <BillingReconciliationReportView
                report={reconciliationReport}
                onDownloadCsv={handleDownloadReconciliationCsv}
                onDownloadPdf={handleDownloadReconciliationPdf}
                isDownloadingPdf={reconciliationPdfLoading}
              />
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
                Generate a reconciliation report to view it here.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
