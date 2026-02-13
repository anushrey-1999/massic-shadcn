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
import { useSubscription, SubscribeParams } from "@/hooks/use-subscription";
import { ChevronRight, Loader2 } from "lucide-react";
import { Typography } from "@/components/ui/typography";
import { useMassicOpportunitiesStatus, useCancelMassicOpportunities, useSubscribeMassicOpportunities, useReactivateMassicOpportunities } from "@/hooks/use-massic-opportunities";
import { MassicOpportunitiesModal } from "@/components/molecules/MassicOpportunitiesModal";
import { useAuthStore } from "@/store/auth-store";
import { api } from "@/hooks/use-api";
import { toast } from "sonner";

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
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

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
          <DataTableColumnHeader column={column} label="Business Name" disableHide />
        ),
        enableSorting: true,
        size: 70,
        minSize: 70,
        cell: ({ row }) => {
          return <div className="text-left truncate" title={row.original.Name}>{row.original.Name}</div>;
        },
      },
      {
        id: "plan",
        accessorFn: (row) => {
          if (isAgencyWhitelisted) return "Whitelisted";
          const subscription = row.SubscriptionItems;
          if (subscription?.plan_type && subscription?.status !== "cancelled") {
            return toTitleCasePlan(subscription.plan_type);
          }
          return "No Plan";
        },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Plan" disableHide />
        ),
        enableSorting: true,
        size: 70,
        minSize: 70,
        cell: ({ row }) => {
          if (isAgencyWhitelisted) {
            return (
              <div className="border border-general-border rounded-lg px-2 py-[5.5px] flex items-center justify-between">
                <Typography variant="p" className="leading-none text-green-600">
                  Whitelisted
                </Typography>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            );
          }

          const subscription = row.original.SubscriptionItems;
          const subscriptionStatus = subscription?.status;
          const subscriptionPlanType = subscription?.plan_type;
          const hasSubscription =
            subscriptionPlanType &&
            typeof subscriptionPlanType === "string" &&
            subscriptionPlanType.length > 0 &&
            subscriptionStatus !== "cancelled";

          const planName = hasSubscription ? toTitleCasePlan(subscriptionPlanType) : "No Plan";

          const cancelAtPeriodEnd = subscription?.cancel_at_period_end;
          const cancelAtDate = subscription?.cancelled_date;

          const statusLabel = cancelAtPeriodEnd && cancelAtDate
            ? `Cancels ${formatShortDate(cancelAtDate)}`
            : subscriptionStatus && subscriptionStatus !== "active"
              ? subscriptionStatus.replace("_", " ")
              : hasSubscription
                ? "Active"
                : null;
          const showStatusPill = Boolean(
            (cancelAtPeriodEnd && cancelAtDate) ||
            (subscriptionStatus && subscriptionStatus !== "cancelled") ||
            hasSubscription
          );
          const trialPill =
            planName === "No Plan" && row.original.isTrialActive && row.original.remainingTrialDays
              ? `Trial ${row.original.remainingTrialDays}d`
              : null;

          const cycleStart = row.original.SubscriptionItems?.current_period_start;
          const cycleEnd = row.original.SubscriptionItems?.current_period_end;
          const cycleLabel = cycleStart && cycleEnd
            ? `Cycle ${formatShortDate(cycleStart)} – ${formatShortDate(cycleEnd)}`
            : null;

          return (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div
                  onClick={() => handleManagePlan(row.original.UniqueId)}
                  className="group flex w-[110px] items-center gap-2 rounded-lg border border-general-border px-3 py-1.5 hover:border-general-primary/40 hover:bg-muted/30 transition"
                >
                  <Typography
                    variant="p"
                    className={`text-sm leading-5 font-semibold ${planName === "Growth" ? "text-green-600" : ""}`}
                  >
                    {planName}
                  </Typography>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
                {showStatusPill && statusLabel && (
                  cancelAtPeriodEnd && cancelAtDate ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="h-6 rounded-md border-amber-200 bg-amber-50 px-2.5 text-[11px] font-semibold leading-none text-amber-700"
                        >
                          {statusLabel}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Access continues until {formatDate(cancelAtDate)}.
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge
                      variant="outline"
                      className={statusLabel === "Active"
                        ? "h-6 rounded-md border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold leading-none text-emerald-700"
                        : "h-6 rounded-md border-muted-foreground/20 px-2.5 text-[11px] font-semibold leading-none text-muted-foreground"}
                    >
                      {statusLabel}
                    </Badge>
                  )
                )}
                {trialPill && (
                  <Badge
                    variant="outline"
                    className="h-6 rounded-md border-sky-200 bg-sky-50 px-2.5 text-[11px] font-semibold leading-none text-sky-700"
                  >
                    {trialPill}
                  </Badge>
                )}
              </div>
              {cycleLabel && (
                <Badge
                  variant="outline"
                  className="w-fit h-6 rounded-md border-muted-foreground/20 px-2.5 text-[11px] font-semibold leading-none text-muted-foreground"
                >
                  {cycleLabel}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "action",
        header: () => (
          <div className="text-left text-sm font-medium text-muted-foreground">
            Action
          </div>
        ),
        enableSorting: false,
        size: 50,
        minSize: 50,
        cell: ({ row }) => {
          const subscription = row.original.SubscriptionItems;
          const hasSubscription =
            subscription?.plan_type &&
            subscription?.status &&
            subscription?.status !== "cancelled";

          if (isAgencyWhitelisted || !hasSubscription) {
            return <span className="text-muted-foreground">-</span>;
          }

          const cancelAtPeriodEnd = subscription?.cancel_at_period_end;
          const isProcessing =
            actionLoading &&
            subscriptionAction?.business.UniqueId === row.original.UniqueId;

          return (
            <Button
              size="sm"
              variant={cancelAtPeriodEnd ? "secondary" : "destructive"}
              disabled={loading || actionLoading}
              onClick={() =>
                openSubscriptionAction(
                  row.original,
                  cancelAtPeriodEnd ? "reactivate" : "cancel"
                )
              }
            >
              {isProcessing ? "Processing..." : cancelAtPeriodEnd ? "Reactivate" : "Cancel"}
            </Button>
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
      const planType =
        row.original.SubscriptionItems?.plan_type?.toLowerCase() || "";
      return name.includes(search) || planType.includes(search);
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
        <Card className="border-none shadow-none py-0">
          <CardHeader className="px-0 pb-2">
            <CardTitle className="text-base">Business Billing</CardTitle>
            <CardDescription>
              Manage subscriptions, renewals, and billing periods per business.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading && profiles.length === 0 ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <DataTable
                table={table}
                isLoading={loading}
                emptyMessage="No businesses found."
                disableHorizontalScroll={true}
                className="h-[calc(100vh-16rem)]"
              >
                <div
                  role="toolbar"
                  aria-orientation="horizontal"
                  className="flex w-full items-start justify-between gap-2 p-1"
                >
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <DataTableSearch
                      value={globalFilter}
                      onChange={setGlobalFilter}
                      placeholder="Search businesses, plans..."
                    />
                  </div>
                </div>
              </DataTable>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Section - Plans */}
      <div className="w-[440px] shrink-0 overflow-auto">
        <Card className="border border-muted/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plans</CardTitle>
            <CardDescription>
              Add new plans or manage add-ons like execution credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <PlansWrapper
              plansData={plansStats}
              modalPlansData={defaultPlansData}
              currentCreditBalance={creditsBalance?.current_balance || 0}
              onPurchaseCredits={handlePurchaseCredits}
              onCreditsRefresh={refetchCredits}
              onMassicOpportunitiesClick={() => setMassicOpportunitiesModalOpen(true)}
              onMassicOpportunitiesDeactivate={() => cancelMassicOpportunities.mutate()}
            />
          </CardContent>
        </Card>
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
    </div>
  );
}
