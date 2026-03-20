"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Typography } from "@/components/ui/typography";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { resolvePageContent } from "@/utils/page-content-resolver";
import { api } from "@/hooks/use-api";
import { ensureMassicContentWrapper } from "@/utils/page-content-format";
import { normalizeWordpressSlugPath, normalizeWordpressSlugPathInput, wordpressSlugToDisplay } from "@/utils/wordpress-slug";
import {
  applySpacingEditsToHtml,
  applyLinkEditsToHtml,
  applyTextEditsToHtml,
  buildEditableHtmlModel,
  canonicalizeHtml,
  EDITABLE_SPACING_PX_MAX,
  EDITABLE_SPACING_PX_MIN,
  mergeSpacingUtilityClasses,
  parseEditableSpacingValueFromClassName,
  extractPlainTextFromHtml,
  isSafeEditableLinkHref,
  normalizeEditableLinkHref,
  sanitizePageHtml,
  type EditableLinkRef,
  type EditableSpacingRef,
  type EditableSpacingToken,
  type EditableSpacingValue,
  type EditableTextNodeRef,
} from "@/utils/page-html-editor";
import {
  applyMassicStyleOverrides,
  buildMassicCssVariableOverrides,
  MASSIC_STYLE_COLOR_KEYS,
  MASSIC_STYLE_TYPOGRAPHY_KEYS,
  normalizeMassicStyleColorOverrides,
  normalizeMassicStyleTypographyOverrides,
  type MassicStyleTypographyKey,
  type MassicStyleColorKey,
} from "@/utils/massic-style-overrides";
import { buildStyledMassicHtml, getMassicCssText } from "@/utils/massic-html-copy";
import { useWebActionContentQuery } from "@/hooks/use-web-page-actions";
import {
  useUpdateWordpressStyleOverrides,
  useWordpressConnection,
  useWordpressStyleProfile,
} from "@/hooks/use-wordpress-connector";
import {
  type WordpressSlugConflictInfo,
  WordpressPublishError,
  useWordpressContentStatus,
  useWordpressPreviewLink,
  useWordpressPublish,
  useWordpressSlugCheck,
  useWordpressUnpublish,
} from "@/hooks/use-wordpress-publishing";

type SaveReason = "debounce" | "blur" | "unmount";
type ActiveLinkEditorState = {
  id: string;
  top: number;
  left: number;
  label: string;
};
type PreviewEditMode = "text" | "spacing";
type ActiveSpacingEditorState = {
  id: string;
  top: number;
  left: number;
  label: string;
  baseClassName: string;
};

function isEditableSpan(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && Boolean(target.dataset.massicTextId);
}

function getEditableLinkElement(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("a[data-massic-link-id]") as HTMLAnchorElement | null;
}

function getAnyAnchorElement(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("a") as HTMLAnchorElement | null;
}

function getEditableSpacingElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("[data-massic-spacing-id]") as HTMLElement | null;
}

function updateEditFromElement(edits: Record<string, string>, element: HTMLElement) {
  const id = element.dataset.massicTextId;
  if (!id) return edits;
  return {
    ...edits,
    [id]: element.textContent ?? "",
  };
}

function insertPlainTextAtCursor(text: string) {
  if (!text) return;

  if (typeof document !== "undefined" && document.queryCommandSupported?.("insertText")) {
    document.execCommand("insertText", false, text);
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
}

function createEmptySpacingValue(): EditableSpacingValue {
  return {
    outsideTop: null,
    outsideBottom: null,
  };
}

function areSpacingValuesEqual(left: Partial<EditableSpacingValue> | null | undefined, right: Partial<EditableSpacingValue> | null | undefined): boolean {
  const leftValue = left || {};
  const rightValue = right || {};
  return (
    (leftValue.outsideTop || null) === (rightValue.outsideTop || null) &&
    (leftValue.outsideBottom || null) === (rightValue.outsideBottom || null)
  );
}

const STYLE_COLOR_OPTION_LABELS: Record<MassicStyleColorKey, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  link: "Link",
  text: "Text",
  mutedText: "Muted Text",
  background: "Background",
  surface: "Surface",
  buttonBg: "Button Background",
  buttonText: "Button Text",
};
const CORE_STYLE_COLOR_KEYS: MassicStyleColorKey[] = [
  "primary",
  "secondary",
  "accent",
  "link",
  "buttonBg",
  "buttonText",
];
const ADVANCED_STYLE_COLOR_KEYS: MassicStyleColorKey[] = [
  "text",
  "mutedText",
  "background",
  "surface",
];
const STYLE_TYPOGRAPHY_OPTION_LABELS: Partial<Record<MassicStyleTypographyKey, string>> = {
  baseFontSize: "Base Text Size",
  baseLineHeight: "Base Line Height",
  h1Size: "H1 Size",
  h2Size: "H2 Size",
  h3Size: "H3 Size",
};
const VISIBLE_STYLE_TYPOGRAPHY_KEYS: MassicStyleTypographyKey[] = [
  "baseFontSize",
  "baseLineHeight",
  "h1Size",
  "h2Size",
  "h3Size",
];
const LINE_HEIGHT_PRESETS = ["1.3", "1.4", "1.5", "1.6", "1.8", "2"];
const TYPOGRAPHY_PRESETS: Record<MassicStyleTypographyKey, string[]> = {
  bodyFontFamily: [],
  headingFontFamily: [],
  baseFontSize: ["14px", "16px", "18px", "20px", "22px", "24px"],
  baseLineHeight: LINE_HEIGHT_PRESETS,
  h1Size: ["28px", "32px", "36px", "40px", "42px", "48px"],
  h2Size: ["22px", "24px", "28px", "32px", "36px"],
  h3Size: ["18px", "20px", "22px", "26px", "30px"],
};
const SPACING_SELECT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Default" },
  { value: "0", label: "0" },
  { value: "8", label: "8" },
  { value: "12", label: "12" },
  { value: "16", label: "16" },
  { value: "24", label: "24" },
  { value: "32", label: "32" },
];
const SPACING_CUSTOM_OPTION_VALUE = "__custom__";
const SPACING_SCALE_PIXEL_BASE: Record<string, number> = {
  none: 0,
  xs: 8,
  s: 12,
  m: 16,
  l: 24,
  xl: 32,
};

function parseSpacingNumberToken(value: EditableSpacingToken | null | undefined): number | null {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("num:")) {
    const parsed = Number(value.slice(4));
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed);
  }
  const normalized = String(value).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(SPACING_SCALE_PIXEL_BASE, normalized)) {
    return SPACING_SCALE_PIXEL_BASE[normalized];
  }
  return null;
}

function clampSpacingPx(value: number): number {
  const rounded = Math.round(value);
  if (rounded < EDITABLE_SPACING_PX_MIN) return EDITABLE_SPACING_PX_MIN;
  if (rounded > EDITABLE_SPACING_PX_MAX) return EDITABLE_SPACING_PX_MAX;
  return rounded;
}

function toSpacingNumberToken(value: number): EditableSpacingToken {
  return `num:${clampSpacingPx(value)}`;
}

function toSpacingPresetValue(value: EditableSpacingToken | null | undefined): string {
  const numericValue = parseSpacingNumberToken(value);
  if (numericValue == null) return "";
  const numericKey = String(numericValue);
  const isPreset = SPACING_SELECT_OPTIONS.some((option) => option.value === numericKey);
  return isPreset ? numericKey : SPACING_CUSTOM_OPTION_VALUE;
}

function resolveSpacingInputValue(value: EditableSpacingToken | null | undefined): string {
  const spacingNumber = parseSpacingNumberToken(value);
  return spacingNumber == null ? "" : String(spacingNumber);
}

function parseSpacingNumberInput(value: string): number | null {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return clampSpacingPx(parsed);
}

export function WebPageHtmlView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const [pollingDisabled, setPollingDisabled] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState("");
  const [textNodeIndex, setTextNodeIndex] = React.useState<EditableTextNodeRef[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [lastPublishedData, setLastPublishedData] = React.useState<{
    contentId: string;
    wpId: number;
    permalink: string | null;
    editUrl: string | null;
    status: string;
    slug?: string | null;
    previewUrl?: string;
  } | null>(null);
  const [isEmbeddedPreviewOpen, setIsEmbeddedPreviewOpen] = React.useState(false);
  const [embeddedPreviewUrl, setEmbeddedPreviewUrl] = React.useState("");
  const [embeddedPreviewTitle, setEmbeddedPreviewTitle] = React.useState("Preview");
  const [isEmbeddedPreviewLoading, setIsEmbeddedPreviewLoading] = React.useState(false);
  const [showEmbedFallbackHint, setShowEmbedFallbackHint] = React.useState(false);
  const [previewViewport, setPreviewViewport] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const [confirmPublishAction, setConfirmPublishAction] = React.useState<"draft" | "live" | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);
  const [editableSlug, setEditableSlug] = React.useState("");
  const [isSlugEdited, setIsSlugEdited] = React.useState(false);
  const [slugCheckResult, setSlugCheckResult] = React.useState<{
    slug: string;
    publishUrl: string | null;
    exists: boolean;
    sameMappedContent: boolean;
    conflict: WordpressSlugConflictInfo | null;
    suggestedSlug?: string | null;
    mappedToDifferentContent: boolean;
    mappedContentId: string | null;
  } | null>(null);
  const [slugCheckError, setSlugCheckError] = React.useState<string | null>(null);
  const [isSlugChecking, setIsSlugChecking] = React.useState(false);
  const [isAutoResolvingSlug, setIsAutoResolvingSlug] = React.useState(false);

  const contentQuery = useWebActionContentQuery({
    type: "page",
    businessId,
    pageId,
    enabled: !!businessId && !!pageId,
    pollingDisabled,
    pollingIntervalMs: 6000,
  });

  const data = contentQuery.data;
  const wpConnectionQuery = useWordpressConnection(businessId || null);
  const wpConnection = wpConnectionQuery.data?.connection || null;
  const isWpConnected = Boolean(wpConnectionQuery.data?.connected && wpConnection);
  const wpStyleProfileQuery = useWordpressStyleProfile(wpConnection?.connectionId || null);
  const wpStyleOverridesMutation = useUpdateWordpressStyleOverrides();
  const wpPublishMutation = useWordpressPublish();
  const { mutateAsync: slugCheckMutateAsync } = useWordpressSlugCheck();
  const wpPreviewMutation = useWordpressPreviewLink();
  const wpUnpublishMutation = useWordpressUnpublish();
  const [styleColorOverridesDraft, setStyleColorOverridesDraft] = React.useState<
    Partial<Record<MassicStyleColorKey, string>>
  >({});
  const [styleTypographyOverridesDraft, setStyleTypographyOverridesDraft] = React.useState<
    Partial<Record<MassicStyleTypographyKey, string>>
  >({});
  const [showAllStyleColorOptions, setShowAllStyleColorOptions] = React.useState(false);
  const [openStylePaletteKey, setOpenStylePaletteKey] = React.useState<MassicStyleColorKey | null>(null);
  const [previewEditMode, setPreviewEditMode] = React.useState<PreviewEditMode>("text");
  const [activeLinkEditor, setActiveLinkEditor] = React.useState<ActiveLinkEditorState | null>(null);
  const [linkHrefDraft, setLinkHrefDraft] = React.useState("");
  const [linkHrefError, setLinkHrefError] = React.useState<string | null>(null);
  const [activeSpacingEditor, setActiveSpacingEditor] = React.useState<ActiveSpacingEditorState | null>(null);
  const [spacingDraft, setSpacingDraft] = React.useState<EditableSpacingValue>(createEmptySpacingValue);
  const [hoveredSpacingId, setHoveredSpacingId] = React.useState<string | null>(null);

  const sourceHtmlRef = React.useRef("");
  const textNodeIndexRef = React.useRef<EditableTextNodeRef[]>([]);
  const linkIndexRef = React.useRef<EditableLinkRef[]>([]);
  const spacingIndexRef = React.useRef<EditableSpacingRef[]>([]);
  const editsRef = React.useRef<Record<string, string>>({});
  const linkEditsRef = React.useRef<Record<string, string>>({});
  const spacingEditsRef = React.useRef<Record<string, EditableSpacingValue>>({});
  const saveTimerRef = React.useRef<number | null>(null);
  const isSavingRef = React.useRef(false);
  const queuedSaveRef = React.useRef(false);
  const previewContainerRef = React.useRef<HTMLDivElement | null>(null);
  const isEditorFocusedRef = React.useRef(false);
  const isInitialLoadRef = React.useRef(true);
  const lastSavedHtmlRef = React.useRef("");
  const lastStatusRef = React.useRef<string>("");
  const hasLocalEditsRef = React.useRef(false);
  const isEditingSessionRef = React.useRef(false);
  const lastCommittedHtmlRef = React.useRef("");
  const pendingBackgroundRefetchRef = React.useRef(false);
  const lastAutoSlugCheckKeyRef = React.useRef("");

  const extractionStatus = (wpStyleProfileQuery.data?.latestExtraction?.status || "").toLowerCase();
  const shouldApplyWpStyle = isWpConnected && !!wpStyleProfileQuery.data?.profile && (extractionStatus === "success" || extractionStatus === "partial");
  const isWaitingForStyleProfilePreview =
    isWpConnected &&
    !wpStyleProfileQuery.data &&
    (wpStyleProfileQuery.isLoading || wpStyleProfileQuery.isFetching);
  const normalizedStoredStyleColorOverrides = React.useMemo(
    () => normalizeMassicStyleColorOverrides(wpStyleProfileQuery.data?.styleOverrides || {}).colors || {},
    [wpStyleProfileQuery.data?.styleOverrides]
  );
  const normalizedStoredStyleTypographyOverrides = React.useMemo(
    () => normalizeMassicStyleTypographyOverrides(wpStyleProfileQuery.data?.styleOverrides || {}).typography || {},
    [wpStyleProfileQuery.data?.styleOverrides]
  );
  const serializedStoredColorOverrides = React.useMemo(
    () => JSON.stringify(normalizedStoredStyleColorOverrides),
    [normalizedStoredStyleColorOverrides]
  );
  const serializedStoredTypographyOverrides = React.useMemo(
    () => JSON.stringify(normalizedStoredStyleTypographyOverrides),
    [normalizedStoredStyleTypographyOverrides]
  );
  React.useEffect(() => {
    setStyleColorOverridesDraft((prev) => {
      const prevSerialized = JSON.stringify(
        normalizeMassicStyleColorOverrides({ colors: prev }).colors || {}
      );
      if (prevSerialized === serializedStoredColorOverrides) {
        return prev;
      }
      return normalizedStoredStyleColorOverrides;
    });
  }, [normalizedStoredStyleColorOverrides, serializedStoredColorOverrides]);
  React.useEffect(() => {
    setStyleTypographyOverridesDraft((prev) => {
      const prevSerialized = JSON.stringify(
        normalizeMassicStyleTypographyOverrides({ typography: prev }).typography || {}
      );
      if (prevSerialized === serializedStoredTypographyOverrides) {
        return prev;
      }
      return normalizedStoredStyleTypographyOverrides;
    });
  }, [normalizedStoredStyleTypographyOverrides, serializedStoredTypographyOverrides]);

  const styleProfileForPreview = React.useMemo(
    () =>
      shouldApplyWpStyle
        ? applyMassicStyleOverrides(
            wpStyleProfileQuery.data?.profile,
            {
              colors: styleColorOverridesDraft,
              typography: styleTypographyOverridesDraft,
            }
          )
        : null,
    [shouldApplyWpStyle, styleColorOverridesDraft, styleTypographyOverridesDraft, wpStyleProfileQuery.data?.profile]
  );
  const cssVarOverrides = React.useMemo(
    () =>
      styleProfileForPreview
        ? buildMassicCssVariableOverrides({ normalizedProfile: styleProfileForPreview })
        : {},
    [styleProfileForPreview]
  );

  const previewStyleVars = React.useMemo(() => {
    const style: React.CSSProperties = {};
    for (const [key, value] of Object.entries(cssVarOverrides)) {
      (style as Record<string, string>)[key] = value;
    }
    return style;
  }, [cssVarOverrides]);
  const previewMassicVarCss = React.useMemo(() => {
    const entries = Object.entries(cssVarOverrides);
    if (!entries.length) return "";
    const declarations = entries.map(([key, value]) => `${key}: ${value};`).join(" ");
    return `.massic-html-preview .massic-content { ${declarations} }`;
  }, [cssVarOverrides]);

  const status = (data?.status || "").toString().toLowerCase();
  const isProcessing = status === "pending" || status === "processing";
  const hasFinalContent = canonicalizeHtml(sourceHtmlRef.current).length > 0;

  const inferPage = data?.output_data?.page || {};
  const inferBlog = inferPage?.blog || {};
  const publishTitle = inferPage?.meta_title || inferBlog?.meta_title || keyword || "Untitled";
  const publishContentId = inferPage?.page_id || pageId;
  const inferSlug = React.useMemo(
    () => (typeof inferPage?.slug === "string" ? String(inferPage.slug).trim() : ""),
    [inferPage?.slug]
  );
  const generatedSlugFallback = React.useMemo(
    () => normalizeWordpressSlugPath(publishTitle || keyword || ""),
    [keyword, publishTitle]
  );
  const generatedSlug = React.useMemo(() => {
    if (inferSlug) return normalizeWordpressSlugPath(inferSlug);
    return generatedSlugFallback;
  }, [generatedSlugFallback, inferSlug]);
  const normalizedEditableSlug = React.useMemo(() => normalizeWordpressSlugPath(editableSlug), [editableSlug]);
  const contentStatusQuery = useWordpressContentStatus(
    wpConnection?.connectionId || null,
    publishContentId ? String(publishContentId) : null
  );
  const persistedContent = contentStatusQuery.data?.content || null;
  const persistedStatus = (persistedContent?.status || "").toLowerCase();
  const isPersistedTrashed = persistedStatus === "trash";
  const persistedSlug = React.useMemo(
    () => normalizeWordpressSlugPath(persistedContent?.slug || ""),
    [persistedContent?.slug]
  );
  const effectiveModalSlug = React.useMemo(() => {
    if (!isPersistedTrashed && persistedSlug) return persistedSlug;
    if (!isPersistedTrashed && lastPublishedData?.slug) return normalizeWordpressSlugPath(lastPublishedData.slug);
    if (generatedSlug) return generatedSlug;
    return generatedSlugFallback;
  }, [generatedSlug, generatedSlugFallback, isPersistedTrashed, lastPublishedData?.slug, persistedSlug]);
  const isPersistedLive = persistedStatus === "publish";
  const isPersistedDraftLike = Boolean(persistedContent && !isPersistedLive && !isPersistedTrashed);
  const hasSlugConflict = Boolean(slugCheckResult?.exists && !slugCheckResult?.sameMappedContent && slugCheckResult?.conflict);
  const slugConflictReason = slugCheckResult?.conflict?.reason || null;
  const isPublishBusy =
    wpPublishMutation.isPending ||
    wpPreviewMutation.isPending ||
    wpUnpublishMutation.isPending;
  const isSlugInputBusy = isPublishBusy || isAutoResolvingSlug;
  const isSlugActionBusy = isPublishBusy || isSlugChecking || isAutoResolvingSlug;
  const publishStateLabel = isPersistedLive
    ? "Live"
    : isPersistedDraftLike
      ? "Draft"
      : isPersistedTrashed
        ? "In Trash"
        : "Not Published";
  const publishStateHint = isPersistedLive
    ? "This content is live on WordPress."
    : isPersistedDraftLike
      ? "A draft exists in WordPress."
      : isPersistedTrashed
        ? "This content was moved to trash."
        : "No WordPress page exists yet.";

  const liveUrl = React.useMemo(() => {
    if (persistedContent?.permalink) return persistedContent.permalink;
    if (lastPublishedData?.permalink) return lastPublishedData.permalink;
    if (isPersistedLive && persistedContent?.wpId && wpConnection?.siteUrl) {
      return `${String(wpConnection.siteUrl).replace(/\/+$/, "")}/?page_id=${persistedContent.wpId}`;
    }
    return null;
  }, [
    isPersistedLive,
    lastPublishedData?.permalink,
    persistedContent?.permalink,
    persistedContent?.wpId,
    wpConnection?.siteUrl,
  ]);
  const publishUrlPreview = React.useMemo(() => {
    const siteUrl = String(wpConnection?.siteUrl || "").replace(/\/+$/, "");
    const slugForPreview = normalizedEditableSlug || normalizeWordpressSlugPath(slugCheckResult?.slug || "");
    if (!siteUrl || !slugForPreview) {
      return null;
    }

    return `${siteUrl}/${slugForPreview}`;
  }, [normalizedEditableSlug, slugCheckResult?.slug, wpConnection?.siteUrl]);
  const extractedStyleColors = React.useMemo(() => {
    const extractedProfile = wpStyleProfileQuery.data?.extractedProfile as
      | { colors?: Record<string, unknown> }
      | undefined;
    return (extractedProfile?.colors || {}) as Record<string, unknown>;
  }, [wpStyleProfileQuery.data?.extractedProfile]);
  const effectiveProfileColors = React.useMemo(() => {
    const profile = wpStyleProfileQuery.data?.profile as
      | { colors?: Record<string, unknown> }
      | undefined;
    return (profile?.colors || {}) as Record<string, unknown>;
  }, [wpStyleProfileQuery.data?.profile]);
  const normalizeAnyColor = React.useCallback((value: unknown) => {
    if (typeof value !== "string") return null;
    return (
      normalizeMassicStyleColorOverrides({ colors: { primary: value } }).colors
        ?.primary || null
    );
  }, []);
  const extractedColorByKey = React.useMemo(() => {
    const next: Partial<Record<MassicStyleColorKey, string>> = {};
    for (const key of MASSIC_STYLE_COLOR_KEYS) {
      const extracted = normalizeAnyColor(extractedStyleColors[key]);
      const profileFallback = normalizeAnyColor(effectiveProfileColors[key]);
      if (extracted) {
        next[key] = extracted;
      } else if (profileFallback) {
        next[key] = profileFallback;
      }
    }
    return next;
  }, [effectiveProfileColors, extractedStyleColors, normalizeAnyColor]);
  const extractedPaletteColors = React.useMemo(() => {
    const candidates: string[] = [];
    for (const value of Object.values(extractedStyleColors || {})) {
      const normalized = normalizeAnyColor(value);
      if (normalized) candidates.push(normalized);
    }
    for (const value of Object.values(effectiveProfileColors || {})) {
      const normalized = normalizeAnyColor(value);
      if (normalized) candidates.push(normalized);
    }
    return Array.from(new Set(candidates));
  }, [effectiveProfileColors, extractedStyleColors, normalizeAnyColor]);
  const visibleStyleColorKeys = showAllStyleColorOptions
    ? [...CORE_STYLE_COLOR_KEYS, ...ADVANCED_STYLE_COLOR_KEYS]
    : CORE_STYLE_COLOR_KEYS;
  const extractedStyleTypography = React.useMemo(() => {
    const extractedProfile = wpStyleProfileQuery.data?.extractedProfile as
      | { typography?: Record<string, unknown> }
      | undefined;
    return (extractedProfile?.typography || {}) as Record<string, unknown>;
  }, [wpStyleProfileQuery.data?.extractedProfile]);
  const effectiveProfileTypography = React.useMemo(() => {
    const profile = wpStyleProfileQuery.data?.profile as
      | { typography?: Record<string, unknown> }
      | undefined;
    return (profile?.typography || {}) as Record<string, unknown>;
  }, [wpStyleProfileQuery.data?.profile]);
  const extractedTypographyByKey = React.useMemo(() => {
    const readTypographyValue = (source: Record<string, unknown>, key: MassicStyleTypographyKey): string | null => {
      if (key === "h1Size") {
        const value = (source.h1 as Record<string, unknown> | undefined)?.size;
        return typeof value === "string" ? value : null;
      }
      if (key === "h2Size") {
        const value = (source.h2 as Record<string, unknown> | undefined)?.size;
        return typeof value === "string" ? value : null;
      }
      if (key === "h3Size") {
        const value = (source.h3 as Record<string, unknown> | undefined)?.size;
        return typeof value === "string" ? value : null;
      }
      const value = source[key];
      return typeof value === "string" ? value : null;
    };

    const next: Partial<Record<MassicStyleTypographyKey, string>> = {};
    for (const key of MASSIC_STYLE_TYPOGRAPHY_KEYS) {
      const extracted = readTypographyValue(extractedStyleTypography, key);
      const fallback = readTypographyValue(effectiveProfileTypography, key);
      if (extracted) {
        next[key] = extracted;
      } else if (fallback) {
        next[key] = fallback;
      }
    }
    return next;
  }, [effectiveProfileTypography, extractedStyleTypography]);
  const normalizedDraftStyleColorOverrides = React.useMemo(
    () => normalizeMassicStyleColorOverrides({ colors: styleColorOverridesDraft }).colors || {},
    [styleColorOverridesDraft]
  );
  const normalizedDraftStyleTypographyOverrides = React.useMemo(
    () => normalizeMassicStyleTypographyOverrides({ typography: styleTypographyOverridesDraft }).typography || {},
    [styleTypographyOverridesDraft]
  );
  const serializedDraftColorOverrides = React.useMemo(
    () => JSON.stringify(normalizedDraftStyleColorOverrides),
    [normalizedDraftStyleColorOverrides]
  );
  const serializedDraftTypographyOverrides = React.useMemo(
    () => JSON.stringify(normalizedDraftStyleTypographyOverrides),
    [normalizedDraftStyleTypographyOverrides]
  );
  const hasUnsavedStyleColorOverrides = serializedDraftColorOverrides !== serializedStoredColorOverrides;
  const hasUnsavedStyleTypographyOverrides = serializedDraftTypographyOverrides !== serializedStoredTypographyOverrides;
  const invalidTypographyKeys = React.useMemo(
    () =>
      VISIBLE_STYLE_TYPOGRAPHY_KEYS.filter((key) => {
        const raw = String(styleTypographyOverridesDraft[key] || "").trim();
        if (!raw) return false;
        return !normalizedDraftStyleTypographyOverrides[key];
      }),
    [normalizedDraftStyleTypographyOverrides, styleTypographyOverridesDraft]
  );
  const hasTypographyValidationErrors = invalidTypographyKeys.length > 0;
  const isStyleOverrideSaving = wpStyleOverridesMutation.isPending;

  const handleStyleOverrideColorChange = React.useCallback((key: MassicStyleColorKey, value: string) => {
    const normalized = normalizeMassicStyleColorOverrides({ colors: { [key]: value } }).colors?.[key];
    if (!normalized) return;
    setStyleColorOverridesDraft(prev => ({
      ...prev,
      [key]: normalized,
    }));
  }, []);
  const handleStyleOverrideTypographyChange = React.useCallback((key: MassicStyleTypographyKey, value: string) => {
    setStyleTypographyOverridesDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetStyleOverrideKey = React.useCallback((key: MassicStyleColorKey) => {
    setStyleColorOverridesDraft(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  const handleSaveStyleColorOverrides = React.useCallback(async () => {
    if (!wpConnection?.connectionId) return;
    const response = await wpStyleOverridesMutation.mutateAsync({
      connectionId: wpConnection.connectionId,
      overrides: {
        colors: normalizedDraftStyleColorOverrides,
        typography: normalizedStoredStyleTypographyOverrides,
      },
    });
    const savedColors = normalizeMassicStyleColorOverrides(response?.data?.styleOverrides || {}).colors || {};
    const savedTypography = normalizeMassicStyleTypographyOverrides(response?.data?.styleOverrides || {}).typography || {};
    setStyleColorOverridesDraft(savedColors);
    setStyleTypographyOverridesDraft(savedTypography);
  }, [
    normalizedDraftStyleColorOverrides,
    normalizedStoredStyleTypographyOverrides,
    wpConnection?.connectionId,
    wpStyleOverridesMutation,
  ]);

  const handleSaveStyleTypographyOverrides = React.useCallback(async () => {
    if (!wpConnection?.connectionId) return;
    if (hasTypographyValidationErrors) return;
    const response = await wpStyleOverridesMutation.mutateAsync({
      connectionId: wpConnection.connectionId,
      overrides: {
        colors: normalizedStoredStyleColorOverrides,
        typography: normalizedDraftStyleTypographyOverrides,
      },
    });
    const savedColors = normalizeMassicStyleColorOverrides(response?.data?.styleOverrides || {}).colors || {};
    const savedTypography = normalizeMassicStyleTypographyOverrides(response?.data?.styleOverrides || {}).typography || {};
    setStyleColorOverridesDraft(savedColors);
    setStyleTypographyOverridesDraft(savedTypography);
  }, [
    hasTypographyValidationErrors,
    normalizedDraftStyleTypographyOverrides,
    normalizedStoredStyleColorOverrides,
    wpConnection?.connectionId,
    wpStyleOverridesMutation,
  ]);

  React.useEffect(() => {
    if (!isPublishModalOpen) return;
    if (isSlugEdited) return;
    setEditableSlug(normalizeWordpressSlugPath(effectiveModalSlug));
  }, [effectiveModalSlug, isPublishModalOpen, isSlugEdited]);

  React.useEffect(() => {
    if (isPublishModalOpen) {
      // Freeze background content polling while publish modal is active.
      setPollingDisabled(true);
      return;
    }

    if (!isEditorFocusedRef.current && !isEditingSessionRef.current) {
      setPollingDisabled(false);
    }
  }, [isPublishModalOpen]);

  React.useEffect(() => {
    if (!isPublishModalOpen || !isWpConnected || !wpConnection?.connectionId || !publishContentId) {
      return;
    }

    void contentStatusQuery.refetch();
  }, [isPublishModalOpen, isWpConnected, publishContentId, wpConnection?.connectionId]);

  React.useEffect(() => {
    if (isPublishModalOpen) return;
    setIsSlugEdited(false);
    setSlugCheckResult(null);
    setSlugCheckError(null);
    setIsAutoResolvingSlug(false);
    lastAutoSlugCheckKeyRef.current = "";
  }, [isPublishModalOpen]);

  const composeCurrentHtml = React.useCallback(() => {
    const mergedText = applyTextEditsToHtml(sourceHtmlRef.current, textNodeIndexRef.current, editsRef.current);
    const mergedLinks = applyLinkEditsToHtml(mergedText, linkIndexRef.current, linkEditsRef.current);
    const mergedSpacing = applySpacingEditsToHtml(mergedLinks, spacingIndexRef.current, spacingEditsRef.current);
    return ensureMassicContentWrapper(sanitizePageHtml(mergedSpacing));
  }, []);

  const updatePageContentRequest = React.useCallback(
    async (content: string) => {
      const endpoint = `/client/update-page-builder-content?business_id=${encodeURIComponent(businessId)}&page_id=${encodeURIComponent(pageId)}`;
      await api.post(
        endpoint,
        "python",
        { content },
        {
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
        }
      );
    },
    [businessId, pageId]
  );

  const runBackgroundRefetch = React.useCallback(
    async (attempt = 0) => {
      const result = await contentQuery.refetch();
      const latestData = result.data;
      if (!latestData) return;

      const serverCanonical = canonicalizeHtml(
        ensureMassicContentWrapper(sanitizePageHtml(resolvePageContent(latestData)))
      );
      const committedCanonical = canonicalizeHtml(lastCommittedHtmlRef.current);
      if (!committedCanonical) return;

      if (serverCanonical === committedCanonical) {
        hasLocalEditsRef.current = false;
        if (
          !isEditorFocusedRef.current &&
          Object.keys(editsRef.current).length === 0 &&
          Object.keys(linkEditsRef.current).length === 0 &&
          Object.keys(spacingEditsRef.current).length === 0 &&
          !isSavingRef.current
        ) {
          isEditingSessionRef.current = false;
          setPollingDisabled(false);
        }
        return;
      }

      if (attempt < 2 && !isEditorFocusedRef.current) {
        window.setTimeout(() => {
          void runBackgroundRefetch(attempt + 1);
        }, 800);
      }
    },
    [contentQuery]
  );

  const flushSave = React.useCallback(
    async (reason: SaveReason) => {
      const nextHtml = composeCurrentHtml();
      if (!nextHtml) return;
      if (canonicalizeHtml(nextHtml) === canonicalizeHtml(lastSavedHtmlRef.current)) return;
      hasLocalEditsRef.current = true;
      isEditingSessionRef.current = true;

      if (isSavingRef.current) {
        queuedSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;
      const submittedEdits = { ...editsRef.current };
      const submittedLinkEdits = { ...linkEditsRef.current };
      const submittedSpacingEdits = { ...spacingEditsRef.current };
      try {
        await updatePageContentRequest(nextHtml);
        sourceHtmlRef.current = nextHtml;
        lastSavedHtmlRef.current = canonicalizeHtml(nextHtml);
        lastCommittedHtmlRef.current = canonicalizeHtml(nextHtml);
        // Keep newer edits typed while this save was in-flight.
        const remainingEdits = { ...editsRef.current };
        for (const [id, value] of Object.entries(submittedEdits)) {
          if (remainingEdits[id] === value) {
            delete remainingEdits[id];
          }
        }
        editsRef.current = remainingEdits;

        const remainingLinkEdits = { ...linkEditsRef.current };
        for (const [id, value] of Object.entries(submittedLinkEdits)) {
          if (remainingLinkEdits[id] === value) {
            delete remainingLinkEdits[id];
          }
        }
        linkEditsRef.current = remainingLinkEdits;

        const remainingSpacingEdits = { ...spacingEditsRef.current };
        for (const [id, value] of Object.entries(submittedSpacingEdits)) {
          if (areSpacingValuesEqual(remainingSpacingEdits[id], value)) {
            delete remainingSpacingEdits[id];
          }
        }
        spacingEditsRef.current = remainingSpacingEdits;

        // Commit local HTML into rendered preview so rerenders cannot snap back.
        if (!isEditorFocusedRef.current) {
          const committedModel = buildEditableHtmlModel(nextHtml);
          textNodeIndexRef.current = committedModel.textNodeIndex;
          linkIndexRef.current = committedModel.linkIndex;
          spacingIndexRef.current = committedModel.spacingIndex;
          setTextNodeIndex(committedModel.textNodeIndex);
          setPreviewHtml(committedModel.previewHtml);
        }

        if (isEditorFocusedRef.current && reason === "debounce") {
          pendingBackgroundRefetchRef.current = true;
        } else {
          pendingBackgroundRefetchRef.current = false;
          window.setTimeout(() => {
            void runBackgroundRefetch();
          }, 500);
        }
        if (reason === "blur") {
          toast.success("Changes Saved");
        }
      } catch {
        toast.error("Failed to save changes to server");
      } finally {
        isSavingRef.current = false;
        if (queuedSaveRef.current) {
          queuedSaveRef.current = false;
          void flushSave("debounce");
        }
      }
    },
    [composeCurrentHtml, runBackgroundRefetch, updatePageContentRequest]
  );

  const scheduleDebouncedSave = React.useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void flushSave("debounce");
    }, 1200);
  }, [flushSave]);

  React.useEffect(() => {
    if (!data) return;

    const nextStatus = (data?.status || "").toString().toLowerCase();
    const previousStatus = lastStatusRef.current;
    const wasPolling = previousStatus === "pending" || previousStatus === "processing";
    const isPolling = nextStatus === "pending" || nextStatus === "processing";
    const transitionedFromPollingToTerminal = wasPolling && !isPolling;
    const rawPage = resolvePageContent(data);
    const sanitized = ensureMassicContentWrapper(sanitizePageHtml(rawPage));
    const serverCanonical = canonicalizeHtml(sanitized);
    const localCanonical = canonicalizeHtml(lastSavedHtmlRef.current);
    const hasPendingEdits =
      Object.keys(editsRef.current).length > 0 ||
      Object.keys(linkEditsRef.current).length > 0 ||
      Object.keys(spacingEditsRef.current).length > 0;
    const localChangeInProgress = hasLocalEditsRef.current || hasPendingEdits || isSavingRef.current;
    const serverMatchesLocal = localCanonical.length > 0 && serverCanonical === localCanonical;

    if (isEditingSessionRef.current) {
      if (serverMatchesLocal && !hasPendingEdits && !isSavingRef.current && !isEditorFocusedRef.current) {
        hasLocalEditsRef.current = false;
        isEditingSessionRef.current = false;
        setPollingDisabled(false);
      }
      lastStatusRef.current = nextStatus;
      return;
    }

    // Guard against stale GET responses overwriting local edits.
    if (localChangeInProgress && !serverMatchesLocal) {
      lastStatusRef.current = nextStatus;
      return;
    }

    if (serverMatchesLocal) {
      hasLocalEditsRef.current = false;
    }

    const shouldSyncFromServer =
      !isEditorFocusedRef.current && (isInitialLoadRef.current || isPolling || transitionedFromPollingToTerminal);

    lastStatusRef.current = nextStatus;
    if (!shouldSyncFromServer) return;
    const model = buildEditableHtmlModel(sanitized);

    sourceHtmlRef.current = sanitized;
    textNodeIndexRef.current = model.textNodeIndex;
    linkIndexRef.current = model.linkIndex;
    spacingIndexRef.current = model.spacingIndex;
    editsRef.current = {};
    linkEditsRef.current = {};
    spacingEditsRef.current = {};
    lastSavedHtmlRef.current = canonicalizeHtml(sanitized);
    setTextNodeIndex(model.textNodeIndex);
    setPreviewHtml(model.previewHtml);
    setActiveLinkEditor(null);
    setLinkHrefDraft("");
    setLinkHrefError(null);
    setActiveSpacingEditor(null);
    setSpacingDraft(createEmptySpacingValue());

    if (isInitialLoadRef.current) {
      window.setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 250);
    }
  }, [data]);

  React.useEffect(() => {
    const nextStatus = (data?.status || "").toString().toLowerCase();
    if (nextStatus !== "pending" && !isEditingSessionRef.current) {
      setPollingDisabled(false);
    }
  }, [data?.status]);

  React.useEffect(() => {
    if (!data) return;
    const nextStatus = (data?.status || "").toString().toLowerCase();
    if (nextStatus !== "pending") return;

    const timeout = window.setTimeout(() => {
      setPollingDisabled(true);
      toast.warning("Generation seems to be stuck. Please try again.");
    }, 300000);

    return () => window.clearTimeout(timeout);
  }, [data?.status]);

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      void flushSave("unmount");
    };
  }, [flushSave]);

  const openEmbeddedPreview = React.useCallback((url: string, title: string) => {
    if (!url) return;
    setEmbeddedPreviewUrl(url);
    setEmbeddedPreviewTitle(title);
    setIsEmbeddedPreviewLoading(true);
    setShowEmbedFallbackHint(false);
    setPreviewViewport("desktop");
    setIsEmbeddedPreviewOpen(true);
  }, []);

  React.useEffect(() => {
    if (!isEmbeddedPreviewOpen || !isEmbeddedPreviewLoading) return;
    const timer = window.setTimeout(() => {
      setShowEmbedFallbackHint(true);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [isEmbeddedPreviewLoading, isEmbeddedPreviewOpen]);

  const runSlugCheck = React.useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!isWpConnected || !wpConnection?.connectionId || !publishContentId) {
      return null;
    }

    if (!normalizedEditableSlug) {
      setSlugCheckResult(null);
      setSlugCheckError("Slug is required.");
      lastAutoSlugCheckKeyRef.current = "";
      return null;
    }

    const checkKey = `${wpConnection.connectionId}:${String(publishContentId)}:page:${normalizedEditableSlug}`;
    if (!force && lastAutoSlugCheckKeyRef.current === checkKey) {
      return null;
    }

    if (!force) {
      lastAutoSlugCheckKeyRef.current = checkKey;
    }

    setIsSlugChecking(true);
    setSlugCheckError(null);

    try {
      const response = await slugCheckMutateAsync({
        connectionId: String(wpConnection.connectionId),
        contentId: String(publishContentId),
        type: "page",
        slug: normalizedEditableSlug,
      });

      const result = response?.data || null;
      setSlugCheckResult(result);
      return result;
    } catch (error: any) {
      const message = error?.message || "Failed to check slug in WordPress.";
      setSlugCheckResult(null);
      setSlugCheckError(message);
      return null;
    } finally {
      setIsSlugChecking(false);
    }
  }, [
    isWpConnected,
    normalizedEditableSlug,
    publishContentId,
    slugCheckMutateAsync,
    wpConnection?.connectionId,
  ]);

  React.useEffect(() => {
    if (!isPublishModalOpen || !isWpConnected || !wpConnection?.connectionId || !publishContentId) {
      return;
    }

    if (!normalizedEditableSlug) {
      setSlugCheckResult(null);
      setSlugCheckError(isSlugEdited ? "Slug is required." : null);
      lastAutoSlugCheckKeyRef.current = "";
      return;
    }

    const delayMs = isSlugEdited ? 350 : 0;
    const timer = window.setTimeout(() => {
      void runSlugCheck();
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    isPublishModalOpen,
    isWpConnected,
    isSlugEdited,
    normalizedEditableSlug,
    publishContentId,
    runSlugCheck,
    wpConnection?.connectionId,
  ]);

  const buildPublishPayload = React.useCallback(
    (targetStatus: "draft" | "publish") => {
      const safeHtml = composeCurrentHtml();
      return {
        connectionId: String(wpConnection?.connectionId || ""),
        status: targetStatus,
        workflowSource: "infer_ai" as const,
        workflowPayload: data || {},
        contentId: String(publishContentId),
        type: "page" as const,
        title: String(publishTitle),
        slug: normalizedEditableSlug || null,
        contentHtml: safeHtml,
        excerpt: null,
        head: {
          title: String(publishTitle),
        },
      };
    },
    [composeCurrentHtml, data, normalizedEditableSlug, publishContentId, publishTitle, wpConnection?.connectionId]
  );

  const handleRedirectToChannels = React.useCallback(() => {
    router.push(`/business/${businessId}/web?integrations=1`);
    setIsPublishModalOpen(false);
  }, [businessId, router]);

  const handlePublishDraft = React.useCallback(async () => {
    if (!isWpConnected || !wpConnection?.connectionId) return;
    if (!hasFinalContent) return;

    let publishResult;
    try {
      publishResult = await wpPublishMutation.mutateAsync(buildPublishPayload("draft"));
    } catch (error) {
      const publishError = error as WordpressPublishError;
      if (publishError?.code === "slug_conflict") {
        const details = publishError?.details || {};
        const conflictReason =
          typeof details?.reason === "string"
            ? details.reason
            : ((details?.conflict as WordpressSlugConflictInfo | null)?.reason || null);
        const conflictMessage = conflictReason === "parent_type_conflict"
          ? "This nested page path is blocked because a parent segment already belongs to non-page content."
          : "This slug already exists in WordPress. Use the suggested slug or edit manually.";
        setSlugCheckResult({
          slug: normalizedEditableSlug,
          publishUrl: publishUrlPreview || null,
          exists: true,
          sameMappedContent: false,
          conflict: (details?.conflict as WordpressSlugConflictInfo) || null,
          suggestedSlug: typeof details?.suggestedSlug === "string" ? details.suggestedSlug : null,
          mappedToDifferentContent: false,
          mappedContentId: null,
        });
        setSlugCheckError(conflictMessage);
        toast.error(conflictReason === "parent_type_conflict" ? "Nested parent path conflict" : "Slug conflict: choose a unique slug");
      }
      return;
    }

    const published = publishResult?.data;
    if (!published) return;
    setLastPublishedData({
      contentId: published.contentId,
      wpId: published.wpId,
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "draft",
      slug: published.slug || normalizedEditableSlug || null,
    });
    toast.success("Draft pushed to WordPress");

    const previewResult = await wpPreviewMutation.mutateAsync({
      connectionId: wpConnection.connectionId,
      contentId: published.contentId,
      wpId: published.wpId,
    });

    const previewUrl = previewResult?.data?.previewUrl;
    if (previewUrl) {
      setLastPublishedData((prev) =>
        prev
          ? {
            ...prev,
            previewUrl,
          }
          : prev
      );
      openEmbeddedPreview(previewUrl, "WordPress Draft Preview");
      toast.success("Preview ready");
    }
    void contentStatusQuery.refetch();
  }, [
    buildPublishPayload,
    contentStatusQuery,
    hasFinalContent,
    isWpConnected,
    openEmbeddedPreview,
    wpConnection?.connectionId,
    wpPreviewMutation,
    wpPublishMutation,
  ]);

  const handlePublishLive = React.useCallback(async () => {
    if (!isWpConnected || !wpConnection?.connectionId) return;
    if (!hasFinalContent) return;
    if (!isPersistedDraftLike && !lastPublishedData?.wpId) {
      toast.error("Publish draft first to generate a preview");
      return;
    }

    let publishResult;
    try {
      publishResult = await wpPublishMutation.mutateAsync(buildPublishPayload("publish"));
    } catch (error) {
      const publishError = error as WordpressPublishError;
      if (publishError?.code === "slug_conflict") {
        const details = publishError?.details || {};
        const conflictReason =
          typeof details?.reason === "string"
            ? details.reason
            : ((details?.conflict as WordpressSlugConflictInfo | null)?.reason || null);
        const conflictMessage = conflictReason === "parent_type_conflict"
          ? "This nested page path is blocked because a parent segment already belongs to non-page content."
          : "This slug already exists in WordPress. Use the suggested slug or edit manually.";
        setSlugCheckResult({
          slug: normalizedEditableSlug,
          publishUrl: publishUrlPreview || null,
          exists: true,
          sameMappedContent: false,
          conflict: (details?.conflict as WordpressSlugConflictInfo) || null,
          suggestedSlug: typeof details?.suggestedSlug === "string" ? details.suggestedSlug : null,
          mappedToDifferentContent: false,
          mappedContentId: null,
        });
        setSlugCheckError(conflictMessage);
        toast.error(conflictReason === "parent_type_conflict" ? "Nested parent path conflict" : "Slug conflict: choose a unique slug");
      }
      return;
    }

    const published = publishResult?.data;
    if (!published) return;
    setLastPublishedData((prev) => ({
      contentId: published.contentId,
      wpId: published.wpId,
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "publish",
      slug: published.slug || normalizedEditableSlug || null,
      previewUrl: prev?.previewUrl,
    }));

    toast.success("Published live to WordPress");
    void contentStatusQuery.refetch();
    setIsPublishModalOpen(false);
  }, [
    buildPublishPayload,
    contentStatusQuery,
    hasFinalContent,
    isPersistedDraftLike,
    isWpConnected,
    lastPublishedData?.wpId,
    wpConnection?.connectionId,
    wpPublishMutation,
  ]);

  const handleOpenPreview = React.useCallback(async () => {
    const wpIdToUse = persistedContent?.wpId || lastPublishedData?.wpId;
    if (!wpConnection?.connectionId || !wpIdToUse) {
      toast.error("Draft not found for preview");
      return;
    }

    const previewResult = await wpPreviewMutation.mutateAsync({
      connectionId: wpConnection.connectionId,
      contentId: String(publishContentId),
      wpId: Number(wpIdToUse),
    });

    const previewUrl = previewResult?.data?.previewUrl;
    if (!previewUrl) return;

    setLastPublishedData((prev) =>
      prev
        ? {
          ...prev,
          previewUrl,
        }
        : {
          contentId: String(publishContentId),
          wpId: Number(wpIdToUse),
          permalink: persistedContent?.permalink || null,
          editUrl: null,
          status: persistedStatus || "draft",
          slug: persistedContent?.slug || normalizedEditableSlug || null,
          previewUrl,
        }
    );
    openEmbeddedPreview(previewUrl, "WordPress Draft Preview");
  }, [
    lastPublishedData?.wpId,
    openEmbeddedPreview,
    persistedContent?.permalink,
    persistedContent?.wpId,
    persistedStatus,
    publishContentId,
    wpConnection?.connectionId,
    wpPreviewMutation,
  ]);

  const handleChangeWordpressStatus = React.useCallback(async (targetStatus: "draft" | "trash") => {
    if (!isWpConnected || !wpConnection?.connectionId) return;
    if (!publishContentId) return;

    const response = await wpUnpublishMutation.mutateAsync({
      connectionId: String(wpConnection.connectionId),
      contentId: String(publishContentId),
      targetStatus,
    });
    const unpublishData = response?.data;

    if (unpublishData) {
      setLastPublishedData((prev) =>
        prev
          ? {
            ...prev,
            status: unpublishData.status || targetStatus,
            permalink: null,
            previewUrl: undefined,
          }
          : prev
      );
    }

    setIsEmbeddedPreviewOpen(false);
    toast.success(targetStatus === "trash" ? "Deleted in WordPress (moved to trash)" : "Moved to draft in WordPress");
    await contentStatusQuery.refetch();
    if (targetStatus === "trash") {
      setIsPublishModalOpen(false);
    }
  }, [
    contentStatusQuery,
    isWpConnected,
    publishContentId,
    wpConnection?.connectionId,
    wpUnpublishMutation,
  ]);

  const handleCopyText = async () => {
    const safeHtml = composeCurrentHtml();
    const plainText = extractPlainTextFromHtml(safeHtml);
    const ok = await copyToClipboard(plainText);
    if (ok) toast.success("Text copied");
    else toast.error("Copy failed");
  };

  const handleCopyHtml = async () => {
    const safeHtml = composeCurrentHtml();
    const baseCss = await getMassicCssText();
    const styledHtml = buildStyledMassicHtml(safeHtml, {
      baseCss,
      cssVarOverrides,
    });

    if (!styledHtml) {
      toast.error("Nothing to copy");
      return;
    }

    try {
      if (typeof ClipboardItem !== "undefined") {
        const clipboardItem = new ClipboardItem({
          "text/html": new Blob([styledHtml], { type: "text/html" }),
          "text/plain": new Blob([styledHtml], { type: "text/plain" }),
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        await copyToClipboard(styledHtml);
      }
      toast.success("HTML copied with styles");
    } catch {
      const ok = await copyToClipboard(styledHtml);
      if (ok) toast.success("HTML copied with styles");
      else toast.error("Copy failed");
    }
  };

  const resolveSpacingLabel = React.useCallback((ref: EditableSpacingRef | undefined) => {
    if (!ref) return "Container";
    const rawClasses = String(ref.className || "")
      .split(/\s+/)
      .map((name) => name.trim())
      .filter(Boolean);
    const preferredClass = rawClasses.find((className) => className.startsWith("massic-")) || rawClasses[0];
    if (preferredClass) {
      return `${ref.tagName}.${preferredClass}`;
    }
    return ref.tagName;
  }, []);

  const setClassNameOnPreviewSpacingTarget = React.useCallback((spacingId: string, className: string) => {
    const target = previewContainerRef.current?.querySelector(
      `[data-massic-spacing-id="${spacingId}"]`
    ) as HTMLElement | null;
    if (!target) return;
    if (className) {
      target.setAttribute("class", className);
    } else {
      target.removeAttribute("class");
    }
  }, []);

  const closeActiveSpacingEditor = React.useCallback(() => {
    setActiveSpacingEditor(null);
    setSpacingDraft(createEmptySpacingValue());
    setHoveredSpacingId(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  const cancelActiveSpacingEditor = React.useCallback(() => {
    if (activeSpacingEditor?.id) {
      setClassNameOnPreviewSpacingTarget(activeSpacingEditor.id, activeSpacingEditor.baseClassName);
    }
    closeActiveSpacingEditor();
  }, [activeSpacingEditor, closeActiveSpacingEditor, setClassNameOnPreviewSpacingTarget]);

  const closeActiveLinkEditor = React.useCallback(() => {
    setActiveLinkEditor(null);
    setLinkHrefError(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  React.useEffect(() => {
    if (previewEditMode === "spacing") {
      setActiveLinkEditor(null);
      setLinkHrefError(null);
      return;
    }
    cancelActiveSpacingEditor();
  }, [cancelActiveSpacingEditor, previewEditMode]);

  React.useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const previousActive = container.querySelectorAll("[data-massic-spacing-selected='true']");
    previousActive.forEach((node) => {
      (node as HTMLElement).removeAttribute("data-massic-spacing-selected");
    });

    if (!activeSpacingEditor?.id) return;
    const nextActive = container.querySelector(`[data-massic-spacing-id="${activeSpacingEditor.id}"]`) as HTMLElement | null;
    if (!nextActive) return;
    nextActive.setAttribute("data-massic-spacing-selected", "true");
  }, [activeSpacingEditor?.id, previewHtml]);

  React.useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const previousHovered = container.querySelectorAll("[data-massic-spacing-hovered='true']");
    previousHovered.forEach((node) => {
      (node as HTMLElement).removeAttribute("data-massic-spacing-hovered");
    });

    if (!hoveredSpacingId) return;
    const nextHovered = container.querySelector(`[data-massic-spacing-id="${hoveredSpacingId}"]`) as HTMLElement | null;
    if (!nextHovered) return;
    nextHovered.setAttribute("data-massic-spacing-hovered", "true");
  }, [hoveredSpacingId, previewHtml]);

  React.useEffect(() => {
    if (previewEditMode !== "spacing") return;
    if (!activeSpacingEditor?.id) return;

    const nextClassName = mergeSpacingUtilityClasses(activeSpacingEditor.baseClassName, spacingDraft);
    setClassNameOnPreviewSpacingTarget(activeSpacingEditor.id, nextClassName);
  }, [
    activeSpacingEditor?.baseClassName,
    activeSpacingEditor?.id,
    hoveredSpacingId,
    previewEditMode,
    previewHtml,
    setClassNameOnPreviewSpacingTarget,
    spacingDraft,
  ]);

  const handlePreviewClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest("[data-massic-link-editor='true']")) {
      return;
    }
    if (target.closest("[data-massic-spacing-editor='true']")) {
      return;
    }

    const anyAnchor = getAnyAnchorElement(target);
    if (anyAnchor) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (previewEditMode === "spacing") {
      const spacingTarget = getEditableSpacingElement(target);
      if (!spacingTarget) {
        if (activeSpacingEditor) {
          cancelActiveSpacingEditor();
        }
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const spacingId = spacingTarget.dataset.massicSpacingId;
      if (!spacingId || !previewContainerRef.current) return;
      const baseClassName = String(spacingTarget.getAttribute("class") || "");
      const baseSpacingValue = parseEditableSpacingValueFromClassName(baseClassName);

      if (activeSpacingEditor?.id && activeSpacingEditor.id !== spacingId) {
        setClassNameOnPreviewSpacingTarget(activeSpacingEditor.id, activeSpacingEditor.baseClassName);
      }

      const container = previewContainerRef.current;
      const targetRect = spacingTarget.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const nextLeft = Math.max(
        8,
        Math.min(targetRect.left - containerRect.left + container.scrollLeft, container.scrollWidth - 292)
      );
      const nextTop = Math.max(8, targetRect.bottom - containerRect.top + container.scrollTop + 8);

      const spacingRef = spacingIndexRef.current.find((item) => item.id === spacingId);
      setSpacingDraft(baseSpacingValue);
      setActiveSpacingEditor({
        id: spacingId,
        left: Number.isFinite(nextLeft) ? nextLeft : 8,
        top: Number.isFinite(nextTop) ? nextTop : 8,
        label: resolveSpacingLabel(spacingRef),
        baseClassName,
      });
      setHoveredSpacingId(spacingId);
      isEditorFocusedRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) {
        setPollingDisabled(true);
      }
      return;
    }

    const anchor = getEditableLinkElement(target);
    if (!anchor) {
      if (activeLinkEditor) {
        closeActiveLinkEditor();
      }
      return;
    }

    const linkId = anchor.dataset.massicLinkId;
    if (!linkId || !previewContainerRef.current) return;

    const container = previewContainerRef.current;
    const anchorRect = anchor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const anchorLeft = anchorRect.left - containerRect.left + container.scrollLeft;
    const anchorTop = anchorRect.bottom - containerRect.top + container.scrollTop + 8;
    const nextLeft = Math.max(8, Math.min(anchorLeft, container.scrollWidth - 308));
    const nextTop = Math.max(8, anchorTop);

    const linkRef = linkIndexRef.current.find((item) => item.id === linkId);
    const currentHref = normalizeEditableLinkHref(
      Object.prototype.hasOwnProperty.call(linkEditsRef.current, linkId)
        ? linkEditsRef.current[linkId]
        : (linkRef?.href || anchor.getAttribute("href") || "")
    );

    setActiveLinkEditor({
      id: linkId,
      left: Number.isFinite(nextLeft) ? nextLeft : 8,
      top: Number.isFinite(nextTop) ? nextTop : 8,
      label: linkRef?.label || (anchor.textContent || "").trim() || "Link",
    });
    setLinkHrefDraft(currentHref);
    setLinkHrefError(null);
    isEditorFocusedRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) {
      setPollingDisabled(true);
    }
  }, [
    activeLinkEditor,
    activeSpacingEditor,
    closeActiveLinkEditor,
    closeActiveSpacingEditor,
    pollingDisabled,
    previewEditMode,
    setClassNameOnPreviewSpacingTarget,
    resolveSpacingLabel,
    cancelActiveSpacingEditor,
  ]);

  const handlePreviewAuxClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = getAnyAnchorElement(event.target);
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handlePreviewMouseMoveCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (previewEditMode !== "spacing") return;
    if (activeSpacingEditor?.id) {
      // Keep hover/selection locked to the active edited target while previewing draft spacing values.
      const lockedId = activeSpacingEditor.id;
      setHoveredSpacingId((prev) => (prev === lockedId ? prev : lockedId));
      return;
    }
    const target = getEditableSpacingElement(event.target);
    const nextHoveredId = target?.dataset.massicSpacingId || null;
    setHoveredSpacingId((prev) => (prev === nextHoveredId ? prev : nextHoveredId));
  }, [activeSpacingEditor?.id, previewEditMode]);

  const handlePreviewMouseLeaveCapture = React.useCallback(() => {
    if (previewEditMode !== "spacing") return;
    if (activeSpacingEditor?.id) {
      setHoveredSpacingId((prev) => (prev === activeSpacingEditor.id ? prev : activeSpacingEditor.id));
      return;
    }
    setHoveredSpacingId(null);
  }, [activeSpacingEditor?.id, previewEditMode]);

  const syncSpacingIndexEntry = React.useCallback((spacingId: string, spacingValue: EditableSpacingValue, className: string) => {
    spacingIndexRef.current = spacingIndexRef.current.map((entry) => {
      if (entry.id !== spacingId) return entry;
      return {
        ...entry,
        className,
        outsideTop: spacingValue.outsideTop,
        outsideBottom: spacingValue.outsideBottom,
      };
    });
  }, []);

  const setSpacingPresetValue = React.useCallback((key: keyof EditableSpacingValue, nextValue: string) => {
    if (nextValue === "") {
      setSpacingDraft((prev) => ({
        ...prev,
        [key]: null,
      }));
      return;
    }
    if (nextValue === SPACING_CUSTOM_OPTION_VALUE) {
      setSpacingDraft((prev) => {
        const current = prev[key];
        const customPx = parseSpacingNumberToken(current) ?? 0;
        return {
          ...prev,
          [key]: toSpacingNumberToken(customPx),
        };
      });
      return;
    }
    const parsedPreset = Number(nextValue);
    if (!Number.isFinite(parsedPreset)) return;
    setSpacingDraft((prev) => ({
      ...prev,
      [key]: toSpacingNumberToken(parsedPreset),
    }));
  }, []);

  const setSpacingCustomPxValue = React.useCallback((key: keyof EditableSpacingValue, rawValue: string) => {
    const pxValue = parseSpacingNumberInput(rawValue);
    setSpacingDraft((prev) => ({
      ...prev,
      [key]: pxValue == null ? null : toSpacingNumberToken(pxValue),
    }));
  }, []);

  const saveActiveSpacingValue = React.useCallback(async (nextValue: EditableSpacingValue) => {
    const active = activeSpacingEditor;
    if (!active) return;
    const nextClassName = mergeSpacingUtilityClasses(active.baseClassName, nextValue);

    spacingEditsRef.current = {
      ...spacingEditsRef.current,
      [active.id]: nextValue,
    };

    setClassNameOnPreviewSpacingTarget(active.id, nextClassName);
    syncSpacingIndexEntry(active.id, nextValue, nextClassName);
    closeActiveSpacingEditor();

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await flushSave("blur");
  }, [activeSpacingEditor, closeActiveSpacingEditor, flushSave, setClassNameOnPreviewSpacingTarget, syncSpacingIndexEntry]);

  const handleApplySpacingForActiveTarget = React.useCallback(async () => {
    await saveActiveSpacingValue(spacingDraft);
  }, [saveActiveSpacingValue, spacingDraft]);

  const handleResetSpacingForActiveTarget = React.useCallback(async () => {
    await saveActiveSpacingValue(createEmptySpacingValue());
  }, [saveActiveSpacingValue]);

  const saveActiveLinkHref = React.useCallback(async (nextHrefInput: string) => {
    const active = activeLinkEditor;
    if (!active) return;

    const normalizedHref = normalizeEditableLinkHref(nextHrefInput);
    if (normalizedHref && !isSafeEditableLinkHref(normalizedHref)) {
      setLinkHrefError("Enter a valid URL (https://, mailto:, tel:, /path, #anchor).");
      return;
    }

    linkEditsRef.current = {
      ...linkEditsRef.current,
      [active.id]: normalizedHref,
    };

    if (previewContainerRef.current) {
      const selector = `a[data-massic-link-id="${active.id}"]`;
      const linkEl = previewContainerRef.current.querySelector(selector) as HTMLAnchorElement | null;
      if (linkEl) {
        if (normalizedHref) {
          linkEl.setAttribute("href", normalizedHref);
        } else {
          linkEl.removeAttribute("href");
        }
      }
    }

    setLinkHrefDraft(normalizedHref);
    setLinkHrefError(null);
    closeActiveLinkEditor();

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await flushSave("blur");
  }, [activeLinkEditor, closeActiveLinkEditor, flushSave]);

  const handleSaveActiveLinkHref = React.useCallback(async () => {
    await saveActiveLinkHref(linkHrefDraft);
  }, [linkHrefDraft, saveActiveLinkHref]);

  const handleRemoveActiveLinkHref = React.useCallback(async () => {
    await saveActiveLinkHref("");
  }, [saveActiveLinkHref]);

  const handleInputCapture = (event: React.FormEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    if (!isEditableSpan(event.target)) return;
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    editsRef.current = updateEditFromElement(editsRef.current, event.target);
    scheduleDebouncedSave();
  };

  const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    if (!isEditableSpan(event.target)) return;
    editsRef.current = updateEditFromElement(editsRef.current, event.target);

    const nextTarget = event.relatedTarget as HTMLElement | null;
    const movingWithinEditable = Boolean(nextTarget?.dataset?.massicTextId);
    if (!movingWithinEditable) {
      isEditorFocusedRef.current = false;
      // Snapshot current edited DOM immediately to avoid any intermediate rerender rollback.
      if (previewContainerRef.current) {
        setPreviewHtml(previewContainerRef.current.innerHTML);
      }
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void flushSave("blur").finally(() => {
        if (pendingBackgroundRefetchRef.current && !isEditorFocusedRef.current) {
          pendingBackgroundRefetchRef.current = false;
          void runBackgroundRefetch();
        }
      });
    }
  };

  const handleFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    if (!isEditableSpan(event.target)) return;
    isEditorFocusedRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) {
      setPollingDisabled(true);
    }
  };

  const handlePasteCapture = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    if (!isEditableSpan(event.target)) return;
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    insertPlainTextAtCursor(text);
  };

  const handleKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (previewEditMode === "spacing") {
      if (activeSpacingEditor && event.key === "Escape") {
        event.preventDefault();
        cancelActiveSpacingEditor();
      }
      return;
    }

    if (activeLinkEditor && event.key === "Escape") {
      event.preventDefault();
      closeActiveLinkEditor();
      return;
    }

    const anchorTarget = getAnyAnchorElement(event.target);
    if (anchorTarget && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!isEditableSpan(event.target)) return;
    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && ["b", "i", "u", "k"].includes(key)) {
      event.preventDefault();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      insertPlainTextAtCursor("\n");
    }
  };

  const confirmAndRunPublishAction = React.useCallback(async () => {
    const action = confirmPublishAction;
    setConfirmPublishAction(null);
    if (!action) return;

    if (!normalizedEditableSlug) {
      setSlugCheckError("Slug is required.");
      toast.error("Slug is required before publishing");
      return;
    }

    const check = await runSlugCheck({ force: true });
    if (!check) {
      return;
    }

    const hasBlockingConflict = Boolean(check.exists && !check.sameMappedContent && check.conflict);
    if (hasBlockingConflict) {
      const conflictReason = check?.conflict?.reason || null;
      const conflictMessage = conflictReason === "parent_type_conflict"
        ? "This nested page path is blocked because a parent segment already belongs to non-page content."
        : "This slug already exists in WordPress. Use the suggested slug or edit manually.";
      setSlugCheckError(conflictMessage);
      toast.error(conflictReason === "parent_type_conflict" ? "Nested parent path conflict" : "Slug conflict: choose a unique slug");
      return;
    }

    if (action === "draft") {
      await handlePublishDraft();
      return;
    }

    await handlePublishLive();
  }, [confirmPublishAction, handlePublishDraft, handlePublishLive, normalizedEditableSlug, runSlugCheck]);

  const autoResolveSlug = React.useCallback(async () => {
    const suggestedSlug = slugCheckResult?.suggestedSlug || null;
    if (!suggestedSlug) {
      toast.error("No suggested slug available");
      return;
    }

    setIsAutoResolvingSlug(true);
    const normalizedSuggestion = normalizeWordpressSlugPath(suggestedSlug);
    setEditableSlug(normalizedSuggestion);
    setIsSlugEdited(true);
    setSlugCheckError(null);
    toast.success(`Slug updated to ${wordpressSlugToDisplay(normalizedSuggestion, "/untitled-page")}`);
    setIsAutoResolvingSlug(false);
  }, [slugCheckResult?.suggestedSlug]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Typography variant="muted" className="text-xs">
            {searchParams.get("totalPages") ? `${searchParams.get("totalPages")} total pages` : ""}
          </Typography>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Typography variant="h4">Page</Typography>
            {keyword ? (
              <Typography variant="muted" className="mt-1">
                {keyword}
              </Typography>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCopyHtml} disabled={isProcessing}>
              <Copy className="h-4 w-4" />
              Copy HTML
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleCopyText} disabled={isProcessing}>
              <Copy className="h-4 w-4" />
              Copy Text
            </Button>
            <Button
              className="gap-2"
              type="button"
              onClick={() => setIsPublishModalOpen(true)}
              disabled={isProcessing || !hasFinalContent}
            >
              <Globe className="h-4 w-4" />
              Actions
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {isProcessing ? (
          <Card className="p-4">
            <Typography>
              We’re generating your content. This may take 1-3 minutes. Please wait
              <span className="dot-animate"> ...</span>
            </Typography>
            <style>{`
              .dot-animate { display: inline-block; width: 1.5em; text-align: left; }
              .dot-animate::after { content: ''; animation: dots 1.2s steps(3, end) infinite; }
              @keyframes dots { 0%, 20% { content: ''; } 40% { content: '.'; } 60% { content: '..'; } 80%, 100% { content: '...'; } }
            `}</style>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card className="p-4">
            <Typography variant="h5" className="text-destructive">
              Error Loading Content
            </Typography>
            <Typography className="mt-2">{data?.message || "There was a problem loading the content."}</Typography>
          </Card>
        ) : null}

        {!isProcessing && status !== "error" && isWaitingForStyleProfilePreview ? (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading style profile for preview...</span>
            </div>
          </Card>
        ) : null}

        {!isProcessing && status !== "error" && !isWaitingForStyleProfilePreview ? (
          <Card className="p-0">
            <div className="sticky top-0 z-30 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Typography variant="muted" className="text-xs">
                  {previewEditMode === "text"
                    ? "Text + link editing is enabled. HTML structure and classes are preserved."
                    : "Spacing mode is enabled. Hover a container and click to adjust top/bottom spacing with presets or custom px."}
                </Typography>
                <div className="inline-flex items-center rounded-md border border-border p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={previewEditMode === "text" ? "default" : "ghost"}
                    className="h-7 px-2 text-xs"
                    onClick={() => setPreviewEditMode("text")}
                  >
                    Text
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewEditMode === "spacing" ? "default" : "ghost"}
                    className="h-7 px-2 text-xs"
                    onClick={() => setPreviewEditMode("spacing")}
                  >
                    Spacing
                  </Button>
                </div>
              </div>
            </div>
            <div className="relative p-4 pt-3">
              <div
                ref={previewContainerRef}
                className={cn(
                  "massic-html-preview min-h-[420px] overflow-auto rounded-md border bg-background p-4",
                  previewEditMode === "spacing" ? "massic-mode-spacing" : "massic-mode-text"
                )}
                style={previewStyleVars}
                onClickCapture={handlePreviewClickCapture}
                onAuxClickCapture={handlePreviewAuxClickCapture}
                onMouseMoveCapture={handlePreviewMouseMoveCapture}
                onMouseLeave={handlePreviewMouseLeaveCapture}
                onInputCapture={handleInputCapture}
                onBlurCapture={handleBlurCapture}
                onFocusCapture={handleFocusCapture}
                onPasteCapture={handlePasteCapture}
                onKeyDownCapture={handleKeyDownCapture}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
              {previewEditMode === "text" && activeLinkEditor ? (
                <div
                  data-massic-link-editor="true"
                  className="absolute z-20 w-[300px] rounded-md border bg-background p-3 shadow-lg"
                  style={{
                    top: activeLinkEditor.top,
                    left: activeLinkEditor.left,
                  }}
                >
                  <div className="space-y-2">
                    <Typography className="text-xs font-medium">Edit Link</Typography>
                    <Typography className="text-[11px] text-muted-foreground break-words">
                      {activeLinkEditor.label}
                    </Typography>
                    <Input
                      value={linkHrefDraft}
                      onChange={(event) => {
                        setLinkHrefDraft(event.target.value);
                        if (linkHrefError) {
                          setLinkHrefError(null);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleSaveActiveLinkHref();
                        }
                      }}
                      placeholder="https://example.com"
                      className="h-8"
                      autoFocus
                    />
                    {linkHrefError ? (
                      <Typography className="text-[11px] text-destructive">{linkHrefError}</Typography>
                    ) : null}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => void handleRemoveActiveLinkHref()}
                      >
                        Remove URL
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={closeActiveLinkEditor}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => void handleSaveActiveLinkHref()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              {previewEditMode === "spacing" && activeSpacingEditor ? (
                <div
                  data-massic-spacing-editor="true"
                  className="absolute z-20 w-[264px] max-w-[calc(100vw-24px)] rounded-md border bg-background p-3 shadow-lg"
                  style={{
                    top: activeSpacingEditor.top,
                    left: activeSpacingEditor.left,
                  }}
                >
                  <div className="space-y-3">
                    <Typography className="text-xs font-semibold">Adjust Spacing</Typography>
                    <Typography className="text-[11px] text-muted-foreground break-words">
                      {activeSpacingEditor.label}
                    </Typography>
                    <div className="rounded-md border bg-muted/30 p-2.5 space-y-2.5">
                      <div className="grid grid-cols-[56px_minmax(0,1fr)_74px] items-center gap-2">
                        <Typography className="text-xs text-muted-foreground">Top</Typography>
                        <div className="min-w-0">
                          <select
                            className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs leading-none"
                            value={toSpacingPresetValue(spacingDraft.outsideTop)}
                            onChange={(event) => setSpacingPresetValue("outsideTop", event.target.value)}
                          >
                            {SPACING_SELECT_OPTIONS.map((option) => (
                              <option key={`outsideTop-${option.value || "default"}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            <option value={SPACING_CUSTOM_OPTION_VALUE}>Custom</option>
                          </select>
                        </div>
                        <div className="relative min-w-0">
                          <Input
                            type="number"
                            min={EDITABLE_SPACING_PX_MIN}
                            max={EDITABLE_SPACING_PX_MAX}
                            step={1}
                            className="h-9 w-full min-w-0 pr-7 text-xs text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            value={resolveSpacingInputValue(spacingDraft.outsideTop)}
                            onChange={(event) => setSpacingCustomPxValue("outsideTop", event.target.value)}
                            placeholder="0"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            px
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-[56px_minmax(0,1fr)_74px] items-center gap-2">
                        <Typography className="text-xs text-muted-foreground">Bottom</Typography>
                        <div className="min-w-0">
                          <select
                            className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs leading-none"
                            value={toSpacingPresetValue(spacingDraft.outsideBottom)}
                            onChange={(event) => setSpacingPresetValue("outsideBottom", event.target.value)}
                          >
                            {SPACING_SELECT_OPTIONS.map((option) => (
                              <option key={`outsideBottom-${option.value || "default"}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            <option value={SPACING_CUSTOM_OPTION_VALUE}>Custom</option>
                          </select>
                        </div>
                        <div className="relative min-w-0">
                          <Input
                            type="number"
                            min={EDITABLE_SPACING_PX_MIN}
                            max={EDITABLE_SPACING_PX_MAX}
                            step={1}
                            className="h-9 w-full min-w-0 pr-7 text-xs text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            value={resolveSpacingInputValue(spacingDraft.outsideBottom)}
                            onChange={(event) => setSpacingCustomPxValue("outsideBottom", event.target.value)}
                            placeholder="0"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            px
                          </span>
                        </div>
                      </div>
                      <Typography className="text-[10px] text-muted-foreground">
                        Range: {EDITABLE_SPACING_PX_MIN} to {EDITABLE_SPACING_PX_MAX}
                      </Typography>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => void handleResetSpacingForActiveTarget()}
                      >
                        Reset Element
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={cancelActiveSpacingEditor}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => void handleApplySpacingForActiveTarget()}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <style>{`
              ${previewMassicVarCss}
              .massic-html-preview .massic-text-editable {
                border-radius: 4px;
                outline: none;
                transition: background-color 120ms ease, box-shadow 120ms ease;
              }
              .massic-html-preview.massic-mode-spacing .massic-text-editable {
                pointer-events: none;
              }
              .massic-html-preview a[data-massic-link-id] {
                cursor: pointer;
                position: relative;
                transition: box-shadow 120ms ease, background-color 120ms ease, color 120ms ease;
              }
              .massic-html-preview a[data-massic-link-id]:hover,
              .massic-html-preview a[data-massic-link-id]:focus-visible {
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 12%, transparent);
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--massic-primary, #2E6A56) 35%, transparent);
                border-radius: 4px;
                outline: none;
              }
              .massic-html-preview a[data-massic-link-id]:hover::after,
              .massic-html-preview a[data-massic-link-id]:focus-visible::after {
                content: "Click to edit link";
                position: absolute;
                left: 0;
                bottom: calc(100% + 4px);
                z-index: 5;
                padding: 2px 6px;
                border-radius: 999px;
                background: #111827;
                color: #ffffff;
                font-size: 10px;
                line-height: 1.2;
                white-space: nowrap;
                pointer-events: none;
              }
              .massic-html-preview.massic-mode-spacing a[data-massic-link-id]:hover::after,
              .massic-html-preview.massic-mode-spacing a[data-massic-link-id]:focus-visible::after {
                content: none;
              }
              .massic-html-preview.massic-mode-spacing [data-massic-spacing-id] {
                position: relative;
                cursor: pointer;
                outline: 1px dashed transparent;
                outline-offset: 2px;
                transition: outline-color 120ms ease, background-color 120ms ease;
              }
              .massic-html-preview.massic-mode-spacing [data-massic-spacing-hovered='true'] {
                outline-color: color-mix(in srgb, var(--massic-primary, #2E6A56) 45%, transparent);
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 8%, transparent);
              }
              .massic-html-preview.massic-mode-spacing [data-massic-spacing-hovered='true']::after {
                content: "Click to adjust spacing";
                position: absolute;
                left: 6px;
                top: 6px;
                z-index: 5;
                padding: 2px 6px;
                border-radius: 999px;
                background: #111827;
                color: #ffffff;
                font-size: 10px;
                line-height: 1.2;
                white-space: nowrap;
                pointer-events: none;
              }
              .massic-html-preview.massic-mode-spacing [data-massic-spacing-selected='true'] {
                outline-color: color-mix(in srgb, var(--massic-primary, #2E6A56) 70%, transparent);
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 10%, transparent);
              }
              .massic-html-preview .massic-text-editable:focus {
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 8%, transparent);
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--massic-primary, #2E6A56) 35%, transparent);
              }
            `}</style>
          </Card>
        ) : null}
      </div>

      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish to WordPress</DialogTitle>
            <DialogDescription>
              Choose what to do with this page.
            </DialogDescription>
          </DialogHeader>

          {!isWpConnected ? (
            <div className="rounded-md border bg-background p-4 space-y-3">
              <Typography className="text-sm">No WordPress channel connected.</Typography>
              <Button onClick={handleRedirectToChannels}>Connect WordPress</Button>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/20 p-4 space-y-2 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <Typography className="text-sm font-medium truncate min-w-0 flex-1">{wpConnection?.siteUrl}</Typography>
                <Typography className="text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap shrink-0">
                  {publishStateLabel}
                </Typography>
              </div>
              <Typography className="text-sm text-muted-foreground">{publishStateHint}</Typography>
              <Typography className="text-sm line-clamp-2">{publishTitle}</Typography>
              <div className="space-y-1 pt-2">
                <Typography className="text-xs text-muted-foreground">Generated slug</Typography>
                <Typography className="text-sm font-mono break-all">{wordpressSlugToDisplay(effectiveModalSlug, "/untitled-page")}</Typography>
              </div>
              <div className="space-y-1 pt-2">
                <Typography className="text-xs text-muted-foreground">Publish slug</Typography>
                <Input
                  value={editableSlug}
                  onChange={(event) => {
                    setEditableSlug(normalizeWordpressSlugPathInput(event.target.value));
                    setIsSlugEdited(true);
                  }}
                  placeholder="enter-page-slug"
                  disabled={isSlugInputBusy}
                />
              </div>
              <div className="space-y-1">
                <Typography className="text-xs text-muted-foreground">Publish route</Typography>
                <Typography className="text-sm font-mono break-all">{publishUrlPreview || "Unavailable"}</Typography>
              </div>
              {isSlugChecking ? (
                <Typography className="text-xs text-muted-foreground">Checking slug availability...</Typography>
              ) : null}
              {slugCheckError ? (
                <Typography className="text-xs text-destructive">{slugCheckError}</Typography>
              ) : null}
              {hasSlugConflict ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 space-y-2 min-w-0">
                  <div className="break-words">
                    {slugConflictReason === "parent_type_conflict"
                      ? "This nested page path is blocked because a parent segment already belongs to non-page content. Change the parent path."
                      : "This slug already exists in WordPress. Publishing is blocked until you use a unique slug."}
                  </div>
                  {slugCheckResult?.suggestedSlug ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-auto w-full justify-start whitespace-normal break-all text-left"
                      onClick={autoResolveSlug}
                      disabled={isSlugActionBusy}
                    >
                      {isAutoResolvingSlug ? "Resolving..." : `Auto-resolve to ${wordpressSlugToDisplay(slugCheckResult?.suggestedSlug, "/next-available")}`}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <Typography className="text-xs text-muted-foreground uppercase tracking-wide">
                    Style Colors
                  </Typography>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setStyleColorOverridesDraft({})}
                      disabled={isStyleOverrideSaving || !Object.keys(styleColorOverridesDraft).length}
                    >
                      Reset All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveStyleColorOverrides}
                      disabled={isStyleOverrideSaving || !hasUnsavedStyleColorOverrides}
                    >
                      {isStyleOverrideSaving ? "Saving..." : "Save Colors"}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Typography className="text-xs text-muted-foreground">
                    Overrides are saved separately. Use extracted colors or custom picks.
                  </Typography>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setShowAllStyleColorOptions((prev) => !prev)}
                  >
                    {showAllStyleColorOptions
                      ? "Show Core"
                      : `Show All (${MASSIC_STYLE_COLOR_KEYS.length})`}
                  </Button>
                </div>
                {extractedPaletteColors.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography className="text-[11px] text-muted-foreground">
                      Extracted palette:
                    </Typography>
                    {extractedPaletteColors.slice(0, 10).map((color) => (
                      <span
                        key={color}
                        className="inline-flex h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visibleStyleColorKeys.map((key) => {
                    const label = STYLE_COLOR_OPTION_LABELS[key] || key;
                    const extractedColor = extractedColorByKey[key] || null;
                    const overrideColor = normalizedDraftStyleColorOverrides[key] || null;
                    const pickerValue =
                      overrideColor ||
                      extractedColor ||
                      extractedPaletteColors[0] ||
                      "#000000";
                    return (
                      <div key={key} className="rounded-md border border-border/70 p-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Typography className="text-xs font-medium">{label}</Typography>
                          <Typography className="text-[11px] text-muted-foreground font-mono">
                            {overrideColor || extractedColor || "n/a"}
                          </Typography>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={pickerValue}
                            onChange={(event) => handleStyleOverrideColorChange(key, event.target.value)}
                            disabled={isStyleOverrideSaving}
                            className="h-8 w-11 p-1 shrink-0"
                          />
                          <Popover
                            open={openStylePaletteKey === key}
                            onOpenChange={(open) => setOpenStylePaletteKey(open ? key : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 min-w-0 flex-1 justify-between px-2 text-xs"
                                disabled={isStyleOverrideSaving || !extractedPaletteColors.length}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <span
                                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-border"
                                    style={{
                                      backgroundColor:
                                        overrideColor ||
                                        extractedColor ||
                                        extractedPaletteColors[0] ||
                                        "#000000",
                                    }}
                                  />
                                  <span className="truncate">
                                    {overrideColor || extractedColor || "Use extracted"}
                                  </span>
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-56 p-1">
                              <div className="max-h-56 space-y-1 overflow-y-auto">
                                {extractedPaletteColors.map((color) => (
                                  <button
                                    key={`${key}-${color}`}
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
                                    onClick={() => {
                                      handleStyleOverrideColorChange(key, color);
                                      setOpenStylePaletteKey(null);
                                    }}
                                  >
                                    <span
                                      className="h-4 w-4 shrink-0 rounded-full border border-border"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="font-mono">{color}</span>
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={() => resetStyleOverrideKey(key)}
                            disabled={isStyleOverrideSaving || !overrideColor}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!showAllStyleColorOptions ? (
                  <Typography className="text-[11px] text-muted-foreground">
                    Showing core colors. Enable "Show All" for text/surface options.
                  </Typography>
                ) : null}
              </div>

              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <Typography className="text-xs text-muted-foreground uppercase tracking-wide">
                    Typography
                  </Typography>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setStyleTypographyOverridesDraft({})}
                      disabled={isStyleOverrideSaving || !Object.keys(styleTypographyOverridesDraft).length}
                    >
                      Reset Typography
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveStyleTypographyOverrides}
                      disabled={isStyleOverrideSaving || hasTypographyValidationErrors || !hasUnsavedStyleTypographyOverrides}
                    >
                      {isStyleOverrideSaving ? "Saving..." : "Save Typography"}
                    </Button>
                  </div>
                </div>
                <Typography className="text-xs text-muted-foreground">
                  Adjust only the core text scale. Font-family overrides are hidden for a simpler setup.
                </Typography>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VISIBLE_STYLE_TYPOGRAPHY_KEYS.map((key) => {
                    const label = STYLE_TYPOGRAPHY_OPTION_LABELS[key] || key;
                    const extractedValue = extractedTypographyByKey[key] || "";
                    const overrideValue = styleTypographyOverridesDraft[key] || "";
                    const displayValue = overrideValue || extractedValue || "";
                    const isInvalid = Boolean(
                      overrideValue &&
                      !normalizedDraftStyleTypographyOverrides[key]
                    );
                    const presetOptions = TYPOGRAPHY_PRESETS[key] || [];
                    const presetMenuOptions = (() => {
                      const seen = new Set<string>();
                      const merged: Array<{ value: string; label: string }> = [];

                      const pushOption = (value: string, label: string) => {
                        const trimmed = String(value || "").trim();
                        if (!trimmed) return;
                        const dedupeKey = trimmed.toLowerCase();
                        if (seen.has(dedupeKey)) return;
                        seen.add(dedupeKey);
                        merged.push({ value: trimmed, label });
                      };

                      if (extractedValue) {
                        pushOption(extractedValue, `Extracted: ${extractedValue}`);
                      }
                      for (const preset of presetOptions) {
                        pushOption(preset, preset);
                      }

                      return merged;
                    })();
                    return (
                      <div key={key} className="rounded-md border border-border/70 p-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Typography className="text-xs font-medium">{label}</Typography>
                          <Typography className="text-[11px] text-muted-foreground font-mono truncate">
                            {displayValue || "n/a"}
                          </Typography>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={overrideValue}
                            onChange={(event) => handleStyleOverrideTypographyChange(key, event.target.value)}
                            placeholder={extractedValue || "Enter value"}
                            className={cn("h-8 text-xs", isInvalid ? "border-destructive" : "")}
                            disabled={isStyleOverrideSaving}
                          />
                          <select
                            className="h-8 w-[128px] shrink-0 rounded-md border border-input bg-background px-2 text-xs"
                            value=""
                            disabled={isStyleOverrideSaving || !presetMenuOptions.length}
                            onChange={(event) => {
                              const selected = event.target.value;
                              if (!selected) return;
                              handleStyleOverrideTypographyChange(key, selected);
                            }}
                          >
                            <option value="">Presets</option>
                            {presetMenuOptions.map((option) => (
                              <option key={`${key}-${option.value}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Typography className="text-[11px] text-muted-foreground truncate">
                            {extractedValue ? `Extracted: ${extractedValue}` : "No extracted value"}
                          </Typography>
                          {isInvalid ? (
                            <Typography className="text-[11px] text-destructive">
                              Invalid format
                            </Typography>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasTypographyValidationErrors ? (
                  <Typography className="text-[11px] text-destructive">
                    Invalid values found. Use sizes like 16px and line-height like 1.6.
                  </Typography>
                ) : null}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPublishModalOpen(false)}
              disabled={isPublishBusy}
            >
              Cancel
            </Button>
            {isWpConnected ? (
              <>
                {isPersistedLive ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleChangeWordpressStatus("draft")}
                      disabled={wpUnpublishMutation.isPending}
                    >
                      {wpUnpublishMutation.isPending ? "Updating..." : "Move to Draft"}
                    </Button>
                    <Button
                      onClick={() => {
                        if (liveUrl) {
                          openEmbeddedPreview(liveUrl, "Published WordPress Page");
                        }
                      }}
                      disabled={!liveUrl}
                    >
                      View Live
                    </Button>
                  </>
                ) : isPersistedDraftLike ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      disabled={wpUnpublishMutation.isPending}
                    >
                      {wpUnpublishMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleOpenPreview}
                      disabled={!persistedContent?.wpId || wpPreviewMutation.isPending}
                    >
                      {wpPreviewMutation.isPending ? "Loading..." : "Preview Draft"}
                    </Button>
                    <Button
                      onClick={() => setConfirmPublishAction("live")}
                      disabled={!hasFinalContent || !normalizedEditableSlug || hasSlugConflict || isSlugChecking || wpPublishMutation.isPending}
                    >
                      {wpPublishMutation.isPending ? "Publishing..." : "Publish Live"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setConfirmPublishAction("draft")}
                    disabled={
                      !hasFinalContent ||
                      !normalizedEditableSlug ||
                      hasSlugConflict ||
                      isSlugChecking ||
                      contentStatusQuery.isLoading ||
                      wpPublishMutation.isPending ||
                      wpPreviewMutation.isPending
                    }
                  >
                    {wpPublishMutation.isPending || wpPreviewMutation.isPending ? "Publishing..." : "Publish Draft"}
                  </Button>
                )}
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmPublishAction !== null} onOpenChange={(open) => !open && setConfirmPublishAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmPublishAction === "live" ? "Publish Live to WordPress?" : "Publish Draft to WordPress?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPublishAction === "live"
                ? `This will update the live WordPress page at ${publishUrlPreview || "the selected route"}.`
                : `This will create or update the WordPress draft at ${publishUrlPreview || "the selected route"}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={confirmAndRunPublishAction} disabled={isPublishBusy}>
                {confirmPublishAction === "live" ? "Confirm Publish Live" : "Confirm Publish Draft"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete WordPress Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the WordPress page to trash. You can restore it later from WordPress admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={async () => {
                  setIsDeleteConfirmOpen(false);
                  await handleChangeWordpressStatus("trash");
                }}
                disabled={isPublishBusy}
              >
                Confirm Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEmbeddedPreviewOpen} onOpenChange={setIsEmbeddedPreviewOpen}>
        <DialogContent
          className="w-[96vw] h-[90vh] max-w-[1400px] sm:max-w-[1400px] p-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Preview {embeddedPreviewTitle}</DialogTitle>
          <div className="h-full flex flex-col bg-background">
            <div className="shrink-0 border-b px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Typography variant="h6" className="truncate">{embeddedPreviewTitle}</Typography>
                <Typography className="text-xs text-muted-foreground truncate">{embeddedPreviewUrl}</Typography>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1 rounded-md border p-1 bg-muted/40">
                  <Button
                    size="sm"
                    variant={previewViewport === "desktop" ? "default" : "ghost"}
                    className="gap-1.5"
                    onClick={() => setPreviewViewport("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </Button>
                  <Button
                    size="sm"
                    variant={previewViewport === "tablet" ? "default" : "ghost"}
                    className="gap-1.5"
                    onClick={() => setPreviewViewport("tablet")}
                  >
                    <Tablet className="h-4 w-4" />
                    Tablet
                  </Button>
                  <Button
                    size="sm"
                    variant={previewViewport === "mobile" ? "default" : "ghost"}
                    className="gap-1.5"
                    onClick={() => setPreviewViewport("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    if (embeddedPreviewUrl) {
                      window.open(embeddedPreviewUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                  disabled={!embeddedPreviewUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
                <DialogClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Close preview">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>

            <div className="relative flex-1 bg-muted/20">
              {isEmbeddedPreviewLoading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/75 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading preview...
                  </div>
                </div>
              ) : null}

              <div className="h-full w-full overflow-auto p-4 md:p-5">
                <div
                  className={cn(
                    "mx-auto h-full transition-all duration-300",
                    previewViewport === "desktop" && "w-full",
                    previewViewport === "tablet" && "w-full max-w-[900px]",
                    previewViewport === "mobile" && "w-full max-w-[430px]"
                  )}
                >
                  <iframe
                    title={embeddedPreviewTitle}
                    src={embeddedPreviewUrl}
                    className={cn(
                      "h-full w-full border-0 bg-white",
                      previewViewport !== "desktop" && "rounded-xl border shadow-sm"
                    )}
                    onLoad={() => setIsEmbeddedPreviewLoading(false)}
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              {showEmbedFallbackHint ? (
                <div className="absolute bottom-3 right-3 rounded-md border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                  If preview is blocked, use "Open in New Tab".
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
