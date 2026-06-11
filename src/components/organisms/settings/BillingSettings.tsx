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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ChartLine, ChevronRight, Loader2, Puzzle, Zap } from "lucide-react";
import { Typography } from "@/components/ui/typography";
import { useMassicOpportunitiesStatus, useCancelMassicOpportunities, useSubscribeMassicOpportunities, useReactivateMassicOpportunities } from "@/hooks/use-massic-opportunities";
import { MassicOpportunitiesModal } from "@/components/molecules/MassicOpportunitiesModal";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";
import { useBillingReconciliation } from "@/hooks/use-billing-reconciliation";
import { BillingReconciliationReport as BillingReconciliationReportView } from "@/components/organisms/settings/BillingReconciliationReport";
import type { BillingReconciliationPeriod, BillingReconciliationReport } from "@/types/billing-reconciliation-types";
import { generatePdfFromBillingReconciliation } from "@/utils/pdf-generator";
import { cn } from "@/lib/utils";
import { useFeatureActionGuard } from "@/hooks/use-permissions";

const toTitleCasePlan = (planType?: string) => {
  if (!planType) return "";
  return planType.charAt(0).toUpperCase() + planType.slice(1).toLowerCase();
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

const BILLING_STATUS_FILTERS = [
  {
    value: "all",
    label: "All",
    dotClassName: "",
    activeClassName:
      "border border-[#9CC3B0] bg-[#3E6F61] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.55)_inset]",
    inactiveClassName: "border border-transparent bg-[#EEF3F1] text-[#3E6F61]",
    countClassName: "text-white/85",
  },
  {
    value: "active",
    label: "Active",
    dotClassName: "bg-[#639922]",
    activeClassName: "border border-[#D7E8BF] bg-[#EEF6E4] text-[#639922]",
    inactiveClassName: "border border-transparent bg-[#EEF6E4] text-[#639922]",
    countClassName: "text-[#639922]/80",
  },
  {
    value: "trial",
    label: "Trial",
    dotClassName: "bg-[#D88A10]",
    activeClassName: "border border-[#F7D496] bg-[#FFF3D8] text-[#D88A10]",
    inactiveClassName: "border border-transparent bg-[#FFF3D8] text-[#D88A10]",
    countClassName: "text-[#D88A10]/80",
  },
  {
    value: "cancelling",
    label: "Cancelling",
    dotClassName: "bg-[#708091]",
    activeClassName: "border border-[#DBDEE3] bg-[#ECEFF2] text-[#708091]",
    inactiveClassName: "border border-transparent bg-[#ECEFF2] text-[#708091]",
    countClassName: "text-[#708091]/80",
  },
  {
    value: "inactive",
    label: "Inactive",
    dotClassName: "bg-[#E24B4A]",
    activeClassName: "border border-[#F4B8B8] bg-[#FDECEC] text-[#E24B4A]",
    inactiveClassName: "border border-transparent bg-[#FDECEC] text-[#E24B4A]",
    countClassName: "text-[#E24B4A]/80",
  },
] as const;

type BillingStatusFilterValue = (typeof BILLING_STATUS_FILTERS)[number]["value"];

const getBillingStatusFilterValue = (
  profile: BusinessProfile,
  isAgencyWhitelisted: boolean
): Exclude<BillingStatusFilterValue, "all"> | null => {
  if (isAgencyWhitelisted) return "active";

  const subscription = profile.SubscriptionItems;
  const subscriptionStatus = subscription?.status;
  const hasSubscription =
    typeof subscription?.plan_type === "string" &&
    subscription.plan_type.length > 0 &&
    subscriptionStatus !== "cancelled";

  if (subscription?.cancel_at_period_end && subscription?.cancelled_date) {
    return "cancelling";
  }

  if (subscriptionStatus === "trialing" || profile.isTrialActive) {
    return "trial";
  }

  if (!hasSubscription) {
    return "inactive";
  }

  if (subscriptionStatus === "active") {
    return "active";
  }

  return "inactive";
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

  if ((subscriptionStatus === "trialing" || profile.isTrialActive) && profile.remainingTrialDays) {
    const dayLabel = profile.remainingTrialDays === 1 ? "day" : "days";
    return {
      label: `Trial · ${profile.remainingTrialDays} ${dayLabel} left`,
      className:
        "h-6 rounded-full border border-[#FFD7D7] bg-[#FFF0F0] px-2.5 text-[11px] font-medium leading-none text-[#F04438]",
      tooltip: null,
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
      label: "Cancelling",
      className:
        "h-6 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-medium leading-none text-amber-700",
      tooltip: null,
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

const getBusinessStatusDetail = (
  profile: BusinessProfile,
  isAgencyWhitelisted: boolean
) => {
  if (isAgencyWhitelisted) return null;

  const subscription = profile.SubscriptionItems;

  if (subscription?.cancel_at_period_end && subscription?.cancelled_date) {
    return `Access until ${formatShortDate(subscription.cancelled_date)}`;
  }

  if (subscription?.status === "trialing" || profile.isTrialActive) {
    return null;
  }

  const hasActivePlan =
    Boolean(subscription?.plan_type) &&
    subscription?.status !== "cancelled" &&
    !subscription?.cancel_at_period_end;

  if (hasActivePlan && subscription?.current_period_end) {
    return `Renews ${formatShortDate(subscription.current_period_end)}`;
  }

  return null;
};

const getBusinessBillingAction = (
  profile: BusinessProfile,
  isAgencyWhitelisted: boolean
) => {
  if (isAgencyWhitelisted) return null;

  const subscription = profile.SubscriptionItems;
  const hasPlan = Boolean(subscription?.plan_type) && subscription?.status !== "cancelled";

  if (!hasPlan) {
    return {
      label: "Start Plan",
      type: "start" as const,
    };
  }

  if (subscription?.cancel_at_period_end) {
    return {
      label: "Reactivate",
      type: "reactivate" as const,
    };
  }

  return {
    label: "Cancel",
    type: "cancel" as const,
  };
};

const getCurrentMonthValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const RECONCILIATION_PERIOD_OPTIONS: Array<{
  value: BillingReconciliationPeriod;
  label: string;
  description: string;
}> = [
  {
    value: "month",
    label: "Specific month",
    description: "Choose one calendar month",
  },
  {
    value: "last_quarter",
    label: "Last quarter",
    description: "Previous completed calendar quarter",
  },
  {
    value: "this_quarter",
    label: "This quarter",
    description: "Current quarter through today",
  },
  {
    value: "year_to_date",
    label: "Year to date",
    description: "Current year through today",
  },
  {
    value: "all_time",
    label: "All time",
    description: "All paid Stripe history",
  },
];

const getReconciliationReportSlug = (report: BillingReconciliationReport) => {
  const rawSlug = report.period && report.period !== "month" ? report.period : report.month;
  return String(rawSlug || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  const [selectedReportPeriod, setSelectedReportPeriod] = useState<BillingReconciliationPeriod>("month");
  const [selectedReportMonth, setSelectedReportMonth] = useState(getCurrentMonthValue);
  const [reconciliationReport, setReconciliationReport] = useState<BillingReconciliationReport | null>(null);
  const [reconciliationPdfLoading, setReconciliationPdfLoading] = useState(false);
  const [billingStatusFilter, setBillingStatusFilter] =
    useState<BillingStatusFilterValue>("all");
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
  const guardChangeBillingPlan = useFeatureActionGuard("billing.changePlan");
  const guardSubscribeBillingPlan = useFeatureActionGuard("billing.subscribe");
  const queryClient = useQueryClient();
  const billingReconciliation = useBillingReconciliation();
  const headerClassName =
    "h-11 justify-start gap-1.5 bg-transparent px-0 text-[14px] font-medium text-[#181D27] hover:bg-transparent focus-visible:ring-0 [&_svg]:size-3.5 [&_svg]:text-[#98A2B3] [&>span:last-child]:opacity-100";
  const actionButtonClassName =
    "h-8 rounded-lg border-[#D0D5DD] bg-[#F9FAFB] px-3 text-[13px] font-medium text-[#667085] shadow-none hover:bg-[#F2F4F7] hover:text-[#475467]";

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

  const handleReconciliationSheetOpenChange = useCallback((open: boolean) => {
    setReconciliationSheetOpen(open);
    if (!open) {
      setReconciliationReport(null);
      setReconciliationPdfLoading(false);
    }
  }, []);

  const handleStartNewReconciliationReport = useCallback(() => {
    setReconciliationReport(null);
    setReconciliationPdfLoading(false);
  }, []);

  const handleGenerateReconciliationReport = useCallback(async () => {
    try {
      const report = await billingReconciliation.mutateAsync(
        selectedReportPeriod === "month"
          ? { month: selectedReportMonth }
          : { period: selectedReportPeriod }
      );
      setReconciliationReport(report);
      setReconciliationSheetOpen(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load billing reconciliation report"
      );
    }
  }, [billingReconciliation, selectedReportMonth, selectedReportPeriod]);

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

    const reportSlug = getReconciliationReportSlug(reconciliationReport);
    downloadTextFile(
      `billing-reconciliation-${reportSlug}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  }, [reconciliationReport]);

  const handleDownloadReconciliationPdf = useCallback(async () => {
    if (!reconciliationReport) return;

    try {
      setReconciliationPdfLoading(true);
      const reportSlug = getReconciliationReportSlug(reconciliationReport);
      await generatePdfFromBillingReconciliation(
        reconciliationReport,
        `billing-reconciliation-${reportSlug}`
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
      if (!guardChangeBillingPlan()) return;
      setSubscriptionAction({ business, type });
    },
    [guardChangeBillingPlan]
  );

  const closeSubscriptionAction = useCallback(() => {
    setSubscriptionAction(null);
  }, []);

  const handleConfirmSubscriptionAction = useCallback(async () => {
    if (!subscriptionAction) return;
    if (!guardChangeBillingPlan()) return;

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
  }, [subscriptionAction, guardChangeBillingPlan, refreshBillingData, closeSubscriptionAction]);

  const onSelectPlan = async (
    planName: string,
    action: "UPGRADE" | "DOWNGRADE" | "SUBSCRIBE"
  ) => {
    if (!selectedBusinessId) return;
    const business = profiles.find((b) => b.UniqueId === selectedBusinessId);
    if (!business) return;

    if (action === "UPGRADE" || action === "DOWNGRADE") {
      if (!guardChangeBillingPlan()) return;
      setPlanChangeConfirm({ planName, action, business });
      return;
    }

    if (!guardSubscribeBillingPlan()) return;

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
          const statusDetail = getBusinessStatusDetail(row.original, isAgencyWhitelisted);

          return (
            <div className="flex min-w-0 flex-col items-start gap-1">
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
              {statusDetail && (
                <p className="truncate text-[11px] font-normal text-[#98A2B3]">
                  {statusDetail}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        accessorFn: (row) =>
          getBusinessBillingAction(row, isAgencyWhitelisted)?.label || "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Actions" disableHide className={headerClassName} />
        ),
        enableSorting: true,
        size: 48,
        minSize: 48,
        maxSize: 140,
        cell: ({ row }) => {
          const billingAction = getBusinessBillingAction(row.original, isAgencyWhitelisted);
          const isProcessing =
            actionLoading &&
            subscriptionAction?.business.UniqueId === row.original.UniqueId;

          if (!billingAction) {
            return (
              <div className="flex justify-start">
                <span className="text-[13px] text-[#98A2B3]">-</span>
              </div>
            );
          }

          if (billingAction.type === "start") {
            return (
              <div className="flex justify-start">
                <Button
                  size="sm"
                  variant="outline"
                  className={actionButtonClassName}
                  disabled={loading || actionLoading}
                  onClick={() => handleManagePlan(row.original.UniqueId)}
                >
                  {billingAction.label}
                </Button>
              </div>
            );
          }

          return (
            <div className="flex justify-start">
              <Button
                size="sm"
                variant="outline"
                className={actionButtonClassName}
                disabled={loading || actionLoading}
                onClick={() => openSubscriptionAction(row.original, billingAction.type)}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Processing
                  </>
                ) : (
                  billingAction.label
                )}
              </Button>
            </div>
          );
        },
      },
    ],
    [isAgencyWhitelisted, handleManagePlan, loading, actionLoading, subscriptionAction, openSubscriptionAction, actionButtonClassName]
  );

  const sortedBillingProfiles = useMemo(() => {
    const getHasPlan = (profile: BusinessProfile) => {
      if (isAgencyWhitelisted) return true;
      const subscription = profile.SubscriptionItems;
      if (!subscription) return false;
      if (subscription.status === "cancelled") return false;
      return Boolean(subscription.plan_type);
    };

    return [...profiles].sort((a, b) => {
      const aHasPlan = getHasPlan(a);
      const bHasPlan = getHasPlan(b);
      if (aHasPlan !== bHasPlan) return aHasPlan ? -1 : 1;
      const aName = (a.Name || "").toLowerCase();
      const bName = (b.Name || "").toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [profiles, isAgencyWhitelisted]);

  const billingStatusFilterCounts = useMemo(() => {
    const counts: Record<BillingStatusFilterValue, number> = {
      all: sortedBillingProfiles.length,
      active: 0,
      trial: 0,
      cancelling: 0,
      inactive: 0,
    };

    sortedBillingProfiles.forEach((profile) => {
      const status = getBillingStatusFilterValue(profile, isAgencyWhitelisted);
      if (status) counts[status] += 1;
    });

    return counts;
  }, [sortedBillingProfiles, isAgencyWhitelisted]);

  const filteredBillingProfiles = useMemo(() => {
    if (billingStatusFilter === "all") return sortedBillingProfiles;

    return sortedBillingProfiles.filter(
      (profile) =>
        getBillingStatusFilterValue(profile, isAgencyWhitelisted) ===
        billingStatusFilter
    );
  }, [billingStatusFilter, sortedBillingProfiles, isAgencyWhitelisted]);

  const table = useReactTable({
    data: filteredBillingProfiles,
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
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Left Section - Payment & Billing */}
      <div className="flex-[1.2] min-w-0 h-full overflow-hidden rounded-xl border border-muted/40 bg-white p-6 shadow-sm">
        <Card className="flex h-full flex-col gap-2 border-none py-0 shadow-none">
          <CardHeader className="px-0 pb-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="font-mono text-base font-normal">Business Billing</CardTitle>
              </div>
              <Button
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
                <div className="flex items-center gap-2 overflow-x-auto rounded-full p-1">
                  {BILLING_STATUS_FILTERS.map((option) => {
                    const isActive = billingStatusFilter === option.value;
                    const count = billingStatusFilterCounts[option.value];

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setBillingStatusFilter(option.value)}
                        className={cn(
                          "inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                          isActive ? option.activeClassName : option.inactiveClassName
                        )}
                      >
                        {option.value !== "all" ? (
                          <span
                            className={cn("h-2 w-2 shrink-0 rounded-full", option.dotClassName)}
                          />
                        ) : null}
                        <span>{option.label}</span>
                        {option.value !== "all" ? (
                          <span
                            className={cn(
                              "text-[13px] font-medium",
                              option.countClassName
                            )}
                          >
                            {count}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
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

      <Sheet open={reconciliationSheetOpen} onOpenChange={handleReconciliationSheetOpenChange}>
        <SheetContent side="right" className="w-screen gap-0 p-0 sm:max-w-[920px]">
          {reconciliationReport ? (
            <BillingReconciliationReportView
              report={reconciliationReport}
              onDownloadCsv={handleDownloadReconciliationCsv}
              onDownloadPdf={handleDownloadReconciliationPdf}
              onGenerateReport={handleStartNewReconciliationReport}
              isDownloadingPdf={reconciliationPdfLoading}
            />
          ) : (
            <>
              <SheetHeader className="border-b border-border/60 pr-12">
                <SheetTitle>Billing reconciliation report</SheetTitle>
                <SheetDescription>
                  Review a selected month or period, export CSV, or download the PDF without leaving the billing screen.
                </SheetDescription>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(220px,260px)_minmax(180px,220px)]">
                    <div className="min-w-0">
                      <label
                        htmlFor="reconciliation-period-sheet"
                        className="mb-1.5 block text-xs font-medium text-muted-foreground"
                      >
                        Report period
                      </label>
                      <Select
                        value={selectedReportPeriod}
                        onValueChange={(value) => setSelectedReportPeriod(value as BillingReconciliationPeriod)}
                      >
                        <SelectTrigger id="reconciliation-period-sheet" className="w-full">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          {RECONCILIATION_PERIOD_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex flex-col">
                                <span>{option.label}</span>
                                <span className="text-xs text-muted-foreground">{option.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedReportPeriod === "month" ? (
                      <div className="min-w-0">
                        <label
                          htmlFor="reconciliation-month-sheet"
                          className="mb-1.5 block text-xs font-medium text-muted-foreground"
                        >
                          Month
                        </label>
                        <Input
                          id="reconciliation-month-sheet"
                          type="month"
                          value={selectedReportMonth}
                          onChange={(event) => setSelectedReportMonth(event.target.value)}
                          max={getCurrentMonthValue()}
                          aria-label="Select reconciliation month"
                        />
                      </div>
                    ) : null}
                  </div>
                  <Button
                    onClick={handleGenerateReconciliationReport}
                    disabled={(selectedReportPeriod === "month" && !selectedReportMonth) || billingReconciliation.isPending}
                    className="sm:self-end"
                  >
                    {billingReconciliation.isPending ? "Loading..." : "Load report"}
                  </Button>
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
                  Generate a reconciliation report to view it here.
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
