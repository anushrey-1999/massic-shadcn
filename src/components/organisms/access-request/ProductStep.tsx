"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Check, XCircle, RefreshCw, ShieldCheck } from "lucide-react";
import {
  useDiscoverAssets,
  useSelectAssets,
  useExecuteStep,
  useVerifyStep,
} from "@/hooks/use-access-request-flow";
import { PRODUCT_CONFIG } from "@/config/access-request";
import { ProductIcon } from "./ProductIcon";
import type { AccessRequestStep } from "@/types/access-request";

interface ProductStepProps {
  token: string;
  step: AccessRequestStep;
  onStepCompleted: () => void;
}

function getAssetLabel(asset: Record<string, unknown>): string {
  return (
    (asset.displayName as string) ||
    (asset.name as string) ||
    (asset.siteUrl as string) ||
    (asset.id as string) ||
    "Unknown"
  );
}

function getAssetId(asset: Record<string, unknown>): string {
  return (
    (asset.id as string) ||
    (asset.path as string) ||
    (asset.siteUrl as string) ||
    (asset.accountId as string) ||
    JSON.stringify(asset)
  );
}

// GBP accounts expose the authenticated user's role on each account. Only
// Primary Owners / Owners are allowed to invite new admins via the Business
// Profile API — any other role (MANAGER, SITE_MANAGER, …) gets a 403
// "The caller does not have permission" from Google. We use this to render
// non-owner accounts as disabled with a clear explanation.
const GBP_GRANTABLE_ROLES = new Set(["PRIMARY_OWNER", "OWNER"]);
// Google sometimes returns `permissionLevel` instead of `role` (especially for
// personal accounts without an organization link). OWNER_LEVEL ≈ Primary Owner.
const GBP_GRANTABLE_PERMISSION_LEVELS = new Set(["OWNER_LEVEL"]);

function getEffectiveGbpRole(asset: Record<string, unknown>): string | null {
  const role = typeof asset.role === "string" && asset.role ? asset.role : null;
  if (role) return role;
  const permissionLevel =
    typeof asset.permissionLevel === "string" && asset.permissionLevel
      ? asset.permissionLevel
      : null;
  // Map permissionLevel → role vocabulary so we can render one consistent label.
  if (permissionLevel === "OWNER_LEVEL") return "PRIMARY_OWNER";
  if (permissionLevel === "MEMBER_LEVEL") return "MANAGER";
  return null;
}

function isGbpGrantable(asset: Record<string, unknown>): boolean {
  const role = typeof asset.role === "string" ? asset.role : null;
  if (role && GBP_GRANTABLE_ROLES.has(role)) return true;
  const permissionLevel =
    typeof asset.permissionLevel === "string" ? asset.permissionLevel : null;
  if (permissionLevel && GBP_GRANTABLE_PERMISSION_LEVELS.has(permissionLevel)) return true;
  return false;
}

function formatGbpRole(role: unknown): string {
  if (typeof role !== "string" || !role) return "Unknown";
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function getAssetDisabledReason(
  product: string,
  asset: Record<string, unknown>
): string | null {
  if (product !== "gbp") return null;
  if (isGbpGrantable(asset)) return null;
  const effective = getEffectiveGbpRole(asset);
  if (effective) {
    return `Only Primary Owners or Owners can grant access. Your role: ${formatGbpRole(effective)}.`;
  }
  return "Unable to verify your role on this account. Only Primary Owners / Owners can grant access.";
}

export function ProductStep({ token, step, onStepCompleted }: ProductStepProps) {
  const config = PRODUCT_CONFIG[step.product];
  const { data: discoverData, isLoading: discovering, isError: discoverError, error: discoverErrorObj, refetch: rediscover } = useDiscoverAssets(
    token,
    step.status !== "completed" ? step.product : null
  );
  const selectMutation = useSelectAssets(token);
  const executeMutation = useExecuteStep(token);
  const verifyMutation = useVerifyStep(token);

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"discover" | "select" | "granting" | "done" | "failed">(
    step.status === "completed" ? "done" : "discover"
  );

  const assets = React.useMemo(() => {
    const raw = discoverData?.assets;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    // Backend returns assets as { sites: [...] } or { accounts: [...] } — flatten all nested arrays
    return Object.values(raw).reduce<Record<string, unknown>[]>((acc, val) => {
      if (Array.isArray(val)) return acc.concat(val);
      return acc;
    }, []);
  }, [discoverData?.assets]);

  useEffect(() => {
    if (step.status === "completed") {
      setPhase("done");
    } else if (step.status === "failed") {
      setPhase("failed");
    }
  }, [step.status]);

  const prevStepId = React.useRef(step.id);
  useEffect(() => {
    if (prevStepId.current !== step.id) {
      prevStepId.current = step.id;
      setSelectedAssetIds(new Set());
      if (step.status === "completed") {
        setPhase("done");
      } else if (step.status === "failed") {
        setPhase("failed");
      } else {
        setPhase("discover");
      }
    }
  }, [step.id, step.status]);

  useEffect(() => {
    if (assets.length > 0 && phase === "discover") {
      setPhase("select");
    }
  }, [assets, phase]);

  const selectableAssets = React.useMemo(
    () => assets.filter((a) => !getAssetDisabledReason(step.product, a)),
    [assets, step.product]
  );

  function toggleAsset(assetId: string, disabled: boolean) {
    if (disabled) return;
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedAssetIds.size === selectableAssets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(selectableAssets.map((a) => getAssetId(a))));
    }
  }

  async function handleGrant() {
    const selectedAssets = assets.filter((a) =>
      selectedAssetIds.has(getAssetId(a))
    );
    if (selectedAssets.length === 0) return;

    try {
      setPhase("granting");
      await selectMutation.mutateAsync({
        product: step.product,
        selectedAssets,
      });
      await executeMutation.mutateAsync({ product: step.product });
      setPhase("done");
      onStepCompleted();
    } catch {
      setPhase("failed");
    }
  }

  async function handleRetry() {
    setPhase("discover");
    setSelectedAssetIds(new Set());
    rediscover();
  }

  if (phase === "done" || step.status === "completed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProductIcon product={step.product} size={28} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config?.label}</h3>
            <p className="text-sm text-gray-500">Access granted successfully</p>
          </div>
        </div>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-6 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">Completed</p>
              <p className="text-xs text-green-600">
                Access has been granted for {config?.label || step.product}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProductIcon product={step.product} size={28} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config?.label}</h3>
            <p className="text-sm text-gray-500">Something went wrong</p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-red-800">Failed</p>
                <p className="text-xs text-red-600 break-words">
                  {step.error || executeMutation.error?.message || "Failed to grant access. Please try again."}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "granting") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProductIcon product={step.product} size={28} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config?.label}</h3>
            <p className="text-sm text-gray-500">Granting access...</p>
          </div>
        </div>
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="py-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  Granting access to {config?.label}
                </p>
                <p className="text-xs text-blue-600">
                  Please don&apos;t close this page
                </p>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ProductIcon product={step.product} size={28} />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{config?.label}</h3>
          <p className="text-sm text-gray-500">
            {discovering
              ? "Discovering your accounts..."
              : "Select the accounts to share access"}
          </p>
        </div>
      </div>

      {discovering ? (
        <Card>
          <CardContent className="py-6 space-y-3">
            <p className="text-sm text-gray-500">
              Looking for your {config?.label} accounts...
            </p>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded bg-gray-200 animate-pulse" />
                    <div className="h-2.5 w-1/2 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : discoverError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-sm text-red-800 break-words">
              {(discoverErrorObj as any)?.response?.data?.message ||
                `Failed to load ${config?.label} accounts. Please try again.`}
            </p>
            <Button variant="outline" size="sm" onClick={() => rediscover()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-sm text-gray-500">
              No {config?.label} accounts found for this Google account.
            </p>
            <Button variant="outline" size="sm" onClick={() => rediscover()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {selectedAssetIds.size} of {selectableAssets.length} selected
              {selectableAssets.length !== assets.length && (
                <>
                  {" "}
                  <span className="text-gray-400">
                    ({assets.length - selectableAssets.length} not eligible)
                  </span>
                </>
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="text-xs h-7"
              disabled={selectableAssets.length === 0}
            >
              {selectedAssetIds.size === selectableAssets.length && selectableAssets.length > 0
                ? "Deselect All"
                : "Select All"}
            </Button>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {assets.map((asset) => {
              const assetId = getAssetId(asset);
              const isSelected = selectedAssetIds.has(assetId);
              const disabledReason = getAssetDisabledReason(step.product, asset);
              const disabled = !!disabledReason;
              const role = step.product === "gbp" ? getEffectiveGbpRole(asset) : null;
              return (
                <div
                  key={assetId}
                  className={`rounded-lg border p-3 transition-colors ${
                    disabled
                      ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "border-general-primary bg-general-primary/5 cursor-pointer"
                      : "border-gray-200 hover:border-gray-300 cursor-pointer"
                  }`}
                  onClick={() => toggleAsset(assetId, disabled)}
                  aria-disabled={disabled}
                  title={disabledReason || undefined}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isSelected} disabled={disabled} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {getAssetLabel(asset)}
                        </p>
                        {step.product === "gbp" && role && (
                          <span
                            className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                              GBP_GRANTABLE_ROLES.has(role)
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-gray-200 bg-gray-100 text-gray-600"
                            }`}
                          >
                            {formatGbpRole(role)}
                          </span>
                        )}
                      </div>
                      {typeof asset.id === "string" && asset.id !== getAssetLabel(asset) && (
                        <p className="text-xs text-gray-400 font-mono truncate">
                          {asset.id}
                        </p>
                      )}
                      {disabledReason && (
                        <p className="text-xs text-gray-500 mt-1">{disabledReason}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            className="w-full"
            disabled={selectedAssetIds.size === 0}
            onClick={handleGrant}
          >
            Grant Access ({selectedAssetIds.size} selected)
          </Button>
        </div>
      )}
    </div>
  );
}
