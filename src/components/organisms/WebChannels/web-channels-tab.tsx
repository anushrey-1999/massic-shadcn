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
import {
  useConfigureSanity,
  useConnectSanity,
  useDisconnectSanity,
  useSanityConnection,
  useSanityDocumentTypes,
  useSanityFields,
  useValidateSanity,
  type SanityField,
} from "@/hooks/use-sanity-connector";
import { PlatformIcon, SiteFavicon } from "./platform-icon";
import { IntegrationStatusBadge } from "./integration-status-badge";
import {
  WebflowPublishSetup,
  type WebflowImageDestinationRow,
  type WebflowMappingRow,
} from "./webflow-publish-setup";
import {
  SanityPublishSetup,
  type SanityImageDestinationRow,
  type SanityMappingRow,
} from "./sanity-publish-setup";

interface WebChannelsTabProps {
  businessId: string;
  defaultSiteUrl?: string | null;
  isActive?: boolean;
  showHeader?: boolean;
}

const EMPTY_WEBFLOW_FIELDS: WebflowCollectionField[] = [];
const EMPTY_SANITY_FIELDS: SanityField[] = [];
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

function makeSanityMappingRow(partial: Partial<SanityMappingRow>): SanityMappingRow {
  return {
    id: partial.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    massicField: partial.massicField || "",
    sanityFieldPath: partial.sanityFieldPath || "",
    staticValue: partial.staticValue || "",
    sourcePath: partial.sourcePath || "",
    type: partial.type || "string",
  };
}

function findSanityField(fields: SanityField[], patterns: RegExp[]) {
  return fields.find(field => {
    const text = [field.fieldPath, field.label, field.name].filter(Boolean).join(" ").toLowerCase();
    return patterns.some(pattern => pattern.test(text));
  }) || null;
}

function isSanityManagedMassicStyleMapping(row: Pick<SanityMappingRow, "massicField" | "sanityFieldPath">) {
  return (
    row.massicField === "styledHtml" ||
    row.massicField === "massicHtml" ||
    row.massicField === "massicHtmlContent" ||
    row.massicField === "massicCss" ||
    row.sanityFieldPath === "massicHtml" ||
    row.sanityFieldPath === "massicCss"
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
  const [isSanityConnectModalOpen, setIsSanityConnectModalOpen] = React.useState(false);
  const [isSanityGuideOpen, setIsSanityGuideOpen] = React.useState(false);
  const [recommendedSiteUrl, setRecommendedSiteUrl] = React.useState(defaultSiteUrl || "");
  const [sanityProjectId, setSanityProjectId] = React.useState("");
  const [sanityDataset, setSanityDataset] = React.useState("production");
  const [sanityToken, setSanityToken] = React.useState("");
  const [sanityPreviewBaseUrl, setSanityPreviewBaseUrl] = React.useState("");
  const [sanityUrlPattern, setSanityUrlPattern] = React.useState("/blog/{slug}");
  const [selectedWebflowSiteId, setSelectedWebflowSiteId] = React.useState("");
  const [selectedWebflowCollectionId, setSelectedWebflowCollectionId] = React.useState("");
  const [webflowMappings, setWebflowMappings] = React.useState<WebflowMappingRow[]>([]);
  const [webflowImageDestinations, setWebflowImageDestinations] = React.useState<WebflowImageDestinationRow[]>([]);
  const [isWebflowConfigOpen, setIsWebflowConfigOpen] = React.useState(false);
  const [selectedSanityDocumentType, setSelectedSanityDocumentType] = React.useState("");
  const [sanityMappings, setSanityMappings] = React.useState<SanityMappingRow[]>([]);
  const [sanityImageDestinations, setSanityImageDestinations] = React.useState<SanityImageDestinationRow[]>([]);
  const [isSanityConfigOpen, setIsSanityConfigOpen] = React.useState(false);
  const webflowMappingInitKeyRef = React.useRef("");
  const sanityMappingInitKeyRef = React.useRef("");

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
  const sanityConnectionQuery = useSanityConnection(businessId);
  const sanityConnection = sanityConnectionQuery.data?.connection || null;
  const isSanityConnected = Boolean(sanityConnectionQuery.data?.connected && sanityConnection);
  const sanityTarget = sanityConnection?.target || null;
  const connectSanityMutation = useConnectSanity(businessId);
  const validateSanityMutation = useValidateSanity();
  const disconnectSanityMutation = useDisconnectSanity(businessId);
  const configureSanityMutation = useConfigureSanity(businessId);
  const sanityDocumentTypesQuery = useSanityDocumentTypes(sanityConnection?.connectionId || null);
  const sanityDocumentTypes = sanityDocumentTypesQuery.data || [];
  const effectiveSanityDocumentType = selectedSanityDocumentType || sanityTarget?.documentType || "";
  const sanityFieldsQuery = useSanityFields(sanityConnection?.connectionId || null, effectiveSanityDocumentType || null);
  const sanityFields = sanityFieldsQuery.data || EMPTY_SANITY_FIELDS;
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
  const selectedSanityImageFields = React.useMemo(
    () => sanityFields.filter(field => field.possibleImage || field.type === "image"),
    [sanityFields]
  );
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

  const selectedWebflowCollectionName = React.useMemo(
    () => selectedWebflowCollection?.displayName || selectedWebflowCollection?.name || webflowTarget?.name || null,
    [selectedWebflowCollection, webflowTarget?.name]
  );
  const savedSanityPreviewBaseUrl = React.useMemo(
    () =>
      String(
        sanityTarget?.metadata?.previewBaseUrl ||
          sanityConnection?.metadata?.previewBaseUrl ||
          sanityConnection?.siteUrl ||
          ""
      ),
    [
      sanityConnection?.metadata?.previewBaseUrl,
      sanityConnection?.siteUrl,
      sanityTarget?.metadata?.previewBaseUrl,
    ]
  );
  const savedSanityUrlPattern = React.useMemo(
    () =>
      String(
        sanityTarget?.metadata?.urlPattern ||
          sanityConnection?.metadata?.urlPattern ||
          ""
      ),
    [
      sanityConnection?.metadata?.urlPattern,
      sanityTarget?.metadata?.urlPattern,
    ]
  );

  React.useEffect(() => {
    if (!recommendedSiteUrl && defaultSiteUrl) setRecommendedSiteUrl(defaultSiteUrl);
  }, [defaultSiteUrl, recommendedSiteUrl]);

  React.useEffect(() => {
    if (savedSanityPreviewBaseUrl) {
      setSanityPreviewBaseUrl(savedSanityPreviewBaseUrl);
      return;
    }
    if (defaultSiteUrl) setSanityPreviewBaseUrl(defaultSiteUrl);
  }, [defaultSiteUrl, savedSanityPreviewBaseUrl]);

  React.useEffect(() => {
    if (savedSanityUrlPattern) setSanityUrlPattern(savedSanityUrlPattern);
  }, [savedSanityUrlPattern]);

  React.useEffect(() => {
    if (webflowTarget?.siteId && !selectedWebflowSiteId) setSelectedWebflowSiteId(webflowTarget.siteId);
    if (webflowTarget?.collectionId && !selectedWebflowCollectionId) {
      setSelectedWebflowCollectionId(webflowTarget.collectionId);
    }
  }, [selectedWebflowCollectionId, selectedWebflowSiteId, webflowTarget?.collectionId, webflowTarget?.siteId]);

  React.useEffect(() => {
    if (sanityTarget?.documentType && !selectedSanityDocumentType) {
      setSelectedSanityDocumentType(sanityTarget.documentType);
    }
  }, [
    sanityTarget?.documentType,
    selectedSanityDocumentType,
  ]);

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
    if (!effectiveSanityDocumentType) {
      if (sanityMappingInitKeyRef.current !== "none") {
        sanityMappingInitKeyRef.current = "none";
        setSanityMappings([]);
        setSanityImageDestinations([]);
      }
      return;
    }

    const fieldSignature = sanityFields
      .map(field => `${field.fieldPath}:${field.type}:${field.possibleImage ? "image" : ""}:${field.possibleBody ? "body" : ""}`)
      .join("|");
    const savedSignature = JSON.stringify(sanityTarget?.fieldMapping?.fields || []);
    const initKey = [
      effectiveSanityDocumentType,
      fieldSignature,
      sanityTarget?.documentType === effectiveSanityDocumentType ? savedSignature : "",
    ].join("::");

    if (sanityMappingInitKeyRef.current === initKey) return;
    sanityMappingInitKeyRef.current = initKey;

    const savedFields =
      sanityTarget?.documentType === effectiveSanityDocumentType ? sanityTarget?.fieldMapping?.fields || [] : [];
    const imageFieldKeys = new Set(selectedSanityImageFields.map(field => field.fieldPath).filter(Boolean));

    if (savedFields.length > 0) {
      const savedImageKeys = new Set(
        savedFields
          .filter(field => {
            const key = field.sanityFieldPath || "";
            return field.type === "image" || imageFieldKeys.has(key);
          })
          .map(field => field.sanityFieldPath || "")
          .filter(Boolean)
      );
      const savedRows = savedFields
          .filter(field => {
            const key = field.sanityFieldPath || "";
            return !(field.type === "image" || imageFieldKeys.has(key) || isSanityManagedMassicStyleMapping({
              massicField: field.massicField || "",
              sanityFieldPath: key,
            }));
          })
          .map((field, index) =>
            makeSanityMappingRow({
              id: `saved-sanity-${index}`,
              massicField: field.massicField || "__static",
              sanityFieldPath: field.sanityFieldPath || "",
              sourcePath: field.sourcePath || "",
              staticValue: field.staticValue || "",
              type: field.type || field.sanityFieldType || "string",
            })
          );
      setSanityMappings(savedRows);
      setSanityImageDestinations(
        selectedSanityImageFields.map(field => ({
          id: `image-${field.fieldPath}`,
          sanityFieldPath: field.fieldPath,
          enabled: savedImageKeys.has(field.fieldPath),
        }))
      );
      return;
    }

    const titleField = findSanityField(sanityFields, [/^title$/i, /\btitle\b/i]);
    const slugField = findSanityField(sanityFields, [/^slug$/i, /\bslug\b/i]);
    const bodyField = sanityFields.find(field => field.possibleBody || field.type === "portableText") || findSanityField(sanityFields, [/\bbody\b/i, /\bcontent\b/i]);
    const metaTitleField = findSanityField(sanityFields, [/(seo|meta).*title/i, /title.*(seo|meta)/i]);
    const metaDescriptionField = findSanityField(sanityFields, [/(seo|meta).*(description|desc)/i, /(description|desc).*(seo|meta)/i, /\bexcerpt\b/i]);
    const rows: SanityMappingRow[] = [];
    if (titleField) rows.push(makeSanityMappingRow({ id: "sanity-title", massicField: "title", sanityFieldPath: titleField.fieldPath, type: titleField.type || "string" }));
    if (slugField) rows.push(makeSanityMappingRow({ id: "sanity-slug", massicField: "slug", sanityFieldPath: slugField.fieldPath, type: "slug" }));
    if (bodyField) rows.push(makeSanityMappingRow({ id: "sanity-body", massicField: "bodyHtml", sanityFieldPath: bodyField.fieldPath, type: bodyField.type || "portableText" }));
    if (metaTitleField) rows.push(makeSanityMappingRow({ id: "sanity-meta-title", massicField: "metaTitle", sanityFieldPath: metaTitleField.fieldPath, type: metaTitleField.type || "string" }));
    if (metaDescriptionField) rows.push(makeSanityMappingRow({ id: "sanity-meta-description", massicField: "metaDescription", sanityFieldPath: metaDescriptionField.fieldPath, type: metaDescriptionField.type || "string" }));

    setSanityMappings(rows);
    setSanityImageDestinations(
      selectedSanityImageFields.map(field => ({
        id: `image-${field.fieldPath}`,
        sanityFieldPath: field.fieldPath,
        enabled: true,
      }))
    );
  }, [
    effectiveSanityDocumentType,
    sanityFields,
    sanityTarget?.documentType,
    sanityTarget?.fieldMapping?.fields,
    selectedSanityImageFields,
  ]);

  React.useEffect(() => {
    const onWebflowOauthMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || payload.source !== "massic-webflow-oauth") return;
      if (payload.ok) {
        toast.success("Webflow connected");
        void webflowConnectionQuery.refetch();
        void sanityConnectionQuery.refetch();
        void refetch();
        return;
      }
      toast.error("Webflow connection failed", {
        description: payload.message || "Please try again.",
      });
    };
    window.addEventListener("message", onWebflowOauthMessage);
    return () => window.removeEventListener("message", onWebflowOauthMessage);
  }, [refetch, sanityConnectionQuery, webflowConnectionQuery]);

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

  const sanityConnectionPayload = () => ({
    businessId,
    projectId: sanityProjectId.trim(),
    dataset: sanityDataset.trim() || "production",
    token: sanityToken.trim(),
    previewBaseUrl: normalizeSiteUrlInput(sanityPreviewBaseUrl),
    urlPattern: sanityUrlPattern.trim() || "/blog/{slug}",
  });

  const submitSanityValidation = async () => {
    await validateSanityMutation.mutateAsync(sanityConnectionPayload());
  };

  const submitSanityConnect = async () => {
    const response = await connectSanityMutation.mutateAsync(sanityConnectionPayload());
    const connection = response?.data?.connection;
    if (connection?.metadata?.projectId) setSanityProjectId(String(connection.metadata.projectId));
    if (connection?.metadata?.dataset) setSanityDataset(String(connection.metadata.dataset));
    setSanityToken("");
    setIsSanityConnectModalOpen(false);
  };

  const submitSanityConfiguration = async () => {
    if (!sanityConnection?.connectionId || !effectiveSanityDocumentType) return;
    const contentFields = sanityMappings
      .filter(row => row.sanityFieldPath && !isSanityManagedMassicStyleMapping(row))
      .map(row => ({
        ...(row.massicField && row.massicField !== "__static" && row.massicField !== "__custom" ? { massicField: row.massicField } : {}),
        sanityFieldPath: row.sanityFieldPath,
        ...(row.sourcePath ? { sourcePath: row.sourcePath } : {}),
        ...(row.massicField === "__static" || row.massicField === "__custom" ? { staticValue: row.staticValue } : {}),
        type: row.type || "string",
      }));
    const imageFields = sanityImageDestinations
      .filter(row => row.enabled && row.sanityFieldPath)
      .map(row => ({
        massicField: "featuredImage",
        sanityFieldPath: row.sanityFieldPath,
        type: "image",
      }));

    await configureSanityMutation.mutateAsync({
      connectionId: sanityConnection.connectionId,
      documentType: effectiveSanityDocumentType,
      previewBaseUrl: normalizeSiteUrlInput(sanityPreviewBaseUrl),
      urlPattern: sanityUrlPattern.trim() || "/blog/{slug}",
      fieldMapping: { fields: [...contentFields, ...imageFields] },
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
    missingRequiredImageMappings.length === 0 &&
    !configureWebflowMutation.isPending;

  const needsWebflowSetup = isWebflowConnected && !webflowTarget?.collectionId;
  const canSaveSanityConfig =
    Boolean(sanityConnection?.connectionId && effectiveSanityDocumentType && sanityMappings.some(row => row.sanityFieldPath)) &&
    sanityUrlPattern.includes("{slug}") &&
    !configureSanityMutation.isPending;
  const needsSanitySetup = isSanityConnected && !sanityTarget?.targetId;

  React.useEffect(() => {
    if (needsWebflowSetup) {
      setIsWebflowConfigOpen(true);
    }
    if (needsSanitySetup) {
      setIsSanityConfigOpen(true);
    }
  }, [needsSanitySetup, needsWebflowSetup]);

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
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </Card>

        {/* Sanity */}
        <Card variant="profileCard" className="border-none bg-white p-4">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-0 pb-0">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <PlatformIcon platform="sanity" />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base font-medium">Sanity</CardTitle>
                  <IntegrationStatusBadge
                    connected={isSanityConnected}
                    loading={sanityConnectionQuery.isLoading}
                  />
                </div>
                <CardDescription>
                  Publish blog drafts and live documents to Sanity.
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isSanityConnected ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      sanityConnection?.connectionId &&
                      disconnectSanityMutation.mutate({ connectionId: sanityConnection.connectionId })
                    }
                    disabled={disconnectSanityMutation.isPending}
                  >
                    {disconnectSanityMutation.isPending ? "Disconnecting..." : "Disconnect"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="outline" className="size-9">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setIsSanityGuideOpen(true)}>Setup guide</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-general-muted-foreground"
                    onClick={() => setIsSanityGuideOpen(true)}
                  >
                    <HelpCircle className="mr-1.5 size-4" />
                    Guide
                  </Button>
                  <Button size="sm" onClick={() => setIsSanityConnectModalOpen(true)} disabled={connectSanityMutation.isPending}>
                    <Link2 className="mr-1.5 size-4" />
                    Connect
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          {isSanityConnected && (
            <Collapsible
              open={isSanityConfigOpen}
              onOpenChange={setIsSanityConfigOpen}
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
                      {needsSanitySetup ? "Complete publishing setup" : "Publishing settings"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-general-muted-foreground">
                      {needsSanitySetup
                        ? "Choose document type, preview URL, and field mapping"
                        : sanityTarget?.documentType
                          ? [sanityTarget.documentType, sanityConnection?.metadata?.dataset]
                              .filter(Boolean)
                              .join(" · ")
                          : "Document type and field mapping"}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-general-muted-foreground transition-transform duration-200",
                      isSanityConfigOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden">
                <div className="pb-1 pt-2">
                  <SanityPublishSetup
                    documentTypes={sanityDocumentTypes}
                    fields={sanityFields}
                    documentTypesLoading={sanityDocumentTypesQuery.isLoading}
                    fieldsLoading={sanityFieldsQuery.isLoading}
                    selectedDocumentType={effectiveSanityDocumentType}
                    onDocumentTypeChange={setSelectedSanityDocumentType}
                    previewBaseUrl={sanityPreviewBaseUrl}
                    onPreviewBaseUrlChange={setSanityPreviewBaseUrl}
                    urlPattern={sanityUrlPattern}
                    onUrlPatternChange={setSanityUrlPattern}
                    mappings={sanityMappings}
                    onMappingsChange={setSanityMappings}
                    imageDestinations={sanityImageDestinations}
                    onImageDestinationsChange={setSanityImageDestinations}
                    canSave={canSaveSanityConfig}
                    isSaving={configureSanityMutation.isPending}
                    hasSavedTarget={Boolean(sanityTarget?.targetId)}
                    onSave={submitSanityConfiguration}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </Card>
      </div>

      <Dialog open={isSanityConnectModalOpen} onOpenChange={setIsSanityConnectModalOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton={!connectSanityMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Connect Sanity</DialogTitle>
            <DialogDescription>
              Add your project details. The token is validated and stored encrypted.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sanity-project-id">Project ID</Label>
                <Input
                  id="sanity-project-id"
                  value={sanityProjectId}
                  onChange={event => setSanityProjectId(event.target.value)}
                  placeholder="abc123"
                  disabled={connectSanityMutation.isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sanity-dataset">Dataset</Label>
                <Input
                  id="sanity-dataset"
                  value={sanityDataset}
                  onChange={event => setSanityDataset(event.target.value)}
                  placeholder="production"
                  disabled={connectSanityMutation.isPending}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sanity-token">API token</Label>
              <Input
                id="sanity-token"
                value={sanityToken}
                onChange={event => setSanityToken(event.target.value)}
                placeholder="sk..."
                type="password"
                disabled={connectSanityMutation.isPending}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sanity-preview-url">Site/preview base URL</Label>
                <Input
                  id="sanity-preview-url"
                  value={sanityPreviewBaseUrl}
                  onChange={event => setSanityPreviewBaseUrl(event.target.value)}
                  placeholder="https://example.com"
                  disabled={connectSanityMutation.isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sanity-url-pattern-connect">Blog URL pattern</Label>
                <Input
                  id="sanity-url-pattern-connect"
                  value={sanityUrlPattern}
                  onChange={event => setSanityUrlPattern(event.target.value)}
                  placeholder="/blog/{slug}"
                  disabled={connectSanityMutation.isPending}
                />
              </div>
            </div>
            <Button
              variant="link"
              className="h-auto justify-start px-0 text-xs"
              onClick={() => setIsSanityGuideOpen(true)}
            >
              Need help finding these?
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSanityConnectModalOpen(false)} disabled={connectSanityMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={submitSanityValidation}
              disabled={!sanityProjectId.trim() || !sanityToken.trim() || validateSanityMutation.isPending || connectSanityMutation.isPending}
            >
              {validateSanityMutation.isPending ? "Validating..." : "Validate"}
            </Button>
            <Button
              onClick={submitSanityConnect}
              disabled={!sanityProjectId.trim() || !sanityToken.trim() || connectSanityMutation.isPending}
            >
              {connectSanityMutation.isPending ? "Connecting..." : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSanityGuideOpen} onOpenChange={setIsSanityGuideOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sanity setup</DialogTitle>
            <DialogDescription>Find the values needed to connect Sanity publishing.</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2.5 py-1 pl-5 text-sm text-general-foreground">
            <li>
              <strong>Project ID:</strong> Open <strong>sanity.io/manage</strong>, choose your project, and copy the
              project ID. You can also find it in your Studio config or environment variables.
            </li>
            <li>
              <strong>Dataset:</strong> In Sanity Manage, open <strong>Datasets</strong>. Most sites use{" "}
              <strong>production</strong>.
            </li>
            <li>
              <strong>API token:</strong> In Sanity Manage, open <strong>API &gt; Tokens</strong> and create a token
              with write access for draft/live publishing and asset upload.
            </li>
            <li>
              <strong>Site/preview base URL:</strong> Use the live or preview frontend URL where blog posts render,
              such as <strong>https://example.com</strong>.
            </li>
            <li>
              <strong>Blog URL pattern:</strong> Enter the route your frontend uses for posts, such as{" "}
              <strong>/blog/{"{slug}"}</strong>. The <strong>{"{slug}"}</strong> token is required.
            </li>
          </ol>
          <p className="rounded-lg border border-general-border bg-muted/30 px-3 py-2.5 text-xs text-general-muted-foreground">
            Tokens are validated by the backend and are not shown again after saving.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSanityGuideOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
