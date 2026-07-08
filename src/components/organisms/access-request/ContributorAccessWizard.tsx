"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GoogleIcon } from "./GoogleIcon";
import { PRODUCT_CONFIG } from "@/config/access-request";
import {
  useContributorStatus,
  useExecuteContributorGrant,
  useSelectContributorAssets,
  useVerifyContributorManualStep,
} from "@/hooks/use-access-request-flow";
import { getBaseURLByPlatform } from "@/hooks/use-api";
import type { AccessCheck, Product } from "@/types/access-request";
import { cn } from "@/lib/utils";
import { getSearchConsoleUsersUrl } from "@/utils/google-search-console";
import { ProductIcon } from "./ProductIcon";

interface ContributorAccessWizardProps {
  token: string;
  sessionToken: string;
}

type Asset = Record<string, unknown>;

const GBP_GRANTABLE_ROLES = new Set(["PRIMARY_OWNER", "OWNER"]);
const GBP_GRANTABLE_PERMISSION_LEVELS = new Set(["OWNER_LEVEL"]);

const STATUS_COPY: Record<string, { label: string; className: string }> = {
  connected: { label: "Connected", className: "border-green-200 bg-green-50 text-green-700" },
  can_grant: { label: "Can grant", className: "border-blue-200 bg-blue-50 text-blue-700" },
  multiple_possible_matches: { label: "Needs review", className: "border-violet-200 bg-violet-50 text-violet-700" },
  manual_review: { label: "Needs review", className: "border-amber-200 bg-amber-50 text-amber-700" },
  manual_match_selected: { label: "Selected manually", className: "border-violet-200 bg-violet-50 text-violet-700" },
  partial_access: { label: "Needs higher access", className: "border-amber-200 bg-amber-50 text-amber-700" },
  viewer_only: { label: "Needs higher access", className: "border-amber-200 bg-amber-50 text-amber-700" },
  no_access_found: { label: "No access here", className: "border-gray-200 bg-gray-50 text-gray-500" },
  failed: { label: "Needs retry", className: "border-red-200 bg-red-50 text-red-700" },
  pending: { label: "Not checked", className: "border-gray-200 bg-gray-50 text-gray-600" },
};

function statusCopy(status?: string) {
  return STATUS_COPY[status || "pending"] || STATUS_COPY.pending;
}

function assetLabel(asset: Asset) {
  return (
    (asset.displayName as string) ||
    (asset.name as string) ||
    (asset.siteUrl as string) ||
    (asset.title as string) ||
    (asset.publicId as string) ||
    (asset.id as string) ||
    "Unknown asset"
  );
}

function assetSubtext(asset: Asset) {
  const parts = [
    asset.accountDisplayName || asset.accountName,
    asset.websiteUri,
    asset.permissionLevel,
    asset.role,
    asset.publicId,
  ].filter(Boolean);
  return parts.join(" · ");
}

function assetKey(asset: Asset) {
  return String(asset.id || asset.path || asset.siteUrl || asset.location || asset.locationId || JSON.stringify(asset));
}

function gscResourceId(asset: Asset) {
  return String(asset.siteUrl || asset.id || asset.path || assetKey(asset));
}

function getEffectiveGbpRole(asset: Asset): string | null {
  const role = typeof asset.role === "string" && asset.role ? asset.role : null;
  if (role) return role;

  const permissionLevel = typeof asset.permissionLevel === "string" && asset.permissionLevel ? asset.permissionLevel : null;
  if (permissionLevel === "OWNER_LEVEL") return "PRIMARY_OWNER";
  if (permissionLevel === "MEMBER_LEVEL") return "MANAGER";
  return permissionLevel;
}

function isGbpGrantable(asset: Asset) {
  const role = typeof asset.role === "string" ? asset.role : null;
  if (role && GBP_GRANTABLE_ROLES.has(role)) return true;

  const permissionLevel = typeof asset.permissionLevel === "string" ? asset.permissionLevel : null;
  return Boolean(permissionLevel && GBP_GRANTABLE_PERMISSION_LEVELS.has(permissionLevel));
}

function formatRole(role: unknown) {
  if (typeof role !== "string" || !role) return "Unknown";
  return role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function getPermissionDisabledReason(product: Product | null | undefined, asset: Asset) {
  if (product === "gbp") {
    if (isGbpGrantable(asset)) return null;
    const role = getEffectiveGbpRole(asset);
    if (role) return `You have access, but only an Owner can add Massic. Your access: ${formatRole(role)}.`;
    return "We could not confirm your access level. Please forward this link to an Owner.";
  }

  if (product === "gsc") {
    const permissionLevel = typeof asset.permissionLevel === "string" ? asset.permissionLevel : null;
    if (!permissionLevel || permissionLevel === "siteOwner") return null;
    return `You can view Search Console, but only an Owner can add Massic. Your access: ${formatRole(permissionLevel)}.`;
  }

  return null;
}

function getAssetDisabledReason(
  product: Product | null | undefined,
  asset: Asset,
  connectedAssetKeys?: Set<string>
) {
  const permissionDisabledReason = getPermissionDisabledReason(product, asset);
  if (permissionDisabledReason) return permissionDisabledReason;

  if (connectedAssetKeys?.has(assetKey(asset))) {
    return "Already connected.";
  }

  return null;
}

function groupedAssets(check?: AccessCheck) {
  const discovered = check?.discoveredAssets || {};
  return {
    matchedAssets: ((discovered.matchedAssets as Asset[] | undefined) || []),
    otherAssets: ((discovered.otherAssets as Asset[] | undefined) || []),
    autoSelectedAssetIds: ((discovered.autoSelectedAssetIds as string[] | undefined) || []),
  };
}

function getConnectedAssetKeys(check?: AccessCheck) {
  if (check?.status !== "connected") return new Set<string>();
  return new Set(((check.selectedAssets as Asset[] | null | undefined) || []).map(assetKey));
}

function mergeAssetKeySets(...sets: Set<string>[]) {
  return new Set(sets.flatMap((set) => [...set]));
}

function AssetRow({
  asset,
  checked,
  disabledReason,
  isConnectedAsset = false,
  onToggle,
  product,
}: {
  asset: Asset;
  checked: boolean;
  disabledReason?: string | null;
  isConnectedAsset?: boolean;
  onToggle: () => void;
  product?: Product | null;
}) {
  const isMatched = asset.matchStatus === "auto_match";
  const isManual = asset.matchStatus === "manual_selected";
  const disabled = Boolean(disabledReason);
  const gbpRole = product === "gbp" ? getEffectiveGbpRole(asset) : null;

  return (
    <label
      className={cn(
        "flex items-start gap-3 p-3",
        disabled ? "cursor-not-allowed bg-gray-50 opacity-70" : "cursor-pointer"
      )}
      title={disabledReason || undefined}
    >
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onToggle} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{assetLabel(asset)}</span>
          {isConnectedAsset && (
            <Badge variant="outline" className="border-green-200 bg-green-50 text-[10px] text-green-700">
              Connected
            </Badge>
          )}
          {!isConnectedAsset && isMatched && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                disabled
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              )}
            >
              {disabled ? "Needs higher access" : "Can grant"}
            </Badge>
          )}
          {!isConnectedAsset && isManual && (
            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-[10px] text-violet-700">
              Selected manually
            </Badge>
          )}
          {!isConnectedAsset && !isMatched && !isManual && (
            <Badge variant="outline" className="border-gray-200 bg-gray-50 text-[10px] text-gray-500">
              Not matched
            </Badge>
          )}
          {gbpRole && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                isGbpGrantable(asset)
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-gray-100 text-gray-600"
              )}
            >
              {formatRole(gbpRole)}
            </Badge>
          )}
        </span>
        {assetSubtext(asset) && <span className="block text-xs text-gray-500">{assetSubtext(asset)}</span>}
        {disabledReason && <span className="mt-1 block text-xs text-gray-500">{disabledReason}</span>}
      </span>
    </label>
  );
}

export function ContributorAccessWizard({ token, sessionToken }: ContributorAccessWizardProps) {
  const { data, isLoading, isError, refetch } = useContributorStatus(token, sessionToken);
  const selectAssets = useSelectContributorAssets(token, sessionToken);
  const executeGrant = useExecuteContributorGrant(token, sessionToken);
  const verifyManual = useVerifyContributorManualStep(token, sessionToken);
  const products = data?.request.products || [];
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedByProduct, setSelectedByProduct] = useState<Record<string, Set<string>>>({});
  const [instructionsFor, setInstructionsFor] = useState<Product | null>(null);
  const [gscLinkOpened, setGscLinkOpened] = useState(false);
  const [gscVerificationMessage, setGscVerificationMessage] = useState<string | null>(null);
  const [isSilentVerifyingGsc, setIsSilentVerifyingGsc] = useState(false);
  const gscVerifyInFlightRef = useRef(false);
  const gscInitialVerifyKeyRef = useRef<string | null>(null);
  const successToastShownRef = useRef<Set<Product>>(new Set());

  const checksByProduct = useMemo(() => {
    const map = new Map<Product, AccessCheck>();
    for (const check of data?.checks || []) map.set(check.systemType, check);
    return map;
  }, [data?.checks]);

  const active = activeProduct || products[0];
  const activeCheck = active ? checksByProduct.get(active) : undefined;
  const activeAggregate = active ? data?.aggregate?.[active] : undefined;
  const currentContributorId = data?.contributor?.id;
  const connectedAssetKeys = useMemo(() => getConnectedAssetKeys(activeCheck), [activeCheck]);
  const { matchedAssets, otherAssets, autoSelectedAssetIds } = groupedAssets(activeCheck);
  const aggregateConnectedAssetKeys = useMemo(
    () => activeAggregate?.status === "connected"
      ? new Set(matchedAssets.map(assetKey))
      : new Set<string>(),
    [activeAggregate?.status, matchedAssets]
  );
  const disabledConnectedAssetKeys = useMemo(
    () => mergeAssetKeySets(connectedAssetKeys, aggregateConnectedAssetKeys),
    [aggregateConnectedAssetKeys, connectedAssetKeys]
  );
  const selected = selectedByProduct[active || ""] || new Set<string>();
  const allVisibleAssets = [...matchedAssets, ...otherAssets];
  const selectableAssets = allVisibleAssets.filter((asset) => !getAssetDisabledReason(active, asset, disabledConnectedAssetKeys));
  const selectedAssets = selectableAssets.filter((asset) => selected.has(assetKey(asset)));
  const selectedAssetsKey = selectedAssets.map(assetKey).join("|");
  const hasAnyAccess = matchedAssets.length + otherAssets.length > 0;
  const checkedAccount = data?.contributor?.googleAccountEmail;
  const agencyEmail = data?.request.agencyEmail || "the agency";
  const website = data?.request.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "this business";
  const isConnectedByCurrentContributor = activeCheck?.status === "connected";
  const isConnectedByAnyContributor = isConnectedByCurrentContributor || activeAggregate?.status === "connected";
  const isConnectedByAnotherContributor = Boolean(
    activeAggregate?.status === "connected" &&
    activeAggregate.contributorId &&
    activeAggregate.contributorId !== currentContributorId &&
    !isConnectedByCurrentContributor
  );
  const activeStatus = statusCopy(isConnectedByAnyContributor ? "connected" : activeCheck?.status);
  const activeProductLabel = active ? PRODUCT_CONFIG[active].label : "this product";
  const isGscInstructionActive = active === "gsc" && instructionsFor === "gsc";

  useEffect(() => {
    if (!active || autoSelectedAssetIds.length === 0 || selectedByProduct[active]) return;
    const selectableIds = new Set(selectableAssets.map(assetKey));
    setSelectedByProduct((prev) => ({
      ...prev,
      [active]: new Set(autoSelectedAssetIds.filter((id) => selectableIds.has(id))),
    }));
  }, [active, autoSelectedAssetIds, selectableAssets, selectedByProduct]);

  const verifyGscAccess = useCallback(
    async ({ silent }: { silent: boolean }) => {
      if (!isGscInstructionActive || gscVerifyInFlightRef.current) return;

      gscVerifyInFlightRef.current = true;
      if (silent) {
        setIsSilentVerifyingGsc(true);
      } else {
        setGscVerificationMessage("Checking if Search Console is connected...");
      }

      try {
        const result = await verifyManual.mutateAsync({ product: "gsc" });

        if (result.verified) {
          setGscVerificationMessage(null);
          await refetch();
          setInstructionsFor(null);

          if (!successToastShownRef.current.has("gsc")) {
            successToastShownRef.current.add("gsc");
            toast.success("Search Console access connected.");
          }
          return;
        }

        if (!silent) {
          setGscVerificationMessage(result.message || "We could not verify access yet. Please confirm the correct email was added.");
        }
      } catch {
        if (!silent) {
          setGscVerificationMessage("We could not verify access yet. Please confirm the correct email was added.");
        }
      } finally {
        gscVerifyInFlightRef.current = false;
        setIsSilentVerifyingGsc(false);
      }
    },
    [isGscInstructionActive, refetch, verifyManual]
  );

  useEffect(() => {
    if (!isGscInstructionActive) return;
    if (gscInitialVerifyKeyRef.current === selectedAssetsKey) return;
    gscInitialVerifyKeyRef.current = selectedAssetsKey;
    void verifyGscAccess({ silent: true });
  }, [isGscInstructionActive, selectedAssetsKey, verifyGscAccess]);

  useEffect(() => {
    if (!isGscInstructionActive) return;

    function verifyWhenVisible() {
      if (document.visibilityState === "visible") {
        void verifyGscAccess({ silent: true });
      }
    }

    window.addEventListener("focus", verifyWhenVisible);
    document.addEventListener("visibilitychange", verifyWhenVisible);

    return () => {
      window.removeEventListener("focus", verifyWhenVisible);
      document.removeEventListener("visibilitychange", verifyWhenVisible);
    };
  }, [isGscInstructionActive, verifyGscAccess]);

  function toggleAsset(asset: Asset) {
    if (!active) return;
    if (getAssetDisabledReason(active, asset, disabledConnectedAssetKeys)) return;
    const key = assetKey(asset);
    setSelectedByProduct((prev) => {
      const next = new Set(prev[active] || []);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [active]: next };
    });
  }

  async function handleGrant() {
    if (!active) return;
    if (selectedAssets.length === 0) return;
    await selectAssets.mutateAsync({ product: active, selectedAssets });
    if (active === "gsc") {
      setGscLinkOpened(false);
      setGscVerificationMessage("Open Search Console, add Massic, then return here. We will check automatically.");
      setInstructionsFor(active);
      return;
    }
    await executeGrant.mutateAsync({ product: active });
    await refetch();

    if (!successToastShownRef.current.has(active)) {
      successToastShownRef.current.add(active);
      toast.success(`${PRODUCT_CONFIG[active].shortLabel} access connected.`);
    }
  }

  async function handleVerifyManual() {
    if (active !== "gsc") return;
    await verifyGscAccess({ silent: false });
  }

  function tryAnotherAccount() {
    const baseUrl = getBaseURLByPlatform("node");
    window.location.href = `${baseUrl}/access-request/auth/google/start?token=${token}&c=${encodeURIComponent(sessionToken)}`;
  }

  const selectedHasUnmatched = selectedAssets.some(
    (asset) => !matchedAssets.some((matchedAsset) => assetKey(matchedAsset) === assetKey(asset))
  );
  const ctaLabel =
    isConnectedByAnyContributor && selectedAssets.length === 0
    ? "Select access to continue"
    : isConnectedByAnyContributor
    ? "Grant more access"
    : activeCheck?.status === "manual_review" || selectedHasUnmatched
    ? "Use this item"
    : activeCheck?.status === "multiple_possible_matches"
    ? "Grant access"
        : active === "gsc"
          ? "Show instructions"
          : "Grant access";

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
            <p className="font-medium">We could not load your access check.</p>
            <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Help connect {website} to Massic</h1>
          <p className="text-sm text-gray-600">
            Checked account: <span className="font-mono font-medium">{checkedAccount}</span>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {products.map((product) => {
            const config = PRODUCT_CONFIG[product];
            const check = checksByProduct.get(product);
            const aggregate = data?.aggregate?.[product];
            const connectedByAnother = Boolean(
              aggregate?.status === "connected" &&
              aggregate.contributorId &&
              aggregate.contributorId !== data?.contributor?.id &&
              check?.status !== "connected"
            );
            const status = statusCopy(aggregate?.status === "connected" ? "connected" : check?.status);
            return (
              <button
                key={product}
                type="button"
                onClick={() => setActiveProduct(product)}
                className={cn(
                        "cursor-pointer rounded-lg border bg-white p-4 text-left transition",
                  active === product ? "border-general-primary shadow-sm" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <ProductIcon product={product} size={22} />
                  <span className="font-medium text-sm">{config.shortLabel}</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Badge variant="outline" className={status.className}>{status.label}</Badge>
                  {connectedByAnother && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-green-700">
                          <Info className="h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">Connected by another Google account.</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {active && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ProductIcon product={active} size={28} />
                    <h2 className="text-xl font-semibold">{PRODUCT_CONFIG[active].label}</h2>
                  </div>
                  <p className="text-sm text-gray-600">{activeCheck?.message || "Checking this Google account."}</p>
                </div>
              {isConnectedByAnyContributor && <Check className="h-6 w-6 text-green-600" />}
                {activeCheck?.status === "failed" && <XCircle className="h-6 w-6 text-red-600" />}
              </div>

            <div className="space-y-4">
              {isConnectedByAnyContributor && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-5 w-5 text-green-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-green-900">Connected</p>
                        {isConnectedByAnotherContributor && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-green-700">
                                <Info className="h-3.5 w-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">Connected by another Google account.</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <p className="text-sm text-green-700">
                        {isConnectedByAnotherContributor
                          ? `Access for ${activeProductLabel} is already connected by another Google account.`
                          : `Access has been connected for ${activeProductLabel} from this Google account.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!hasAnyAccess ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-sm font-medium">We could not find matching access in this Google account.</p>
                <p className="text-sm text-gray-600">
                  Switch to a different Google account, or forward this same link to the person who manages {PRODUCT_CONFIG[active].label}.
                </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={tryAnotherAccount}>
                      <GoogleIcon className="h-4 w-4 mr-2" />Switch Google account
                    </Button>
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(window.location.href.split("?")[0])}>
                    <Copy className="h-4 w-4 mr-2" />Copy link
                  </Button>
                </div>
                </div>
              ) : (
                <>
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-blue-950">Access found for {website}</p>
                        <p className="text-xs text-blue-800">Massic found the likely match for this business.</p>
                      </div>
                      <Badge variant="outline" className={activeStatus.className}>{activeStatus.label}</Badge>
                    </div>
                    {matchedAssets.length > 0 ? (
                      <div className="max-h-[360px] divide-y overflow-y-auto rounded-md border border-blue-100 bg-white">
                        {matchedAssets.map((asset) => (
                      <AssetRow
                        key={assetKey(asset)}
                        asset={asset}
                        checked={selected.has(assetKey(asset)) || disabledConnectedAssetKeys.has(assetKey(asset))}
                        disabledReason={getAssetDisabledReason(active, asset, disabledConnectedAssetKeys)}
                        isConnectedAsset={disabledConnectedAssetKeys.has(assetKey(asset))}
                        onToggle={() => toggleAsset(asset)}
                        product={active}
                      />
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        We could not match this website automatically. Select an item only if you recognize it as this business.
                      </p>
                    )}
                  </div>

                  {otherAssets.length > 0 && matchedAssets.length === 0 && (
                    <div className="rounded-lg border border-amber-200 bg-white">
                      <div className="border-b border-amber-100 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-950">Other access found</p>
                        <p className="text-xs text-amber-800">
                          This Google account can access these items, but Massic could not confirm they belong to {website}.
                        </p>
                      </div>
                      <div className="max-h-[360px] divide-y overflow-y-auto">
                        {otherAssets.map((asset) => (
                      <AssetRow
                        key={assetKey(asset)}
                        asset={asset}
                        checked={selected.has(assetKey(asset)) || disabledConnectedAssetKeys.has(assetKey(asset))}
                        disabledReason={getAssetDisabledReason(active, asset, disabledConnectedAssetKeys)}
                        isConnectedAsset={disabledConnectedAssetKeys.has(assetKey(asset))}
                        onToggle={() => toggleAsset(asset)}
                        product={active}
                      />
                        ))}
                      </div>
                    </div>
                  )}

                  {otherAssets.length > 0 && matchedAssets.length > 0 && (
                    <details className="rounded-lg border border-gray-200 bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-medium">
                        Other items this Google account can access
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </summary>
                      <div className="max-h-[360px] overflow-y-auto border-t border-gray-200">
                        {otherAssets.map((asset) => (
                      <AssetRow
                        key={assetKey(asset)}
                        asset={asset}
                        checked={selected.has(assetKey(asset)) || disabledConnectedAssetKeys.has(assetKey(asset))}
                        disabledReason={getAssetDisabledReason(active, asset, disabledConnectedAssetKeys)}
                        isConnectedAsset={disabledConnectedAssetKeys.has(assetKey(asset))}
                        onToggle={() => toggleAsset(asset)}
                        product={active}
                      />
                        ))}
                      </div>
                    </details>
                  )}

                  {selectedHasUnmatched && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Massic could not confirm this belongs to {website}. Continue only if you recognize it.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleGrant}
                      disabled={selectedAssets.length === 0 || selectAssets.isPending || executeGrant.isPending}
                    >
                      {(selectAssets.isPending || executeGrant.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {ctaLabel}
                    </Button>
                    <Button variant="outline" onClick={tryAnotherAccount}>
                      <GoogleIcon className="h-4 w-4 mr-2" />Switch Google account
                    </Button>
                </div>
                </>
              )}
            </div>

              {isGscInstructionActive && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-blue-900">Search Console needs one manual step.</p>
                  <ol className="list-decimal pl-5 text-sm text-blue-900 space-y-1">
                    <li>Open Google Search Console.</li>
                    <li>Select the property shown above.</li>
                    <li>Go to Settings, then Users and permissions.</li>
                    <li>Add <span className="font-mono">{agencyEmail}</span> with Full permission.</li>
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssets.map((asset) => {
                      const resourceId = gscResourceId(asset);

                      return (
                        <Button key={resourceId} asChild variant="outline">
                          <a
                            href={getSearchConsoleUsersUrl(resourceId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              setGscLinkOpened(true);
                              setGscVerificationMessage("Return here after adding Massic. We will check automatically.");
                              navigator.clipboard?.writeText(agencyEmail).catch(() => undefined);
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            <span className="max-w-[220px] truncate">Open {assetLabel(asset)}</span>
                          </a>
                        </Button>
                      );
                    })}
                  </div>
                  {(isSilentVerifyingGsc || gscVerificationMessage) && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs text-blue-800">
                      {isSilentVerifyingGsc && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                      <span>
                        {isSilentVerifyingGsc
                          ? "Checking if Search Console is connected..."
                          : gscVerificationMessage}
                      </span>
                    </div>
                  )}
                  {gscLinkOpened && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-900 hover:bg-blue-100"
                      onClick={handleVerifyManual}
                      disabled={verifyManual.isPending || isSilentVerifyingGsc}
                    >
                      {verifyManual.isPending && !isSilentVerifyingGsc && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Check again
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
