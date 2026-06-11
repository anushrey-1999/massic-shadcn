"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Search,
} from "lucide-react";
import {
  useDiscoverAssets,
  useSelectAssets,
  useVerifyStep,
} from "@/hooks/use-access-request-flow";
import { PRODUCT_CONFIG } from "@/config/access-request";
import { ProductIcon } from "./ProductIcon";
import type { AccessRequestStep } from "@/types/access-request";

interface GscManualStepProps {
  token: string;
  step: AccessRequestStep;
  agencyEmail: string;
  agencyName: string;
  onStepCompleted: () => void;
}

function getAssetLabel(asset: Record<string, unknown>): string {
  return (asset.siteUrl as string) || (asset.displayName as string) || (asset.id as string) || "Unknown";
}

function getAssetId(asset: Record<string, unknown>): string {
  return (asset.siteUrl as string) || (asset.id as string) || JSON.stringify(asset);
}

export function GscManualStep({ token, step, agencyEmail, agencyName, onStepCompleted }: GscManualStepProps) {
  const config = PRODUCT_CONFIG.gsc;
  const { data: discoverData, isLoading: discovering, isError: discoverError, refetch } = useDiscoverAssets(
    token,
    step.status !== "completed" ? "gsc" : null
  );
  const selectMutation = useSelectAssets(token);
  const { mutateAsync: verifyStep } = useVerifyStep(token);

  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    () => new Set((step.selectedAssets || []).map(getAssetId))
  );
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const isPollingRef = React.useRef(false);
  const [phase, setPhase] = useState<
    "discover" | "select" | "instructions" | "verifying" | "done" | "failed"
  >(
    step.status === "completed"
      ? "done"
      : step.selectedAssets?.length
        ? "instructions"
        : "discover"
  );

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

  const instructionAssets = React.useMemo(
    () => (selectedAssets.length > 0 ? selectedAssets : step.selectedAssets || []),
    [selectedAssets, step.selectedAssets]
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
      setSelectedAssetIds(new Set((step.selectedAssets || []).map(getAssetId)));
      setVerificationMessage(null);
      if (step.status === "completed") {
        setPhase("done");
      } else if (step.selectedAssets?.length) {
        setPhase("instructions");
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
      setVerificationMessage(null);
    } catch {
      setPhase("failed");
    }
  }

  async function copyEmailToClipboard() {
    try {
      await navigator.clipboard.writeText(agencyEmail);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      setCopiedEmail(false);
    }
  }

  async function handleOpenGscSettings(siteUrl: string) {
    await copyEmailToClipboard();
    window.open(
      `https://search.google.com/search-console/users?resource_id=${encodeURIComponent(siteUrl)}`,
      "_blank"
    );
  }

  useEffect(() => {
    if (phase !== "instructions" || step.status === "completed") return;

    let cancelled = false;

    async function pollVerification() {
      if (isPollingRef.current) return;

      try {
        isPollingRef.current = true;
        setVerificationMessage("Checking for granted access...");
        const result = await verifyStep({ product: "gsc" });

        if (cancelled) return;

        if (result.verified) {
          setPhase("done");
          setVerificationMessage(null);
          onStepCompleted();
        } else {
          setVerificationMessage(result.message || "Waiting for Search Console access to be granted.");
        }
      } catch {
        if (!cancelled) {
          setVerificationMessage("Unable to verify yet. We will keep checking automatically.");
        }
      } finally {
        isPollingRef.current = false;
      }
    }

    pollVerification();
    const intervalId = window.setInterval(pollVerification, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [phase, step.status, verifyStep, onStepCompleted]);

  if (phase === "done" || step.status === "completed") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProductIcon product="gsc" size={28} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config.label}</h3>
            <p className="text-sm text-gray-500">Access has been granted</p>
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
            <h3 className="text-lg font-semibold text-gray-900">
              {agencyName} is requesting access to your Google Assets
            </h3>
            <p className="text-sm text-gray-500">
              To grant access to <span className="font-mono font-medium">{agencyEmail}</span> please follow the instructions
            </p>
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
                  Complete these steps to grant access
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-orange-100 bg-white p-3">
                <p className="text-sm font-medium text-gray-900">
                  Step 1: Copy your agency&apos;s email address
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="flex-1 rounded border bg-gray-50 px-2 py-2 text-xs font-mono text-gray-700">
                    {agencyEmail}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyEmailToClipboard}>
                    <Copy className="h-4 w-4 mr-2" />
                    {copiedEmail ? "Copied" : "Copy email"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-orange-100 bg-white p-3">
                <p className="text-sm font-medium text-gray-900">
                  Step 2: Visit the following settings page
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Opening a property will copy the email and launch Google Search Console in a new tab.
                </p>
                <div className="mt-3 space-y-2">
                  {instructionAssets.map((asset) => {
                    const siteUrl = getAssetId(asset);
                    return (
                      <Button
                        key={siteUrl}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleOpenGscSettings(siteUrl)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2 shrink-0" />
                        <span className="truncate">{getAssetLabel(asset)}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-orange-100 bg-white p-3">
                <p className="text-sm font-medium text-gray-900">
                  Step 3: Click Add User and paste your agency&apos;s email address ({agencyEmail}).
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Make sure to select <span className="font-medium">Full</span> permission.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>{verificationMessage || "Checking every 10 seconds for granted access..."}</span>
            </div>
          </CardContent>
        </Card>
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
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggleAsset(assetId)}
                    />
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
