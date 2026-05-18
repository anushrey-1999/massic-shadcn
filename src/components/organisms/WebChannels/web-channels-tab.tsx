"use client";

import React from "react";
import { ChevronDown, Download, ExternalLink, HelpCircle, Link2, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Typography } from "@/components/ui/typography";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useDisconnectWordpress,
  useStartWordpressOauthLink,
  useWordpressConnection,
} from "@/hooks/use-wordpress-connector";
import {
  useConfigureWebflow,
  useDisconnectWebflow,
  useStartWebflowOauth,
  useWebflowCollections,
  useWebflowConnection,
  useWebflowSites,
  type WebflowCollection,
  type WebflowCollectionField,
} from "@/hooks/use-webflow-connector";
import { PlatformIcon, SiteFavicon } from "./platform-icon";
import { IntegrationStatusBadge } from "./integration-status-badge";
import { WebflowPublishSetup, type WebflowMappingRow } from "./webflow-publish-setup";

interface WebChannelsTabProps {
  businessId: string;
  defaultSiteUrl?: string | null;
  isActive?: boolean;
  showHeader?: boolean;
}

const EMPTY_WEBFLOW_FIELDS: WebflowCollectionField[] = [];
const WORDPRESS_PLUGIN_ZIP_PATH = "/downloads/massic-wp-connector-1.0.0.zip";

function normalizeSiteUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getSiteHostLabel(siteUrl?: string | null) {
  if (!siteUrl) return "";
  try {
    return new URL(normalizeSiteUrlInput(siteUrl)).host;
  } catch {
    return siteUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }
}

function getWebflowId(value?: { id?: string; _id?: string } | null) {
  return value?.id || value?._id || "";
}

function getWebflowFieldKey(field?: WebflowCollectionField | null) {
  return getWebflowFieldSlug(field) || getWebflowId(field);
}

function getWebflowFieldSlug(field?: WebflowCollectionField | null) {
  return field?.slug || field?.name || field?.id || field?._id || "";
}

function getWebflowFieldLabel(field?: WebflowCollectionField | null) {
  return field?.displayName || field?.name || field?.slug || field?.id || field?._id || "Field";
}

function getWebflowFieldType(field?: WebflowCollectionField | null) {
  return String(field?.type || field?.fieldType || "").toLowerCase();
}

function isWebflowRequiredField(field?: WebflowCollectionField | null) {
  return Boolean(field?.isRequired || field?.required);
}

function isWebflowRichTextField(field?: WebflowCollectionField | null) {
  return getWebflowFieldType(field).includes("rich");
}

function isWebflowImageField(field?: WebflowCollectionField | null) {
  return getWebflowFieldType(field).includes("image");
}

function makeWebflowMappingRow(partial: Partial<WebflowMappingRow>): WebflowMappingRow {
  return {
    id: partial.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    massicField: partial.massicField || "",
    webflowFieldKey: partial.webflowFieldKey || "",
    staticValue: partial.staticValue || "",
  };
}

function ComingSoonIntegration({ name }: { name: "shopify" }) {
  const label = name === "shopify" ? "Shopify" : name;
  return (
    <Card variant="profileCard" className="border-none bg-white p-4 opacity-70">
      <div className="flex items-center gap-4">
        <PlatformIcon platform={name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Typography variant="small" className="font-medium text-general-foreground">
              {label}
            </Typography>
            <Badge variant="outline" className="font-normal text-general-muted-foreground">
              Coming soon
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-general-muted-foreground">
            {label} publishing will be available in a future update.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function WebChannelsTab({
  businessId,
  defaultSiteUrl,
  isActive = true,
  showHeader = true,
}: WebChannelsTabProps) {
  const [isRecommendedModalOpen, setIsRecommendedModalOpen] = React.useState(false);
  const [isHowToModalOpen, setIsHowToModalOpen] = React.useState(false);
  const [recommendedSiteUrl, setRecommendedSiteUrl] = React.useState(defaultSiteUrl || "");
  const [selectedWebflowSiteId, setSelectedWebflowSiteId] = React.useState("");
  const [selectedWebflowCollectionId, setSelectedWebflowCollectionId] = React.useState("");
  const [webflowMappings, setWebflowMappings] = React.useState<WebflowMappingRow[]>([]);
  const [isWebflowConfigOpen, setIsWebflowConfigOpen] = React.useState(false);
  const webflowMappingInitKeyRef = React.useRef("");

  const { data, isLoading, refetch } = useWordpressConnection(businessId);
  const prevActiveRef = React.useRef(false);
  React.useEffect(() => {
    const becameActive = isActive && !prevActiveRef.current;
    prevActiveRef.current = isActive;
    if (becameActive) refetch();
  }, [isActive, refetch]);

  React.useEffect(() => {
    if (!isActive) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isActive, refetch]);

  const disconnectMutation = useDisconnectWordpress(businessId);
  const oauthStartLinkMutation = useStartWordpressOauthLink();
  const webflowConnectionQuery = useWebflowConnection(businessId);
  const webflowConnection = webflowConnectionQuery.data?.connection || null;
  const isWebflowConnected = Boolean(webflowConnectionQuery.data?.connected && webflowConnection);
  const webflowTarget = webflowConnection?.target || null;
  const startWebflowOauthMutation = useStartWebflowOauth();
  const disconnectWebflowMutation = useDisconnectWebflow(businessId);
  const configureWebflowMutation = useConfigureWebflow(businessId);
  const webflowSitesQuery = useWebflowSites(webflowConnection?.connectionId || null);
  const webflowSites = webflowSitesQuery.data || [];
  const effectiveWebflowSiteId = selectedWebflowSiteId || webflowTarget?.siteId || "";
  const webflowCollectionsQuery = useWebflowCollections(
    webflowConnection?.connectionId || null,
    effectiveWebflowSiteId || null
  );
  const webflowCollections = webflowCollectionsQuery.data || [];

  const connected = Boolean(data?.connected && data?.connection);
  const connection = data?.connection || null;
  const connectedSiteHost = React.useMemo(() => getSiteHostLabel(connection?.siteUrl), [connection?.siteUrl]);
  const selectedWebflowCollection = React.useMemo<WebflowCollection | null>(
    () => webflowCollections.find(collection => getWebflowId(collection) === selectedWebflowCollectionId) || null,
    [selectedWebflowCollectionId, webflowCollections]
  );
  const selectedWebflowFields = selectedWebflowCollection?.fields || EMPTY_WEBFLOW_FIELDS;
  const selectedWebflowBodyField = React.useMemo(
    () => selectedWebflowFields.find(isWebflowRichTextField) || null,
    [selectedWebflowFields]
  );
  const selectedWebflowImageField = React.useMemo(
    () => selectedWebflowFields.find(isWebflowImageField) || null,
    [selectedWebflowFields]
  );
  const requiredWebflowStaticFields = React.useMemo(
    () =>
      selectedWebflowFields.filter(field => {
        const slug = getWebflowFieldSlug(field);
        if (!isWebflowRequiredField(field)) return false;
        if (slug === "name" || slug === "slug") return false;
        if (selectedWebflowBodyField && getWebflowId(field) === getWebflowId(selectedWebflowBodyField)) return false;
        if (selectedWebflowImageField && getWebflowId(field) === getWebflowId(selectedWebflowImageField)) return false;
        return true;
      }),
    [selectedWebflowBodyField, selectedWebflowFields, selectedWebflowImageField]
  );
  const webflowFieldByKey = React.useMemo(() => {
    const map = new Map<string, WebflowCollectionField>();
    selectedWebflowFields.forEach(field => {
      const slug = getWebflowFieldSlug(field);
      const id = getWebflowId(field);
      if (slug) map.set(slug, field);
      if (id) map.set(id, field);
    });
    return map;
  }, [selectedWebflowFields]);
  const hasBodyMapping = React.useMemo(
    () => webflowMappings.some(row => row.massicField === "bodyHtml" && Boolean(row.webflowFieldKey)),
    [webflowMappings]
  );
  const missingStaticMappings = React.useMemo(
    () =>
      webflowMappings.filter(row => row.massicField === "__static" && row.webflowFieldKey && !row.staticValue.trim()),
    [webflowMappings]
  );

  const selectedWebflowSiteName = React.useMemo(() => {
    const site = webflowSites.find(s => getWebflowId(s) === effectiveWebflowSiteId);
    return site?.displayName || site?.name || site?.shortName || null;
  }, [effectiveWebflowSiteId, webflowSites]);

  const selectedWebflowCollectionName = React.useMemo(
    () => selectedWebflowCollection?.displayName || selectedWebflowCollection?.name || webflowTarget?.name || null,
    [selectedWebflowCollection, webflowTarget?.name]
  );

  React.useEffect(() => {
    if (!recommendedSiteUrl && defaultSiteUrl) setRecommendedSiteUrl(defaultSiteUrl);
  }, [defaultSiteUrl, recommendedSiteUrl]);

  React.useEffect(() => {
    if (webflowTarget?.siteId && !selectedWebflowSiteId) setSelectedWebflowSiteId(webflowTarget.siteId);
    if (webflowTarget?.collectionId && !selectedWebflowCollectionId) {
      setSelectedWebflowCollectionId(webflowTarget.collectionId);
    }
  }, [selectedWebflowCollectionId, selectedWebflowSiteId, webflowTarget?.collectionId, webflowTarget?.siteId]);

  React.useEffect(() => {
    if (!selectedWebflowCollection) {
      if (webflowMappingInitKeyRef.current !== "none") {
        webflowMappingInitKeyRef.current = "none";
        setWebflowMappings([]);
      }
      return;
    }

    const fieldSignature = selectedWebflowFields
      .map(
        field =>
          `${getWebflowFieldKey(field)}:${getWebflowFieldType(field)}:${isWebflowRequiredField(field) ? "required" : "optional"}`
      )
      .join("|");
    const savedSignature = JSON.stringify(webflowTarget?.fieldMapping?.fields || []);
    const initKey = [
      selectedWebflowCollectionId,
      fieldSignature,
      webflowTarget?.collectionId === selectedWebflowCollectionId ? savedSignature : "",
    ].join("::");

    if (webflowMappingInitKeyRef.current === initKey) return;
    webflowMappingInitKeyRef.current = initKey;

    const savedFields =
      webflowTarget?.collectionId === selectedWebflowCollectionId ? webflowTarget?.fieldMapping?.fields || [] : [];

    if (savedFields.length > 0) {
      setWebflowMappings(
        savedFields.map((field, index) =>
          makeWebflowMappingRow({
            id: `saved-${index}`,
            massicField: field.massicField || "__static",
            webflowFieldKey: field.webflowFieldSlug || field.webflowFieldId || "",
            staticValue: field.staticValue || "",
          })
        )
      );
      return;
    }

    const rows = [
      makeWebflowMappingRow({ id: "title", massicField: "title", webflowFieldKey: "name" }),
      makeWebflowMappingRow({ id: "slug", massicField: "slug", webflowFieldKey: "slug" }),
    ];
    if (selectedWebflowBodyField) {
      rows.push(
        makeWebflowMappingRow({
          id: "bodyHtml",
          massicField: "bodyHtml",
          webflowFieldKey: getWebflowFieldKey(selectedWebflowBodyField),
        })
      );
    }
    if (selectedWebflowImageField) {
      rows.push(
        makeWebflowMappingRow({
          id: "featuredImage",
          massicField: "featuredImage",
          webflowFieldKey: getWebflowFieldKey(selectedWebflowImageField),
        })
      );
    }
    requiredWebflowStaticFields.forEach(field => {
      rows.push(
        makeWebflowMappingRow({
          id: `static-${getWebflowFieldKey(field)}`,
          massicField: "__static",
          webflowFieldKey: getWebflowFieldKey(field),
        })
      );
    });
    setWebflowMappings(rows);
  }, [
    requiredWebflowStaticFields,
    selectedWebflowBodyField,
    selectedWebflowCollection,
    selectedWebflowCollectionId,
    selectedWebflowFields,
    selectedWebflowImageField,
    webflowTarget?.collectionId,
    webflowTarget?.fieldMapping?.fields,
  ]);

  React.useEffect(() => {
    const onWebflowOauthMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || payload.source !== "massic-webflow-oauth") return;
      if (payload.ok) {
        toast.success("Webflow connected");
        void webflowConnectionQuery.refetch();
        void refetch();
        return;
      }
      toast.error("Webflow connection failed", {
        description: payload.message || "Please try again.",
      });
    };
    window.addEventListener("message", onWebflowOauthMessage);
    return () => window.removeEventListener("message", onWebflowOauthMessage);
  }, [refetch, webflowConnectionQuery]);

  const submitRecommended = async () => {
    const siteUrl = normalizeSiteUrlInput(recommendedSiteUrl);
    if (!siteUrl) return;
    setIsRecommendedModalOpen(false);
    const response = await oauthStartLinkMutation.mutateAsync({ businessId, siteUrl });
    const connectUrl = response?.data?.connectUrl;
    if (!connectUrl) return;
    const popup = window.open(connectUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      toast.error("Popup blocked", { description: "Allow popups for this site and try again." });
      return;
    }
    toast.success("WordPress admin opened", {
      description: "Click Connect to Massic in your plugin page.",
    });
  };

  const submitDisconnect = async () => {
    if (!connection?.connectionId) return;
    await disconnectMutation.mutateAsync({ connectionId: connection.connectionId });
  };

  const submitWebflowConnect = async () => {
    const returnUrl = `${window.location.origin}/business/${businessId}/web?integrations=1`;
    const response = await startWebflowOauthMutation.mutateAsync({ businessId, returnUrl });
    const authorizationUrl = response?.data?.authorizationUrl;
    if (!authorizationUrl) return;
    const popup = window.open(authorizationUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      toast.error("Popup blocked", { description: "Allow popups for this site and try again." });
    }
  };

  const submitWebflowConfiguration = async () => {
    if (
      !webflowConnection?.connectionId ||
      !selectedWebflowSiteId ||
      !selectedWebflowCollectionId ||
      !selectedWebflowCollection
    ) {
      return;
    }
    const fields = webflowMappings
      .filter(row => row.webflowFieldKey)
      .map(row => {
        const field = webflowFieldByKey.get(row.webflowFieldKey);
        return {
          ...(row.massicField && row.massicField !== "__static" ? { massicField: row.massicField } : {}),
          webflowFieldId: getWebflowId(field) || row.webflowFieldKey,
          webflowFieldSlug: getWebflowFieldSlug(field) || row.webflowFieldKey,
          ...(row.massicField === "__static" ? { staticValue: row.staticValue } : {}),
          type: getWebflowFieldType(field),
        };
      });
    await configureWebflowMutation.mutateAsync({
      connectionId: webflowConnection.connectionId,
      siteId: selectedWebflowSiteId,
      collectionId: selectedWebflowCollectionId,
      collectionName: selectedWebflowCollection.displayName || selectedWebflowCollection.name,
      fieldMapping: { fields },
    });
  };

  const handleOpenWordpressAdmin = () => {
    if (!connection?.siteUrl) return;
    try {
      const parsed = new URL(normalizeSiteUrlInput(connection.siteUrl));
      const basePath = parsed.pathname.replace(/\/+$/, "");
      const adminUrl = `${parsed.origin}${basePath}/wp-admin`;
      const popup = window.open(adminUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        toast.error("Popup blocked", {
          description: "Allow popups or open wp-admin manually.",
        });
      }
    } catch {
      toast.error("Invalid WordPress site URL");
    }
  };

  const canSaveWebflowConfig =
    Boolean(webflowConnection?.connectionId && selectedWebflowSiteId && selectedWebflowCollectionId && hasBodyMapping) &&
    missingStaticMappings.length === 0 &&
    !configureWebflowMutation.isPending;

  const needsWebflowSetup = isWebflowConnected && !webflowTarget?.collectionId;

  React.useEffect(() => {
    if (needsWebflowSetup) {
      setIsWebflowConfigOpen(true);
    }
  }, [needsWebflowSetup]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto">
      {showHeader && (
        <header className="space-y-1">
          <Typography variant="h4">Integrations</Typography>
          <p className="text-sm text-general-muted-foreground">
            Connect your sites to publish content from Massic.
          </p>
        </header>
      )}

      <div className="space-y-3">
        {/* WordPress */}
        <Card variant="profileCard" className="border-none bg-white p-4">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-0 pb-0">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <PlatformIcon platform="wordpress" />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base font-medium">WordPress</CardTitle>
                  <IntegrationStatusBadge connected={connected} loading={isLoading} />
                </div>
                <CardDescription>
                  Publish blog drafts and pages to your WordPress site.
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {connected ? (
                <>
                  <Button size="sm" variant="outline" onClick={handleOpenWordpressAdmin}>
                    <ExternalLink className="mr-1.5 size-4" />
                    WP Admin
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="size-9">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsHowToModalOpen(true)}>Setup guide</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={submitDisconnect}
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-general-muted-foreground"
                    onClick={() => setIsHowToModalOpen(true)}
                  >
                    <HelpCircle className="mr-1.5 size-4" />
                    Guide
                  </Button>
                  <Button size="sm" onClick={() => setIsRecommendedModalOpen(true)}>
                    <Link2 className="mr-1.5 size-4" />
                    Connect
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          {connected && connection && (
            <CardContent className="mt-4 border-t border-general-border p-0 pt-4">
              <div className="flex items-center gap-3 rounded-lg border border-general-border bg-general-primary-foreground/50 px-3 py-2.5">
                <SiteFavicon siteUrl={connection.siteUrl} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-general-foreground">
                    {connectedSiteHost || "Connected site"}
                  </p>
                  <p className="truncate font-mono text-xs text-general-muted-foreground">{connection.siteUrl}</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Webflow */}
        <Card variant="profileCard" className="border-none bg-white p-4">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-0 pb-0">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <PlatformIcon platform="webflow" />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base font-medium">Webflow</CardTitle>
                  <IntegrationStatusBadge
                    connected={isWebflowConnected}
                    loading={webflowConnectionQuery.isLoading}
                  />
                </div>
                <CardDescription>
                  Publish blog drafts to a Webflow CMS collection.
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isWebflowConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    webflowConnection?.connectionId &&
                    disconnectWebflowMutation.mutate({ connectionId: webflowConnection.connectionId })
                  }
                  disabled={disconnectWebflowMutation.isPending}
                >
                  {disconnectWebflowMutation.isPending ? "Disconnecting…" : "Disconnect"}
                </Button>
              ) : (
                <Button size="sm" onClick={submitWebflowConnect} disabled={startWebflowOauthMutation.isPending}>
                  <Link2 className="mr-1.5 size-4" />
                  {startWebflowOauthMutation.isPending ? "Opening…" : "Connect"}
                </Button>
              )}
            </div>
          </CardHeader>

          {isWebflowConnected && (
            <Collapsible
              open={isWebflowConfigOpen}
              onOpenChange={setIsWebflowConfigOpen}
              className="mt-3 border-t border-general-border"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left",
                    "rounded-md transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  )}
                >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-general-foreground">
                        {needsWebflowSetup ? "Complete publishing setup" : "Publishing settings"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-general-muted-foreground">
                        {needsWebflowSetup
                          ? "Choose site, collection, and field mapping"
                          : webflowTarget?.collectionId
                            ? [selectedWebflowCollectionName || webflowTarget.name, selectedWebflowSiteName]
                                .filter(Boolean)
                                .join(" · ")
                            : "Site, CMS collection, and field mapping"}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-general-muted-foreground transition-transform duration-200",
                        isWebflowConfigOpen && "rotate-180"
                      )}
                    />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden">
                <div className="pb-1 pt-2">
                  <WebflowPublishSetup
                    sites={webflowSites}
                    collections={webflowCollections}
                    sitesLoading={webflowSitesQuery.isLoading}
                    collectionsLoading={webflowCollectionsQuery.isLoading}
                    selectedSiteId={selectedWebflowSiteId || webflowTarget?.siteId || ""}
                    selectedCollectionId={selectedWebflowCollectionId || webflowTarget?.collectionId || ""}
                    onSiteChange={siteId => {
                      setSelectedWebflowSiteId(siteId);
                      setSelectedWebflowCollectionId("");
                    }}
                    onCollectionChange={setSelectedWebflowCollectionId}
                    selectedCollection={selectedWebflowCollection}
                    mappings={webflowMappings}
                    onMappingsChange={setWebflowMappings}
                    hasBodyMapping={hasBodyMapping}
                    missingStaticCount={missingStaticMappings.length}
                    canSave={canSaveWebflowConfig}
                    isSaving={configureWebflowMutation.isPending}
                    hasSavedTarget={Boolean(webflowTarget?.collectionId)}
                    onSave={submitWebflowConfiguration}
                    getWebflowId={getWebflowId}
                    getWebflowFieldKey={getWebflowFieldKey}
                    getWebflowFieldLabel={getWebflowFieldLabel}
                    getWebflowFieldType={getWebflowFieldType}
                    isWebflowRequiredField={isWebflowRequiredField}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </Card>

        <ComingSoonIntegration name="shopify" />
      </div>

      <Dialog open={isRecommendedModalOpen} onOpenChange={setIsRecommendedModalOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={!oauthStartLinkMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Connect WordPress</DialogTitle>
            <DialogDescription>
              Enter your site URL. We&apos;ll open your WordPress admin where you can approve the connection.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="wp-recommended-site-url">Site URL</Label>
              <Input
                id="wp-recommended-site-url"
                placeholder="https://yoursite.com"
                value={recommendedSiteUrl}
                onChange={e => setRecommendedSiteUrl(e.target.value)}
                disabled={oauthStartLinkMutation.isPending}
              />
            </div>
            <p className="rounded-lg border border-general-border bg-muted/30 px-3 py-2.5 text-xs text-general-muted-foreground">
              In WordPress, open <strong className="text-general-foreground">Settings → Massic Connector</strong> and
              click <strong className="text-general-foreground">Connect to Massic</strong>.
            </p>
            <Button
              variant="link"
              className="h-auto justify-start px-0 text-xs"
              onClick={() => {
                setIsRecommendedModalOpen(false);
                setIsHowToModalOpen(true);
              }}
            >
              Need the plugin? View setup guide
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecommendedModalOpen(false)} disabled={oauthStartLinkMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submitRecommended} disabled={!recommendedSiteUrl.trim() || oauthStartLinkMutation.isPending}>
              {oauthStartLinkMutation.isPending ? "Opening…" : "Open WordPress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHowToModalOpen} onOpenChange={setIsHowToModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>WordPress setup</DialogTitle>
            <DialogDescription>Install the connector plugin and link your site in a few steps.</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2.5 py-1 pl-5 text-sm text-general-foreground">
            <li>Download and install the Massic connector plugin.</li>
            <li>In WP admin: <strong>Plugins → Add New → Upload</strong>, then activate.</li>
            <li>Open <strong>Settings → Massic Connector</strong>.</li>
            <li>Here, click <strong>Connect</strong>, enter your site URL, and approve in WordPress.</li>
          </ol>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsHowToModalOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <a href={WORDPRESS_PLUGIN_ZIP_PATH} download>
                <Download className="mr-1.5 size-4" />
                Download plugin
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
