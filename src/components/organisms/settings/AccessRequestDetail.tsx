"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ChevronDown, Copy, Eye, Loader2, Mail, RefreshCw, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccessRequestDetail, useShareAccessRequest } from "@/hooks/use-access-requests";
import { PRODUCT_CONFIG, STATUS_CONFIG } from "@/config/access-request";
import type {
 AccessCheck,
 AccessContributor,
 AccessGrant,
 AccessRequest,
 AccessRequestShare,
 Product,
} from "@/types/access-request";
import { cn } from "@/lib/utils";
import { ProductIcon } from "@/components/organisms/access-request/ProductIcon";
import { MultiEmailInput } from "@/components/molecules/MultiEmailInput";

interface AccessRequestDetailProps {
  request: AccessRequest | null;
  onClose: () => void;
}

type Asset = Record<string, unknown>;

const VISIBLE_SCROLLBAR_CLASS =
  "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400";
const VISIBLE_SCROLLBAR_STYLE: React.CSSProperties = {
  scrollbarColor: "#d1d5db transparent",
  scrollbarWidth: "thin",
};

function TruncatedText({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className={cn("truncate", className)}>{text}</p>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}

const FOUR_STATE_META = {
  granted: { label: "Granted", className: "border-green-200 bg-green-50 text-green-700" },
  can_grant: { label: "Can grant", className: "border-blue-200 bg-blue-50 text-blue-700" },
  needs_review: { label: "Needs review", className: "border-amber-200 bg-amber-50 text-amber-700" },
  cannot_grant: { label: "Cannot grant", className: "border-gray-200 bg-gray-50 text-gray-500" },
  not_matched: { label: "Not matched", className: "border-gray-200 bg-gray-50 text-gray-500" },
} as const;

type FourStateKey = keyof typeof FOUR_STATE_META;

const STATUS_TO_FOUR_STATE: Record<string, FourStateKey> = {
  connected: "granted",
  matched_granted: "granted",
  manual_selection_granted: "granted",
  can_grant: "can_grant",
  manual_match_selected: "can_grant",
  multiple_possible_matches: "needs_review",
  manual_review: "needs_review",
  partial_access: "needs_review",
  viewer_only: "needs_review",
  failed: "needs_review",
  no_access_found: "cannot_grant",
  pending: "cannot_grant",
  not_matched: "not_matched",
};

const GBP_GRANTABLE_ROLES = new Set(["PRIMARY_OWNER", "OWNER"]);
const GBP_GRANTABLE_PERMISSION_LEVELS = new Set(["OWNER_LEVEL"]);

function isAssetOwnerGrantable(product: Product | undefined, asset: Asset) {
  if (product === "gbp") {
    const role = typeof asset.role === "string" ? asset.role : null;
    if (role) return GBP_GRANTABLE_ROLES.has(role);
    const permissionLevel = typeof asset.permissionLevel === "string" ? asset.permissionLevel : null;
    return Boolean(permissionLevel && GBP_GRANTABLE_PERMISSION_LEVELS.has(permissionLevel));
  }

  if (product === "gsc") {
    const permissionLevel = typeof asset.permissionLevel === "string" ? asset.permissionLevel : null;
    return !permissionLevel || permissionLevel === "siteOwner";
  }

  if (product === "ga4") {
    const permissionLevel = typeof asset.permissionLevel === "string" ? asset.permissionLevel : null;
    return permissionLevel === "admin";
  }

  return true;
}

const CONNECTED_GRANT_STATUSES = new Set(["completed", "verified", "connected"]);

function statusMeta(status?: string) {
  const key = STATUS_TO_FOUR_STATE[status || "pending"] || "cannot_grant";
  return FOUR_STATE_META[key];
}

function AccessStatusBadge({ status, className }: { status?: string; className?: string }) {
  const meta = statusMeta(status);

  return (
    <Badge variant="outline" className={cn("whitespace-nowrap text-[10px]", meta.className, className)}>
      {meta.label}
    </Badge>
  );
}

function checkByProduct(contributor?: AccessContributor | null) {
  return new Map((contributor?.checks || []).map((check) => [check.systemType, check]));
}

function groupedAssets(check?: AccessCheck) {
  const discovered = check?.discoveredAssets || {};

  return {
    matchedAssets: ((discovered.matchedAssets as Asset[] | undefined) || []),
    otherAssets: ((discovered.otherAssets as Asset[] | undefined) || []),
  };
}

function shouldShowMatchedResourceName(check?: AccessCheck) {
  if (!check?.matchedResourceName) return false;
  return !["manual_review", "no_access_found"].includes(check.status);
}

function assetName(asset: Asset) {
  return (
    (asset.displayName as string) ||
    (asset.name as string) ||
    (asset.siteUrl as string) ||
    (asset.title as string) ||
    (asset.location as string) ||
    (asset.locationId as string) ||
    (asset.publicId as string) ||
    (asset.id as string) ||
    "Unknown asset"
  );
}

function assetContext(asset: Asset) {
  return (
    (asset.accountDisplayName as string) ||
    (asset.accountName as string) ||
    (asset.websiteUri as string) ||
    (asset.location as string) ||
    (asset.publicId as string) ||
    (asset.path as string) ||
    "-"
  );
}

function assetKey(asset: Asset) {
  return String(
    asset.id ||
      asset.path ||
      asset.siteUrl ||
      asset.location ||
      asset.locationId ||
      asset.publicId ||
      asset.name ||
      JSON.stringify(asset)
  );
}

function formatAccessLevelValue(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function assetAccessLevel(asset: Asset) {
  const raw = (asset.permissionLevel as string) || (asset.role as string) || "";
  return raw ? formatAccessLevelValue(raw) : "-";
}

function grantIncludesAsset(grant: AccessGrant | undefined, asset: Asset) {
  if (!grant?.selectedAssets?.length) return null;
  const selectedKeys = new Set(grant.selectedAssets.map((selectedAsset) => assetKey(selectedAsset as Asset)));
  return selectedKeys.has(assetKey(asset));
}

function assetStatus(asset: Asset, grant?: AccessGrant, product?: Product) {
  if (grant) {
    if (grant.grantStatus === "failed") return "failed";
    if (CONNECTED_GRANT_STATUSES.has(grant.grantStatus)) {
      const isSelected = grantIncludesAsset(grant, asset);
      if (isSelected !== false) {
        if (asset.matchStatus === "manual_selected" || (isSelected && asset.matchStatus !== "auto_match")) {
          return "manual_selection_granted";
        }
        if (asset.matchStatus === "auto_match") return "matched_granted";
      }
    }
  }

  // A domain/name match only means the asset belongs to this website - it
  // says nothing about whether this Google account's role on it is actually
  // sufficient to grant Massic access (e.g. GSC siteFullUser matches the
  // site but, unlike siteOwner, can't manage other users).
  const ownerGrantable = isAssetOwnerGrantable(product, asset);
  if (asset.matchStatus === "auto_match") return ownerGrantable ? "can_grant" : "partial_access";
  if (asset.matchStatus === "manual_selected") return ownerGrantable ? "manual_match_selected" : "partial_access";
  return ownerGrantable ? "not_matched" : "no_access_found";
}

function grantedAssetNamesForProduct(request: AccessRequest, product: Product) {
  const names = new Set<string>();

  for (const contributor of request.contributors || []) {
    for (const grant of contributor.grants || []) {
      if (grant.systemType !== product || !CONNECTED_GRANT_STATUSES.has(grant.grantStatus)) continue;

      if (grant.selectedAssets?.length) {
        for (const selectedAsset of grant.selectedAssets) {
          names.add(assetName(selectedAsset as Asset));
        }
        continue;
      }

      if (grant.resourceName) names.add(grant.resourceName);
    }
  }

 return [...names].filter((name) => name && name !== "Unknown asset");
}

function formatDateTime(value?: string | null) {
 if (!value) return null;
 return new Date(value).toLocaleString("en-US", {
 month: "short",
 day: "numeric",
 hour: "numeric",
 minute: "2-digit",
 });
}

function shareStatusMeta(share: AccessRequestShare) {
 if (share.lastOpenedAt) {
 return { label: "Opened", className: "border-green-200 bg-green-50 text-green-700" };
 }
 if (share.status === "failed") {
 return { label: "Failed", className: "border-red-200 bg-red-50 text-red-700" };
 }
 if (share.status === "sent") {
 return { label: "Sent", className: "border-blue-200 bg-blue-50 text-blue-700" };
 }
 return { label: "Pending", className: "border-gray-200 bg-gray-50 text-gray-700" };
}

function ShareAccessForm({
 request,
 onShared,
}: {
 request: AccessRequest;
 onShared: () => void;
}) {
 const [emails, setEmails] = useState<string[]>([]);
 const shareMutation = useShareAccessRequest(request.id);

 async function handleShare() {
 if (emails.length === 0) {
 toast.error("Add at least one email");
 return;
 }

 try {
 await shareMutation.mutateAsync({ emails });
 setEmails([]);
 toast.success("Access request shared");
 onShared();
 } catch (error: any) {
 toast.error(error?.message || "Failed to share access request");
 }
 }

 return (
 <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
 <MultiEmailInput
 value={emails}
 onChange={setEmails}
 disabled={shareMutation.isPending}
 placeholder="owner@example.com, developer@example.com"
 className="sm:flex-1"
 />
 <Button
 type="button"
 onClick={handleShare}
 disabled={shareMutation.isPending || emails.length === 0}
 className="sm:w-auto"
 >
 {shareMutation.isPending ? (
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 ) : (
 <Send className="mr-2 h-4 w-4" />
 )}
 {shareMutation.isPending ? "Sending..." : "Send"}
 </Button>
 </div>
 );
}

function ShareStatusList({ shares = [] }: { shares?: AccessRequestShare[] }) {
 if (shares.length === 0) {
 return (
 <div className="rounded-md border border-dashed border-general-border p-4 text-sm text-general-muted-foreground">
 No email invites sent yet.
 </div>
 );
 }

 return (
 <div className={cn("max-h-64 divide-y divide-general-border overflow-y-auto", VISIBLE_SCROLLBAR_CLASS)} style={VISIBLE_SCROLLBAR_STYLE}>
 {shares.map((share) => {
 const meta = shareStatusMeta(share);
 const lastSentAt = formatDateTime(share.lastSentAt);
 const lastOpenedAt = formatDateTime(share.lastOpenedAt);
 return (
 <div key={share.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
 <div className="min-w-0">
 <TruncatedText text={share.email} className="text-sm font-medium text-general-foreground" />
 <p className="text-xs text-general-muted-foreground">
 {lastSentAt ? `Sent ${lastSentAt}` : "Not sent yet"} ·{" "}
 {lastOpenedAt ? `Opened ${lastOpenedAt}` : "Not opened yet"} ·{" "}
 Sent {share.sendCount || 0} time{share.sendCount === 1 ? "" : "s"}
 </p>
 {share.lastError && (
 <p className="mt-1 truncate text-xs text-red-600" title={share.lastError}>
 {share.lastError}
 </p>
 )}
 </div>
 <Badge variant="outline" className={cn("w-fit text-[10px]", meta.className)}>
 {meta.label}
 </Badge>
 </div>
 );
 })}
 </div>
 );
}

function AccessLinkCard({
 request,
 statusConfig,
 onCopyLink,
 onShared,
}: {
 request: AccessRequest;
 statusConfig: { variant: any; className: string; label: string };
 onCopyLink: () => void;
 onShared: () => void;
}) {
 const [shareOpen, setShareOpen] = useState(false);
 const shares = request.shares || [];
 const url =
 request.requestUrl ||
 `${typeof window !== "undefined" ? window.location.origin : ""}/google-access/r/${request.token}`;

 return (
 <div className="rounded-lg border border-general-border bg-white p-4">
 <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
 <div className="min-w-0 space-y-1">
 <p className="text-xs text-general-muted-foreground">Access link</p>
 <TruncatedText text={url} className="text-sm font-mono" />
 <div className="flex flex-wrap items-center gap-3 text-xs text-general-muted-foreground">
 <span>{request.websiteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "No website"}</span>
 <span>Agency: {request.agencyEmail}</span>
 <Badge variant={statusConfig.variant} className={cn("text-[10px]", statusConfig.className)}>
 {statusConfig.label}
 </Badge>
 </div>
 </div>
 <div className="flex shrink-0 items-center gap-2">
 <Button type="button" variant="outline" onClick={onCopyLink}>
 <Copy className="mr-2 h-4 w-4" />
 Copy link
 </Button>
 <Dialog open={shareOpen} onOpenChange={setShareOpen}>
 <DialogTrigger asChild>
 <Button type="button" variant="outline">
 <Send className="mr-2 h-4 w-4" />
 Share
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-lg">
 <DialogHeader>
 <DialogTitle>Share access link</DialogTitle>
 <DialogDescription>
 Send this request to client contacts, developers, or previous agencies.
 </DialogDescription>
 </DialogHeader>
 <ShareAccessForm request={request} onShared={onShared} />
 <ShareStatusList shares={shares} />
 </DialogContent>
 </Dialog>
 </div>
 </div>

 <div className="mt-4 border-t border-general-border pt-3">
 <p className="flex items-center gap-2 text-sm text-general-muted-foreground">
 <Mail className="h-4 w-4" />
 {shares.length === 0
 ? "Not shared with anyone yet."
 : `Shared with ${shares.length} ${shares.length === 1 ? "person" : "people"}.`}
 </p>

 {shares.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-1.5">
 {shares.slice(0, 6).map((share) => {
 const meta = shareStatusMeta(share);
 return (
 <Badge key={share.id} variant="outline" className={cn("max-w-full truncate text-[10px]", meta.className)}>
 {share.email} · {meta.label}
 </Badge>
 );
 })}
 {shares.length > 6 && (
 <Badge variant="outline" className="text-[10px] text-general-muted-foreground">
 +{shares.length - 6} more
 </Badge>
 )}
 </div>
 )}
 </div>
 </div>
 );
}

function AccessRequestSummaryCards({ request }: { request: AccessRequest }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {(request.products || []).map((product) => {
        const grantedAssetNames = grantedAssetNamesForProduct(request, product);
        const isConnected = grantedAssetNames.length > 0;

        return (
          <div key={product} className="rounded-lg border border-general-border bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <ProductIcon product={product} size={22} />
              <span className="text-sm font-medium">
                {PRODUCT_CONFIG[product]?.shortLabel || product.toUpperCase()}
              </span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                isConnected
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              )}
            >
              {isConnected ? "Connected" : "Not connected"}
            </Badge>
            <div className="mt-3 border-t border-general-border pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-general-muted-foreground">
                Connected property
              </p>
              {grantedAssetNames.length > 0 ? (
                <div className="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
                  {grantedAssetNames.map((name) => (
                    <TruncatedText key={name} text={name} className="text-xs font-medium text-general-foreground" />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">None</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContributorMatrix({
  contributors,
  products,
  onSelect,
}: {
  contributors?: AccessContributor[];
  products: Product[];
  onSelect: (contributor: AccessContributor) => void;
}) {
  if (!contributors || contributors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-general-border p-6 text-center text-sm text-general-muted-foreground">
        No one has opened this link yet.
      </div>
    );
  }

  return (
    <Table className={cn("max-h-[420px] rounded-lg border border-general-border", VISIBLE_SCROLLBAR_CLASS)} style={VISIBLE_SCROLLBAR_STYLE}>
      <TableElement className="min-w-[860px]">
        <TableHeader className="sticky top-0 z-10">
          <TableRow>
            <TableHead className="w-[260px] px-3 py-2">Contact</TableHead>
            {products.map((product) => (
              <TableHead key={product} className="min-w-[150px] px-3 py-2">
                {PRODUCT_CONFIG[product]?.shortLabel || product.toUpperCase()}
              </TableHead>
            ))}
            <TableHead className="w-[56px] px-3 py-2 text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contributors.map((contributor) => {
            const checks = checkByProduct(contributor);
            const email = contributor.googleAccountEmail || contributor.email || "Unknown Google account";

            return (
              <TableRow
                key={contributor.id}
                className="group cursor-pointer hover:bg-gray-50"
                onClick={() => onSelect(contributor)}
              >
                <TableCell className="px-3 py-3 align-top">
                  <div className="min-w-0">
                    <TruncatedText
                      text={email}
                      className="text-sm font-medium text-general-primary underline-offset-4 group-hover:underline"
                    />
                    <TruncatedText
                      text={
                        contributor.lastSeenAt
                          ? `Last seen ${new Date(contributor.lastSeenAt).toLocaleDateString()}`
                          : contributor.name || "Opened link"
                      }
                      className="text-xs text-general-muted-foreground"
                    />
                  </div>
                </TableCell>
                {products.map((product) => {
                  const check = checks.get(product);

                  return (
                    <TableCell key={product} className="px-3 py-3 align-top">
                      <div className="min-w-0 space-y-1">
                        <AccessStatusBadge status={check?.status} />
                        {shouldShowMatchedResourceName(check) && (
                          <TruncatedText
                            text={check?.matchedResourceName}
                            className="max-w-[170px] text-xs text-general-muted-foreground"
                          />
                        )}
                      </div>
                    </TableCell>
                  );
                })}
                <TableCell className="px-3 py-3 text-right align-top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`View ${email} details`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(contributor);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </TableElement>
    </Table>
  );
}

function AssetRows({
  assets,
  grant,
  product,
}: {
  assets: Asset[];
  grant?: AccessGrant;
  product?: Product;
}) {
  return (
    <Table
      className={cn("max-h-[320px] rounded-md border border-general-border", VISIBLE_SCROLLBAR_CLASS)}
      style={VISIBLE_SCROLLBAR_STYLE}
    >
      <TableElement className="min-w-[560px]">
        <TableHeader className="sticky top-0 z-10">
          <TableRow>
            <TableHead className="w-[280px] px-3 py-2">Asset</TableHead>
            <TableHead className="w-[220px] px-3 py-2">Account / URL</TableHead>
            <TableHead className="w-[130px] px-3 py-2">Access level</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset, index) => (
            <TableRow key={`${assetKey(asset)}-${index}`}>
              <TableCell className="px-3 py-2 align-top font-medium">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <TruncatedText text={assetName(asset)} className="max-w-[170px]" />
                  <AccessStatusBadge status={assetStatus(asset, grant, product)} />
                </div>
              </TableCell>
              <TableCell className="px-3 py-2 align-top text-general-muted-foreground">
                <TruncatedText text={assetContext(asset)} className="max-w-[220px]" />
              </TableCell>
              <TableCell className="px-3 py-2 align-top text-general-muted-foreground">
                {assetAccessLevel(asset)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableElement>
    </Table>
  );
}

function AssetAccessTable({
  check,
  grants,
}: {
  check?: AccessCheck;
  grants?: AccessGrant[];
}) {
  if (!check) {
    return <p className="text-sm text-general-muted-foreground">This access has not been checked yet.</p>;
  }

  const { matchedAssets, otherAssets } = groupedAssets(check);
  const latestGrant = grants?.find((grant) => grant.systemType === check.systemType);

  if (matchedAssets.length + otherAssets.length === 0) {
    return <p className="text-sm text-general-muted-foreground">No matching access was found for this Google account.</p>;
  }

  return (
    <div className="space-y-4">
      {matchedAssets.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Verified Matches</p>
              <p className="text-xs text-general-muted-foreground">
                A matching GA4 property was found and is available to connect.
              </p>
            </div>
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-[10px] text-blue-700">
              {matchedAssets.length} matched
            </Badge>
          </div>
          <AssetRows assets={matchedAssets} grant={latestGrant} product={check.systemType} />
        </div>
      ) : (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          We could not match this website automatically. Review any selected item below.
        </div>
      )}

      {otherAssets.length > 0 && (
        <details className="group rounded-lg border border-general-border bg-white" open={matchedAssets.length === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium">
            Other assets in this account
            <span className="flex items-center gap-2 text-xs font-normal text-general-muted-foreground">
              {otherAssets.length} asset{otherAssets.length === 1 ? "" : "s"}
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>
          <div className="border-t border-general-border p-4">
            <AssetRows assets={otherAssets} grant={latestGrant} product={check.systemType} />
          </div>
        </details>
      )}
    </div>
  );
}

function ContributorDeepDive({
  contributor,
  products,
  onBack,
}: {
  contributor: AccessContributor;
  products: Product[];
  onBack: () => void;
}) {
  const [activeProduct, setActiveProduct] = useState<Product | null>(products[0] || null);
  const checks = checkByProduct(contributor);
  const activeCheck = activeProduct ? checks.get(activeProduct) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to overview
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="truncate text-lg font-semibold">
                {contributor.googleAccountEmail || contributor.email || "Unknown Google account"}
              </h3>
            </TooltipTrigger>
            <TooltipContent>
              {contributor.googleAccountEmail || contributor.email || "Unknown Google account"}
            </TooltipContent>
          </Tooltip>
          <p className="text-sm text-general-muted-foreground">
            Google sign-in {contributor.oauthCompletedAt ? "completed" : "not completed"}
            {contributor.oauthCompletedAt ? ` ${new Date(contributor.oauthCompletedAt).toLocaleString()}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {products.map((product) => (
          <Button
            key={product}
            type="button"
            size="sm"
            variant={activeProduct === product ? "default" : "outline"}
            onClick={() => setActiveProduct(product)}
          >
            <ProductIcon product={product} size={16} />
            <span className="ml-1">{PRODUCT_CONFIG[product]?.shortLabel || product.toUpperCase()}</span>
          </Button>
        ))}
      </div>

      {activeProduct && (
        <div className="rounded-lg border border-general-border bg-white p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold">{PRODUCT_CONFIG[activeProduct]?.label}</h4>
              <p className="text-sm text-general-muted-foreground">
                {activeCheck?.message || "No access check yet."}
              </p>
            </div>
            <AccessStatusBadge status={activeCheck?.status} />
          </div>
          <AssetAccessTable check={activeCheck} grants={contributor.grants} />
        </div>
      )}
    </div>
  );
}

export function AccessRequestDetail({ request, onClose }: AccessRequestDetailProps) {
  const {
    data: detail,
    isError: isDetailError,
    isFetching: isDetailFetching,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useAccessRequestDetail(request?.id ?? null);
  const displayData = detail;
  const isInitialDetailLoading = Boolean(request?.id && !detail && (isDetailLoading || isDetailFetching));
  const [selectedContributorId, setSelectedContributorId] = useState<string | null>(null);
  const selectedContributor = useMemo(
    () => displayData?.contributors?.find((contributor) => contributor.id === selectedContributorId) || null,
    [displayData?.contributors, selectedContributorId]
  );

  function copyLink() {
    if (!displayData) return;
    const url = displayData.requestUrl || `${window.location.origin}/google-access/r/${displayData.token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  const statusConfig = displayData ? STATUS_CONFIG[displayData.status] || STATUS_CONFIG.pending : STATUS_CONFIG.pending;

  return (
    <Sheet open={!!request} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className={cn("w-full overflow-y-auto p-0 sm:max-w-5xl", VISIBLE_SCROLLBAR_CLASS)} style={VISIBLE_SCROLLBAR_STYLE}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-general-border bg-white px-6 py-5">
          <SheetHeader>
            <SheetTitle>Google Account Access Status</SheetTitle>
            <SheetDescription>
              Track link activity, connected accounts, and pending permissions requiring review.
            </SheetDescription>
          </SheetHeader>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mt-0.5 h-9 w-9 shrink-0"
            aria-label="Refresh access request details"
            disabled={!request?.id || isDetailFetching}
            onClick={() => refetchDetail()}
          >
            <RefreshCw className={cn("h-4 w-4", isDetailFetching && "animate-spin")} />
          </Button>
        </div>

        {isInitialDetailLoading && (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-general-primary" />
            <div>
              <p className="text-sm font-medium">Loading Google access status</p>
              <p className="text-sm text-general-muted-foreground">Checking who opened the link and what access was found.</p>
            </div>
          </div>
        )}

        {!isInitialDetailLoading && isDetailError && !displayData && (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <AlertTriangle className="h-7 w-7 text-red-600" />
            <div>
              <p className="text-sm font-medium">Unable to load access details</p>
              <p className="text-sm text-general-muted-foreground">Try refreshing this panel.</p>
            </div>
            <Button variant="outline" onClick={() => refetchDetail()}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isDetailFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        )}

        {!isInitialDetailLoading && displayData && (
          <div className="space-y-6 px-6 py-5">
            <AccessLinkCard
              request={displayData}
              statusConfig={statusConfig}
              onCopyLink={copyLink}
              onShared={() => refetchDetail()}
            />

 {selectedContributor ? (
              <ContributorDeepDive
                contributor={selectedContributor}
                products={displayData.products || []}
                onBack={() => setSelectedContributorId(null)}
              />
            ) : (
              <>
                <AccessRequestSummaryCards request={displayData} />
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold">Link Activity</h4>
                    <p className="text-sm text-general-muted-foreground">
                      Select a contact to view their requested Google account permissions.
                    </p>
                  </div>
                  <ContributorMatrix
                    contributors={displayData.contributors}
                    products={displayData.products || []}
                    onSelect={(contributor) => setSelectedContributorId(contributor.id)}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
