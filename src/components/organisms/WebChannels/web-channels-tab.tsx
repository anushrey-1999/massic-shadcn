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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useDisconnectWordpress,
  useStartWordpressOauthLink,
  useWordpressConnection,
} from "@/hooks/use-wordpress-connector";
import {
  useConfigureWebflow,
  useConfigureWebflowPages,
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
import {
  WebflowPublishSetup,
  type WebflowImageDestinationRow,
  type WebflowMappingRow,
} from "./webflow-publish-setup";

interface WebChannelsTabProps {
  businessId: string;
  defaultSiteUrl?: string | null;
  isActive?: boolean;
  showHeader?: boolean;
}

const EMPTY_WEBFLOW_FIELDS: WebflowCollectionField[] = [];
const WORDPRESS_PLUGIN_QA_ZIP_PATH = "/downloads/massic-integration-qa-1.0.0.zip";
const WORDPRESS_PLUGIN_DIRECTORY_URL = "https://wordpress.org/plugins/massic-integration/";

function getWordpressPluginBuildEnv(): "qa" | "prod" {
  const envLabel = [
    process.env.NEXT_PUBLIC_APP_ENV,
    process.env.NEXT_PUBLIC_ENV,
    process.env.NEXT_PUBLIC_DEPLOY_ENV,
    process.env.NEXT_PUBLIC_NODE_API_URL,
    process.env.NODE_ENV,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(qa|dev|development|staging|seedinternaldev|localhost)/.test(envLabel)) {
    return "qa";
  }

  return "prod";
}

const WORDPRESS_PLUGIN_BUILD_ENV = getWordpressPluginBuildEnv();
const IS_WORDPRESS_QA_PLUGIN_BUILD = WORDPRESS_PLUGIN_BUILD_ENV === "qa";

function normalizeSiteUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function buildWordpressPluginInstallUrl(siteUrl: string) {
  try {
    const parsed = new URL(normalizeSiteUrlInput(siteUrl));
    const basePath = parsed.pathname.replace(/\/+$/, "");
    const installUrl = new URL(`${basePath}/wp-admin/plugin-install.php`, parsed.origin);
    installUrl.searchParams.set("tab", "search");
    installUrl.searchParams.set("type", "term");
    installUrl.searchParams.set("s", "massic-integration");
    installUrl.searchParams.set("massic_from", "massic_app");
    return installUrl.toString();
  } catch {
    return "";
  }
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
  const slug = field?.slug || field?.apiName || "";
  if (slug) return slug;
  const name = field?.name || "";
  if (/^(name|slug)$/i.test(name)) return name.toLowerCase();
  return name || field?.id || field?._id || "";
}

function getWebflowFieldLabel(field?: WebflowCollectionField | null) {
  const rawLabel = field?.displayName || field?.name || field?.slug || field?.apiName || field?.id || field?._id || "Field";
  const label = String(rawLabel).trim();
  if (label.length > 1 && label.length % 2 === 0) {
    const midpoint = label.length / 2;
    const first = label.slice(0, midpoint);
    const second = label.slice(midpoint);
    if (first.toLowerCase() === second.toLowerCase()) return first;
  }
  return label;
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

function matchesWebflowFieldName(field: WebflowCollectionField | null | undefined, patterns: RegExp[]) {
  const label = [
    field?.displayName,
    field?.name,
    field?.slug,
    field?.id,
    field?._id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return patterns.some(pattern => pattern.test(label));
}

function findLikelyWebflowTextField(fields: WebflowCollectionField[], patterns: RegExp[]) {
  return fields.find(field => {
    const type = getWebflowFieldType(field);
    if (type.includes("image") || type.includes("rich")) return false;
    return matchesWebflowFieldName(field, patterns);
  }) || null;
}

function makeWebflowMappingRow(partial: Partial<WebflowMappingRow>): WebflowMappingRow {
  return {
    id: partial.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    massicField: partial.massicField || "",
    webflowFieldKey: partial.webflowFieldKey || "",
    staticValue: partial.staticValue || "",
  };
}

type ExternalNavigationFallback = {
  url: string;
  title: string;
  description: string;
};

function openPendingExternalTab() {
  const externalWindow = window.open("about:blank", "_blank");
  if (!externalWindow) return null;

  try {
    externalWindow.opener = null;
    externalWindow.document.title = "Opening...";
    externalWindow.document.body.innerHTML =
      '<p style="font-family: system-ui, sans-serif; padding: 24px;">Opening secure connection...</p>';
  } catch {
    // Some browsers restrict access even for newly opened contexts.
  }

  return externalWindow;
}

function navigatePendingExternalTab(externalWindow: Window | null, url: string) {
  if (!externalWindow || externalWindow.closed) return false;

  try {
    externalWindow.location.replace(url);
    externalWindow.focus();
    return true;
  } catch {
    return false;
  }
}

export function WebChannelsTab({
  businessId,
  defaultSiteUrl,
  isActive = true,
  showHeader = true,
}: WebChannelsTabProps) {
  const [isRecommendedModalOpen, setIsRecommendedModalOpen] = React.useState(false);
  const [isHowToModalOpen, setIsHowToModalOpen] = React.useState(false);
  const [externalNavigationFallback, setExternalNavigationFallback] =
    React.useState<ExternalNavigationFallback | null>(null);
  const [recommendedSiteUrl, setRecommendedSiteUrl] = React.useState(defaultSiteUrl || "");
  const [selectedWebflowSiteId, setSelectedWebflowSiteId] = React.useState("");
  const [selectedWebflowPageSiteId, setSelectedWebflowPageSiteId] = React.useState("");
  const [selectedWebflowCollectionId, setSelectedWebflowCollectionId] = React.useState("");
  const [webflowMappings, setWebflowMappings] = React.useState<WebflowMappingRow[]>([]);
  const [webflowImageDestinations, setWebflowImageDestinations] = React.useState<WebflowImageDestinationRow[]>([]);
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
  const webflowPageTarget = webflowConnection?.targets?.page || null;
  const startWebflowOauthMutation = useStartWebflowOauth();
  const disconnectWebflowMutation = useDisconnectWebflow(businessId);
  const configureWebflowMutation = useConfigureWebflow(businessId);
  const configureWebflowPagesMutation = useConfigureWebflowPages(businessId);
  const webflowSitesQuery = useWebflowSites(webflowConnection?.connectionId || null);
  const webflowSites = webflowSitesQuery.data || [];
  const effectiveWebflowSiteId = selectedWebflowSiteId || webflowTarget?.siteId || "";
  const effectiveWebflowPageSiteId = selectedWebflowPageSiteId || webflowPageTarget?.siteId || "";
  const webflowCollectionsQuery = useWebflowCollections(
    webflowConnection?.connectionId || null,
    effectiveWebflowSiteId || null
  );
  const webflowCollections = webflowCollectionsQuery.data || [];

  const connected = Boolean(data?.connected && data?.connection); const connection = data?.connection || null; const connectedSiteHost = React.useMemo(() => getSiteHostLabel(connection?.siteUrl), [connection?.siteUrl]); const wordpressAdminUrl = React.useMemo(() => { if (!connection?.siteUrl) return ""; try { const parsed = new URL(normalizeSiteUrlInput(connection.siteUrl)); const basePath = parsed.pathname.replace(/\/+$/, ""); return `${parsed.origin}${basePath}/wp-admin/options-general.php?page=massic-integration`; } catch { return ""; } }, [connection?.siteUrl]);
  const selectedWebflowCollection = React.useMemo<WebflowCollection | null>(
    () => webflowCollections.find(collection => getWebflowId(collection) === selectedWebflowCollectionId) || null,
    [selectedWebflowCollectionId, webflowCollections]
  );
  const selectedWebflowFields = selectedWebflowCollection?.fields || EMPTY_WEBFLOW_FIELDS;
  const selectedWebflowBodyField = React.useMemo(
    () => selectedWebflowFields.find(isWebflowRichTextField) || null,
    [selectedWebflowFields]
  );
  const selectedWebflowImageFields = React.useMemo(
    () => selectedWebflowFields.filter(isWebflowImageField),
    [selectedWebflowFields]
  );
  const selectedWebflowMetaTitleField = React.useMemo(
    () =>
      findLikelyWebflowTextField(selectedWebflowFields, [
        /(^|\b)(seo|meta)[\s_-]*title(\b|$)/i,
        /(^|\b)title[\s_-]*(tag|seo|meta)(\b|$)/i,
      ]),
    [selectedWebflowFields]
  );
  const selectedWebflowMetaDescriptionField = React.useMemo(
    () =>
      findLikelyWebflowTextField(selectedWebflowFields, [
        /(^|\b)(seo|meta)[\s_-]*(description|desc)(\b|$)/i,
        /(^|\b)(description|desc)[\s_-]*(tag|seo|meta)(\b|$)/i,
      ]),
    [selectedWebflowFields]
  );
  const requiredWebflowStaticFields = React.useMemo(
    () =>
      selectedWebflowFields.filter(field => {
        const slug = getWebflowFieldSlug(field);
        if (!isWebflowRequiredField(field)) return false;
        if (slug === "name" || slug === "slug") return false;
        if (selectedWebflowBodyField && getWebflowId(field) === getWebflowId(selectedWebflowBodyField)) return false;
        if (selectedWebflowMetaTitleField && getWebflowId(field) === getWebflowId(selectedWebflowMetaTitleField)) return false;
        if (selectedWebflowMetaDescriptionField && getWebflowId(field) === getWebflowId(selectedWebflowMetaDescriptionField)) return false;
        if (isWebflowImageField(field)) return false;
        return true;
      }),
    [selectedWebflowBodyField, selectedWebflowFields, selectedWebflowMetaDescriptionField, selectedWebflowMetaTitleField]
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
  const missingRequiredImageMappings = React.useMemo(
    () =>
      selectedWebflowImageFields.filter(field => {
        if (!isWebflowRequiredField(field)) return false;
        const key = getWebflowFieldKey(field);
        return !webflowImageDestinations.some(row => row.webflowFieldKey === key && row.enabled);
      }),
    [selectedWebflowImageFields, webflowImageDestinations]
  );

  const selectedWebflowSiteName = React.useMemo(() => {
    const site = webflowSites.find(s => getWebflowId(s) === effectiveWebflowSiteId);
    return site?.displayName || site?.name || site?.shortName || null;
  }, [effectiveWebflowSiteId, webflowSites]);

  const selectedWebflowPageSiteName = React.useMemo(() => {
    const site = webflowSites.find(s => getWebflowId(s) === effectiveWebflowPageSiteId);
    return site?.displayName || site?.name || site?.shortName || null;
  }, [effectiveWebflowPageSiteId, webflowSites]);

  const selectedWebflowCollectionName = React.useMemo(
    () => selectedWebflowCollection?.displayName || selectedWebflowCollection?.name || webflowTarget?.name || null,
    [selectedWebflowCollection, webflowTarget?.name]
  );

  const latestWebflowPageSetupData =
    configureWebflowPagesMutation.variables?.siteId === effectiveWebflowPageSiteId
      ? configureWebflowPagesMutation.data?.data || null
      : null;
  const hasSavedWebflowPageTarget = Boolean(
    webflowPageTarget?.collectionId && webflowPageTarget.siteId === effectiveWebflowPageSiteId
  );
  const isWebflowPageSetupReady = latestWebflowPageSetupData
    ? Boolean(latestWebflowPageSetupData.ready)
    : hasSavedWebflowPageTarget;
  const webflowPageSetupStatus = latestWebflowPageSetupData?.status || (isWebflowPageSetupReady ? "ready" : "not_checked");
  const webflowPageSetupErrors = latestWebflowPageSetupData?.errors || [];

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
    if (webflowPageTarget?.siteId && !selectedWebflowPageSiteId) {
      setSelectedWebflowPageSiteId(webflowPageTarget.siteId);
    }
  }, [selectedWebflowPageSiteId, webflowPageTarget?.siteId]);

  React.useEffect(() => {
    if (!selectedWebflowCollection) {
      if (webflowMappingInitKeyRef.current !== "none") {
        webflowMappingInitKeyRef.current = "none";
        setWebflowMappings([]);
        setWebflowImageDestinations([]);
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
    const imageFieldKeys = new Set(selectedWebflowImageFields.map(field => getWebflowFieldKey(field)).filter(Boolean));

    if (savedFields.length > 0) {
      const savedImageKeys = new Set(
        savedFields
          .filter(field => {
            const key = field.webflowFieldSlug || field.webflowFieldId || "";
            return field.massicField === "featuredImage" || field.type === "image" || imageFieldKeys.has(key);
          })
          .map(field => field.webflowFieldSlug || field.webflowFieldId || "")
          .filter(Boolean)
      );
      setWebflowMappings(
        savedFields
          .filter(field => {
            const key = field.webflowFieldSlug || field.webflowFieldId || "";
            return !(field.massicField === "featuredImage" || field.type === "image" || imageFieldKeys.has(key));
          })
          .map((field, index) =>
            makeWebflowMappingRow({
              id: `saved-${index}`,
              massicField: field.massicField || "__static",
              webflowFieldKey: field.webflowFieldSlug || field.webflowFieldId || "",
              staticValue: field.staticValue || "",
            })
          )
      );
      setWebflowImageDestinations(
        selectedWebflowImageFields.map(field =>
          ({
            id: `image-${getWebflowFieldKey(field)}`,
            webflowFieldKey: getWebflowFieldKey(field),
            enabled: savedImageKeys.has(getWebflowFieldKey(field)),
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
    if (selectedWebflowMetaTitleField) {
      rows.push(
        makeWebflowMappingRow({
          id: "metaTitle",
          massicField: "metaTitle",
          webflowFieldKey: getWebflowFieldKey(selectedWebflowMetaTitleField),
        })
      );
    }
    if (selectedWebflowMetaDescriptionField) {
      rows.push(
        makeWebflowMappingRow({
          id: "metaDescription",
          massicField: "metaDescription",
          webflowFieldKey: getWebflowFieldKey(selectedWebflowMetaDescriptionField),
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
    setWebflowImageDestinations(
      selectedWebflowImageFields.map(field => ({
        id: `image-${getWebflowFieldKey(field)}`,
        webflowFieldKey: getWebflowFieldKey(field),
        enabled: true,
      }))
    );
  }, [
    requiredWebflowStaticFields,
    selectedWebflowBodyField,
    selectedWebflowCollection,
    selectedWebflowCollectionId,
    selectedWebflowFields,
    selectedWebflowImageFields,
    selectedWebflowMetaDescriptionField,
    selectedWebflowMetaTitleField,
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

  const submitRecommended = async () => { const siteUrl = normalizeSiteUrlInput(recommendedSiteUrl); if (!siteUrl) return; const wordpressInstallUrl = buildWordpressPluginInstallUrl(siteUrl); if (!wordpressInstallUrl) { toast.error("Invalid WordPress site URL"); return; } const pendingWindow = openPendingExternalTab(); setIsRecommendedModalOpen(false); try { await oauthStartLinkMutation.mutateAsync({ businessId, siteUrl }); if (!navigatePendingExternalTab(pendingWindow, wordpressInstallUrl)) { setExternalNavigationFallback({ url: wordpressInstallUrl, title: "Open WordPress plugin search", description: "Your browser blocked the new tab. Open WordPress from here to install Massic Integration.", }); return; } toast.success("WordPress plugin search opened", { description: "Install Massic Integration, then open Settings and click Connect Massic.", }); } catch { pendingWindow?.close(); } };

  const submitDisconnect = async () => {
    if (!connection?.connectionId) return;
    await disconnectMutation.mutateAsync({ connectionId: connection.connectionId });
  };

  const submitWebflowConnect = async () => { const pendingWindow = openPendingExternalTab(); const returnUrl = `${window.location.origin}/business/${businessId}/web?integrations=1`; try { const response = await startWebflowOauthMutation.mutateAsync({ businessId, returnUrl }); const authorizationUrl = response?.data?.authorizationUrl; if (!authorizationUrl) { pendingWindow?.close(); return; } if (!navigatePendingExternalTab(pendingWindow, authorizationUrl)) { setExternalNavigationFallback({ url: authorizationUrl, title: "Open Webflow authorization", description: "Your browser blocked the new tab. Open Webflow from here to continue setup.", }); } } catch { pendingWindow?.close(); } };

  const submitWebflowConfiguration = async () => {
    if (
      !webflowConnection?.connectionId ||
      !selectedWebflowSiteId ||
      !selectedWebflowCollectionId ||
      !selectedWebflowCollection
    ) {
      return;
    }
    const contentFields = webflowMappings
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
    const imageFields = webflowImageDestinations
      .filter(row => row.enabled && row.webflowFieldKey)
      .map(row => {
        const field = webflowFieldByKey.get(row.webflowFieldKey);
        return {
          massicField: "featuredImage",
          webflowFieldId: getWebflowId(field) || row.webflowFieldKey,
          webflowFieldSlug: getWebflowFieldSlug(field) || row.webflowFieldKey,
          type: "image",
        };
      });
    await configureWebflowMutation.mutateAsync({
      connectionId: webflowConnection.connectionId,
      siteId: selectedWebflowSiteId,
      collectionId: selectedWebflowCollectionId,
      collectionName: selectedWebflowCollection.displayName || selectedWebflowCollection.name,
      fieldMapping: { fields: [...contentFields, ...imageFields] },
    });
  };

  const submitWebflowPagesConfiguration = async () => {
    if (!webflowConnection?.connectionId || !effectiveWebflowPageSiteId) return;
    await configureWebflowPagesMutation.mutateAsync({
      connectionId: webflowConnection.connectionId,
      siteId: effectiveWebflowPageSiteId,
    });
  };

  const handleInvalidWordpressAdminUrl = () => { toast.error("Invalid WordPress site URL"); };

  const canSaveWebflowConfig =
    Boolean(webflowConnection?.connectionId && selectedWebflowSiteId && selectedWebflowCollectionId && hasBodyMapping) &&
    missingStaticMappings.length === 0 &&
    missingRequiredImageMappings.length === 0 &&
    !configureWebflowMutation.isPending;
  const canCheckWebflowPagesSetup = Boolean(webflowConnection?.connectionId && effectiveWebflowPageSiteId) &&
    !configureWebflowPagesMutation.isPending;

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
                  {wordpressAdminUrl ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={wordpressAdminUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1.5 size-4" />
                        WP Admin
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={handleInvalidWordpressAdminUrl}>
                      <ExternalLink className="mr-1.5 size-4" />
                      WP Admin
                    </Button>
                  )}
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
                    imageDestinations={webflowImageDestinations}
                    onImageDestinationsChange={setWebflowImageDestinations}
                    hasBodyMapping={hasBodyMapping}
                    missingStaticCount={missingStaticMappings.length}
                    missingRequiredImageCount={missingRequiredImageMappings.length}
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
                  <div className="mt-5 rounded-lg border border-general-border bg-background p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Typography variant="small" className="font-medium text-general-foreground">
                          Massic Pages collection
                        </Typography>
                        <p className="mt-1 text-sm text-general-muted-foreground">
                          Create a Webflow CMS collection named <span className="font-medium text-general-foreground">Massic Pages</span>.
                          Add custom fields <span className="font-medium text-general-foreground">Content</span> (Rich Text),
                          <span className="font-medium text-general-foreground"> Meta title</span> (Plain Text), and
                          <span className="font-medium text-general-foreground"> Meta description</span> (Plain Text).
                        </p>
                        <p className="mt-1 text-xs text-general-muted-foreground">
                          Recommended collection URL slug: <span className="font-medium text-general-foreground">resources</span>.
                          Massic checks the collection and fields before allowing Webflow page publishing.
                        </p>
                      </div>
                      <div className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium text-general-muted-foreground">
                        {isWebflowPageSetupReady
                          ? "Ready"
                          : webflowPageSetupStatus === "missing_collection"
                            ? "Collection missing"
                            : webflowPageSetupStatus === "invalid_schema"
                              ? "Invalid fields"
                              : "Not checked"}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="webflow-page-site">Page publish site</Label>
                        <Select
                          value={effectiveWebflowPageSiteId || undefined}
                          onValueChange={setSelectedWebflowPageSiteId}
                          disabled={webflowSitesQuery.isLoading}
                        >
                          <SelectTrigger id="webflow-page-site" className="w-full cursor-pointer">
                            <SelectValue placeholder={webflowSitesQuery.isLoading ? "Loading sites…" : "Select site"} />
                          </SelectTrigger>
                          <SelectContent>
                            {webflowSites.map(site => {
                              const id = getWebflowId(site);
                              return (
                                <SelectItem key={id} value={id}>
                                  {site.displayName || site.name || site.shortName || id}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant={isWebflowPageSetupReady ? "outline" : "default"}
                        onClick={submitWebflowPagesConfiguration}
                        disabled={!canCheckWebflowPagesSetup}
                      >
                        {configureWebflowPagesMutation.isPending ? "Checking…" : isWebflowPageSetupReady ? "Recheck setup" : "Check setup"}
                      </Button>
                    </div>

                    <div className="mt-3 text-xs text-general-muted-foreground">
                      {isWebflowPageSetupReady ? (
                        <span>
                          Pages will publish to {webflowPageTarget?.name || "Massic Pages"}
                          {selectedWebflowPageSiteName ? ` on ${selectedWebflowPageSiteName}` : ""}.
                        </span>
                      ) : webflowPageSetupErrors.length > 0 ? (
                        <ul className="list-disc space-y-1 pl-4">
                          {webflowPageSetupErrors.map(error => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      ) : (
                        <span>Select a site and check setup after creating the Massic Pages collection in Webflow.</span>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </Card>
      </div>

      <Dialog open={isRecommendedModalOpen} onOpenChange={setIsRecommendedModalOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={!oauthStartLinkMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Connect WordPress</DialogTitle>
            <DialogDescription>
              Enter your site URL. We&apos;ll open WordPress so an admin can install or open Massic Integration.
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
 Use a WordPress administrator account. Install and activate <strong className="text-general-foreground">Massic Integration</strong>,
 open <strong className="text-general-foreground">Settings → Massic Integration</strong>, then click <strong className="text-general-foreground">Connect Massic</strong>.
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
            <DialogDescription>
              {IS_WORDPRESS_QA_PLUGIN_BUILD
                ? "Download the QA plugin build, install it, and link your site."
                : "Install the approved Massic Integration plugin and link your site."}
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2.5 py-1 pl-5 text-sm text-general-foreground">
            {IS_WORDPRESS_QA_PLUGIN_BUILD ? (
              <>
                <li>Download the QA plugin ZIP from Massic.</li>
                <li>In WP Admin, go to <strong>Plugins → Add New → Upload Plugin</strong>.</li>
                <li>Upload the ZIP, install it, and activate it.</li>
                <li>Open <strong>Settings → Massic Integration</strong>.</li>
                <li>Click <strong>Connect Massic</strong> and approve the connection.</li>
              </>
            ) : (
              <>
                <li>In WP Admin, go to <strong>Plugins → Add New</strong>.</li>
                <li>Search <strong>massic-integration</strong> or <strong>Massic Integration</strong>.</li>
                <li>Install and activate the plugin.</li>
                <li>Open <strong>Settings → Massic Integration</strong>.</li>
                <li>Click <strong>Connect Massic</strong> and approve the connection.</li>
              </>
            )}
          </ol>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsHowToModalOpen(false)}>
              Close
            </Button>
            {IS_WORDPRESS_QA_PLUGIN_BUILD ? (
              <Button asChild>
                <a href={WORDPRESS_PLUGIN_QA_ZIP_PATH} download>
                  <Download className="mr-1.5 size-4" />
                  Download QA plugin
                </a>
              </Button>
            ) : (
              <Button asChild>
                <a href={WORDPRESS_PLUGIN_DIRECTORY_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 size-4" />
                  Open WordPress.org
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(externalNavigationFallback)} onOpenChange={(open) => { if (!open) setExternalNavigationFallback(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{externalNavigationFallback?.title || "Open connection"}</DialogTitle>
            <DialogDescription>{externalNavigationFallback?.description}</DialogDescription>
          </DialogHeader>
          {externalNavigationFallback?.url ? (
            <p className="break-all rounded-lg border border-general-border bg-muted/30 px-3 py-2.5 font-mono text-xs text-general-muted-foreground">
              {externalNavigationFallback.url}
            </p>
          ) : null}
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setExternalNavigationFallback(null)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {externalNavigationFallback?.url ? (
                <Button variant="outline" asChild>
                  <a href={externalNavigationFallback.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 size-4" />
                    Try new tab
                  </a>
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  if (!externalNavigationFallback?.url) return;
                  window.location.assign(externalNavigationFallback.url);
                }}
              >
                Open here
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
