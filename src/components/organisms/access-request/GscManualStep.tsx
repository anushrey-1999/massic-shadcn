"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Check,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Search,
} from "lucide-react";
import {
  useDiscoverAssets,
  useSelectAssets,
  useCompleteManualStep,
} from "@/hooks/use-access-request-flow";
import { PRODUCT_CONFIG } from "@/config/access-request";
import { ProductIcon } from "./ProductIcon";
import type { AccessRequestStep } from "@/types/access-request";

interface GscManualStepProps {
  token: string;
  step: AccessRequestStep;
  agencyEmail: string;
  onStepCompleted: () => void;
}

function getAssetLabel(asset: Record<string, unknown>): string {
  return (asset.siteUrl as string) || (asset.displayName as string) || (asset.id as string) || "Unknown";
}

function getAssetId(asset: Record<string, unknown>): string {
  return (asset.siteUrl as string) || (asset.id as string) || JSON.stringify(asset);
}

export function GscManualStep({ token, step, agencyEmail, onStepCompleted }: GscManualStepProps) {
  const config = PRODUCT_CONFIG.gsc;
  const { data: discoverData, isLoading: discovering, isError: discoverError, refetch } = useDiscoverAssets(
    token,
    step.status !== "completed" ? "gsc" : null
  );
  const selectMutation = useSelectAssets(token);
  const completeMutation = useCompleteManualStep(token);

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<
    "discover" | "select" | "instructions" | "verifying" | "done" | "failed"
  >(step.status === "completed" ? "done" : "discover");

  const assets = React.useMemo(() => {
    const raw = discoverData?.assets;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return Object.values(raw).reduce<Record<string, unknown>[]>((acc, val) => {
      if (Array.isArray(val)) return acc.concat(val);
      return acc;
    }, []);
  }, [discoverData?.assets]);

  const selectedAssets = React.useMemo(
    () => assets.filter((a) => selectedAssetIds.has(getAssetId(a))),
    [assets, selectedAssetIds]
  );

  useEffect(() => {
    if (step.status === "completed") {
      setPhase("done");
    }
  }, [step.status]);

  const prevStepId = React.useRef(step.id);
  useEffect(() => {
    if (prevStepId.current !== step.id) {
      prevStepId.current = step.id;
      setSelectedAssetIds(new Set());
      if (step.status === "completed") {
        setPhase("done");
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

  function toggleAsset(id: string) {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleProceedToInstructions() {
    if (selectedAssets.length === 0) return;

    try {
      await selectMutation.mutateAsync({
        product: "gsc",
        selectedAssets,
      });
      setPhase("instructions");
    } catch {
      setPhase("failed");
    }
  }

  async function handleComplete() {
    try {
      setPhase("verifying");
      await completeMutation.mutateAsync({ product: "gsc" });
      setPhase("done");
      onStepCompleted();
    } catch {
      setPhase("instructions");
    }
  }

  if (phase === "done" || step.status === "completed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProductIcon product="gsc" size={28} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
            <p className="text-sm text-gray-500">Manual step completed</p>
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
                Search Console access has been confirmed
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
          <ProductIcon product="gsc" size={28} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
            <p className="text-sm text-gray-500">Something went wrong</p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6 space-y-3">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 break-words min-w-0">Failed to process. Please try again.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPhase("select")}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "instructions" || phase === "verifying") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProductIcon product="gsc" size={28} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
            <p className="text-sm text-gray-500">Manual step required</p>
          </div>
        </div>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="py-5 space-y-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-800">
                  Google Search Console requires manual setup
                </p>
                <p className="text-xs text-orange-700">
                  Follow these steps to grant access:
                </p>
              </div>
            </div>

            <ol className="space-y-2 pl-6">
              <li className="text-sm text-gray-700">
                <span className="font-medium">1.</span> Open a property below in Search Console
              </li>
              <li className="text-sm text-gray-700">
                <span className="font-medium">2.</span> Go to{" "}
                <span className="font-medium">Settings → Users and permissions</span>
              </li>
              <li className="text-sm text-gray-700">
                <span className="font-medium">3.</span> Click{" "}
                <span className="font-medium">Add user</span>
              </li>
              <li className="text-sm text-gray-700">
                <span className="font-medium">4.</span> Enter the email:{" "}
                <code className="bg-white px-1.5 py-0.5 rounded text-xs font-mono border">
                  {agencyEmail}
                </code>
              </li>
              <li className="text-sm text-gray-700">
                <span className="font-medium">5.</span> Set permission to{" "}
                <span className="font-medium">Full</span> and click Add
              </li>
              <li className="text-sm text-gray-700">
                <span className="font-medium">6.</span> Repeat for each property below
              </li>
            </ol>

            <div className="space-y-2">
              {selectedAssets.map((asset) => {
                const siteUrl = asset.siteUrl as string;
                const resourceId = encodeURIComponent(siteUrl);
                return (
                  <Button
                    key={siteUrl}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      window.open(
                        `https://search.google.com/search-console/users?resource_id=${resourceId}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">{siteUrl}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          onClick={handleComplete}
          disabled={phase === "verifying"}
        >
          {phase === "verifying" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              I&apos;ve Completed This
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ProductIcon product="gsc" size={28} />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
          <p className="text-sm text-gray-500">
            {discovering
              ? "Discovering your properties..."
              : "Select properties to grant access"}
          </p>
        </div>
      </div>

      {discovering ? (
        <Card>
          <CardContent className="py-6 space-y-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Search className="h-4 w-4" />
              <p className="text-sm">
                Looking for your Search Console properties...
              </p>
            </div>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3.5 w-3/4 rounded bg-gray-200 animate-pulse" />
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
            <p className="text-sm text-red-800">
              Failed to load Search Console properties. This may be due to API rate limits.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-sm text-gray-500">
              No Search Console properties found for this Google account.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            {selectedAssetIds.size} of {assets.length} selected
          </p>

          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {assets.map((asset) => {
              const assetId = getAssetId(asset);
              const isSelected = selectedAssetIds.has(assetId);
              return (
                <div
                  key={assetId}
                  className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "border-general-primary bg-general-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => toggleAsset(assetId)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isSelected} />
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {getAssetLabel(asset)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            className="w-full"
            disabled={selectedAssetIds.size === 0 || selectMutation.isPending}
            onClick={handleProceedToInstructions}
          >
            {selectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Continue (${selectedAssetIds.size} selected)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
