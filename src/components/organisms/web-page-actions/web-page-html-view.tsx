"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownFromLine,
  ArrowLeft,
  ArrowUp,
  ArrowUpFromLine,
  Bold,
  Check,
  CopyPlus,
  FileCode,
  FileText,
  CornerLeftUp,
  Italic,
  Minimize2,
  Minus,
  MoveVertical,
  PanelLeft,
  PanelRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Monitor,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  SquarePlus,
  Strikethrough,
  Trash2,
  Underline,
  Unlink,
  Smartphone,
  Tablet,
  Undo2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { AIRefineToolbarDom } from "@/components/ui/ai-refine-toolbar";
import { copyToClipboard } from "@/utils/clipboard";
import { resolvePageContent } from "@/utils/page-content-resolver";
import { ContentConverter } from "@/utils/content-converter";
import { api } from "@/hooks/use-api";
import { ensureMassicContentWrapper } from "@/utils/page-content-format";
import { normalizeWordpressSlugPath, normalizeWordpressSlugPathInput, wordpressSlugToDisplay } from "@/utils/wordpress-slug";
import {
  applySpacingEditsToHtml,
  applyLinkEditsToHtml,
  applyLinkLabelEditsToHtml,
  applyTextEditsToHtml,
  buildEditableHtmlModel,
  buildSpacingStyleString,
  canonicalizeHtml,
  parseEditableSpacingValue,
  extractPlainTextFromHtml,
  isSafeEditableLinkHref,
  normalizeEditableLinkHref,
  sanitizePageHtml,
  moveSectionInHtml,
  deleteSectionFromHtml,
  duplicateSectionInHtml,
  insertBlockInHtml,
  deleteBlockAndNormalize,
  deleteLayoutBySpacingId,
  deleteSlotById,
  duplicateElementBySpacingId,
  moveElementBySpacingId,
  insertInsideElementBySpacingId,
  insertAdjacentToElementBySpacingId,
  insertBlockIntoSlot,
  EDITABLE_SPACING_PX_MAX,
  EDITABLE_SPACING_PX_MIN,
  getElementSiblingInfo,
  wrapBlockInTwoColumnLayout,
  normalizeLayoutHtml,
  upgradeLegacySplitLayouts,
  validatePublishableLayoutHtml,
  collapseLayoutBySpacingId,
  getMediaInfoFromElement,
  getTextBlockInfoFromElement,
  markSectionElementForReselect,
  markSpacingElementForReselect,
  RESELECT_MARKER_ATTR,
  updateMediaInElementBySpacingId,
  type EditableBlockNode,
  type EditableLayoutNode,
  type EditableLinkRef,
  type EditableSectionRef,
  type EditableSlotNode,
  type EditableSpacingRef,
  type EditableSpacingValue,
  type EditableTextStyleValue,
  type EditableTextNodeRef,
  type LayoutValidationResult,
  type MediaElementInfo,
} from "@/utils/page-html-editor";
import { buildStyledMassicHtml, getMassicCssText } from "@/utils/massic-html-copy";
import { useWebActionContentQuery } from "@/hooks/use-web-page-actions";
import {
  type WordpressSlugConflictInfo,
  WordpressPublishError,
  useWordpressContentStatus,
  useWordpressPreviewLink,
  useWordpressPublish,
  useWordpressSlugCheck,
  useWordpressUnpublish,
} from "@/hooks/use-wordpress-publishing";
import {
  useWordpressConnection,
  useWordpressStyleProfile,
  useUpdateWordpressStyleOverrides,
} from "@/hooks/use-wordpress-connector";
import {
  applyMassicStyleOverrides,
  buildMassicCssVariableOverrides,
  MASSIC_STYLE_COLOR_KEYS,
  MASSIC_STYLE_TYPOGRAPHY_KEYS,
  normalizeMassicStyleColorOverrides,
  normalizeMassicStyleTypographyOverrides,
  type MassicStyleColorKey,
  type MassicStyleTypographyKey,
} from "@/utils/massic-style-overrides";
import { LayoutPanel, MediaEditorPanel } from "@/components/ui/layout-panel";
import { InsertBlockDialog } from "@/components/ui/insert-block-dialog";

type SaveReason = "debounce" | "blur" | "unmount";
type AiTextTransformResponse = {
  revised_text?: string;
};
type ActiveLinkEditorState = {
  id: string;
  top: number;
  left: number;
  label: string;
  textIds: string[];
};
type ActiveMediaEditorState = {
  spacingId: string;
  top: number;
  left: number;
  label: string;
  media: MediaElementInfo;
};
type ActiveTextEditorState = {
  id: string;
  top: number;
  left: number;
  label: string;
  text: string;
  style: EditableTextStyleValue;
};
type PreviewEditMode = "text" | "layout";
type ActiveLayoutEditorState = {
  top: number;
  left: number;
  label: string;
  targetKind: "section" | "block" | "layout" | "slot";
  targetTagName: string | null;
  layoutId: string | null;
  slotId: string | null;
  sectionId: string | null;
  sectionCount: number;
  sectionIndex: number;
  spacingId: string | null;
  baseClassName: string;
  baseStyleStr: string;
  baseSpacing: EditableSpacingValue;
  isElement: boolean;
  isLayout: boolean;
  isSlot: boolean;
  canInsertInside: boolean;
  isFirstSibling: boolean;
  isLastSibling: boolean;
  isEmptyElement: boolean;
  mediaTarget: MediaElementInfo | null;
};
type InsertAnchor = {
  kind: "section";
  sectionId: string;
  position: "before" | "after";
} | {
  kind: "element";
  spacingId: string;
  position: "inside" | "before" | "after";
} | {
  kind: "slot";
  slotId: string;
} | {
  kind: "wrap-grid";
  spacingId: string;
  side: "left" | "right";
} | null;

const TEXT_OWNER_SELECTOR = "p, blockquote, h1, h2, h3, h4, h5, h6, li, summary, details, a[data-massic-link-id]";
const AI_SELECTION_ATTR = "data-massic-ai-selection";
const AI_SELECTION_OWNER_ATTR = "data-massic-ai-selection-owner";

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

function getEditableSectionElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("[data-massic-section-id]") as HTMLElement | null;
}

function getEditableSlotElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest("[data-massic-slot-id]") as HTMLElement | null;
}

function resolveMediaSelection(target: HTMLElement): { spacingEl: HTMLElement; media: MediaElementInfo } | null {
  const spacingAncestors: HTMLElement[] = [];
  let current: HTMLElement | null = target;

  while (current) {
    if (current.hasAttribute("data-massic-spacing-id")) {
      spacingAncestors.push(current);
    }
    current = current.parentElement;
  }

  for (const spacingEl of spacingAncestors) {
    const media = getMediaInfoFromElement(spacingEl, target);
    if (media) {
      return { spacingEl, media };
    }
  }

  return null;
}

function isEditorPopoverTarget(target: HTMLElement): boolean {
  return Boolean(
    target.closest("[data-massic-text-editor='true']") ||
    target.closest("[data-massic-link-editor='true']") ||
    target.closest("[data-massic-media-editor='true']") ||
    target.closest("[data-massic-section-editor='true']")
  );
}

function createEmptySpacingValue(): EditableSpacingValue {
  return {
    outsideTop: null,
    outsideBottom: null,
    outsideLeft: null,
    outsideRight: null,
  };
}

function areSpacingValuesEqual(left: Partial<EditableSpacingValue> | null | undefined, right: Partial<EditableSpacingValue> | null | undefined): boolean {
  const leftValue = left || {};
  const rightValue = right || {};
  return (
    (leftValue.outsideTop || null) === (rightValue.outsideTop || null) &&
    (leftValue.outsideBottom || null) === (rightValue.outsideBottom || null) &&
    (leftValue.outsideLeft || null) === (rightValue.outsideLeft || null) &&
    (leftValue.outsideRight || null) === (rightValue.outsideRight || null)
  );
}

const SPACING_STEP = 8;
const SPACING_PIXEL_BASE: Record<string, number> = {
  none: 0,
  xs: 8,
  s: 12,
  m: 16,
  l: 24,
  xl: 32,
};

type SpacingDraftKey = keyof EditableSpacingValue;

function spacingTokenToPx(value: EditableSpacingValue[SpacingDraftKey]): number {
  if (!value || typeof value !== "string") return 0;
  if (value.startsWith("num:")) {
    const parsed = Number(value.slice(4));
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }
  const normalized = value.trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(SPACING_PIXEL_BASE, normalized)) {
    return SPACING_PIXEL_BASE[normalized];
  }
  return 0;
}

function pxToSpacingToken(px: number): EditableSpacingValue[SpacingDraftKey] {
  const clamped = Math.max(EDITABLE_SPACING_PX_MIN, Math.min(EDITABLE_SPACING_PX_MAX, Math.round(px)));
  return `num:${clamped}`;
}

function unwrapElementPreservingChildren(element: Element) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function getInlineFormatTagNames(format: "bold" | "italic" | "underline" | "strike"): string[] {
  if (format === "bold") return ["strong", "b"];
  if (format === "italic") return ["em", "i"];
  if (format === "underline") return ["u"];
  return ["s", "strike", "del"];
}

function normalizeSelectedText(value: string): string {
  return String(value || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

function formatSpacingButtonLabel(spacing: EditableSpacingValue): string {
  const parts = [
    ["T", spacingTokenToPx(spacing.outsideTop)],
    ["R", spacingTokenToPx(spacing.outsideRight)],
    ["B", spacingTokenToPx(spacing.outsideBottom)],
    ["L", spacingTokenToPx(spacing.outsideLeft)],
  ].filter(([, value]) => value !== 0);

  if (!parts.length) return "0";
  return parts.map(([label, value]) => `${label} ${value}`).join("  ");
}

function fragmentHasMeaningfulContent(fragment: DocumentFragment): boolean {
  return Array.from(fragment.childNodes).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeSelectedText(node.textContent || "").length > 0;
    }
    return node.nodeType === Node.ELEMENT_NODE;
  });
}

function stripInlineFormatFromFragment(
  fragment: DocumentFragment,
  format: "bold" | "italic" | "underline" | "strike"
): DocumentFragment {
  const container = document.createElement("div");
  container.appendChild(fragment);
  const tags = getInlineFormatTagNames(format).join(",");
  Array.from(container.querySelectorAll(tags)).forEach((node) => {
    unwrapElementPreservingChildren(node);
  });
  const cleaned = document.createDocumentFragment();
  while (container.firstChild) {
    cleaned.appendChild(container.firstChild);
  }
  return cleaned;
}

function detectInlineFormatsAtNode(node: Node | null, container: HTMLElement): { bold: boolean; italic: boolean; underline: boolean; strike: boolean } {
  const result = { bold: false, italic: false, underline: false, strike: false };
  if (!node) return result;
  let el: HTMLElement | null = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  while (el && el !== container && container.contains(el)) {
    const tag = el.tagName.toLowerCase();
    if (tag === "strong" || tag === "b") result.bold = true;
    else if (tag === "em" || tag === "i") result.italic = true;
    else if (tag === "u") result.underline = true;
    else if (tag === "s" || tag === "strike" || tag === "del") result.strike = true;
    el = el.parentElement;
  }
  return result;
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
  const [isEmbeddedPreviewOpen, setIsEmbeddedPreviewOpen] = React.useState(false);
  const [embeddedPreviewUrl, setEmbeddedPreviewUrl] = React.useState("");
  const [embeddedPreviewTitle, setEmbeddedPreviewTitle] = React.useState("Preview");
  const [isEmbeddedPreviewLoading, setIsEmbeddedPreviewLoading] = React.useState(false);
  const [showEmbedFallbackHint, setShowEmbedFallbackHint] = React.useState(false);
  const [previewViewport, setPreviewViewport] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const [confirmPublishAction, setConfirmPublishAction] = React.useState<"draft" | "live" | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);

  const lastAutoSlugCheckKeyRef = React.useRef("");

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
  const wpPublishMutation = useWordpressPublish();
  const { mutateAsync: slugCheckMutateAsync } = useWordpressSlugCheck();
  const wpPreviewMutation = useWordpressPreviewLink();
  const wpUnpublishMutation = useWordpressUnpublish();
  const wpStyleProfileQuery = useWordpressStyleProfile(wpConnection?.connectionId || null);
  const wpStyleOverridesMutation = useUpdateWordpressStyleOverrides();
  const isWpConnected = Boolean(wpConnectionQuery.data?.connected && wpConnection);
  const [styleColorOverridesDraft, setStyleColorOverridesDraft] = React.useState<
    Partial<Record<MassicStyleColorKey, string>>
  >({});
  const [showAllStyleColorOptions, setShowAllStyleColorOptions] = React.useState(false);
  const [openStylePaletteKey, setOpenStylePaletteKey] = React.useState<MassicStyleColorKey | null>(null);
  const [styleTypographyOverridesDraft, setStyleTypographyOverridesDraft] = React.useState<
    Partial<Record<MassicStyleTypographyKey, string>>
  >({});
  const inferPage = data?.output_data?.page || {};
  const publishTitle = inferPage?.meta_title || inferPage?.title || keyword || "Untitled";
  const publishContentId = inferPage?.page_id || pageId;
  const publishType = "page" as const;
  const contentStatusQuery = useWordpressContentStatus(
    wpConnection?.connectionId || null,
    publishContentId ? String(publishContentId) : null
  );
  const persistedContent = contentStatusQuery.data?.content || null;
  const persistedStatus = (persistedContent?.status || "").toLowerCase();
  const isPersistedTrashed = persistedStatus === "trash";
  const persistedSlug = React.useMemo(
    () => normalizeWordpressBlogEditableSlug(persistedContent?.slug || ""),
    [persistedContent?.slug]
  );
  const generatedSlugFallback = React.useMemo(
    () => normalizeWordpressSlugPath(publishTitle || keyword || ""),
    [keyword, publishTitle]
  );
  const generatedSlug = React.useMemo(
    () => normalizeWordpressBlogEditableSlug(generatedSlugFallback),
    [generatedSlugFallback]
  );
  const effectiveModalSlug = React.useMemo(() => {
    if (!isPersistedTrashed && persistedSlug) return persistedSlug;
    if (!isPersistedTrashed && lastPublishedData?.slug) return normalizeWordpressBlogEditableSlug(lastPublishedData.slug);
    if (generatedSlug) return generatedSlug;
    return generatedSlugFallback;
  }, [generatedSlug, generatedSlugFallback, isPersistedTrashed, lastPublishedData?.slug, persistedSlug]);
  const normalizedEditableSlug = React.useMemo(() => normalizeWordpressBlogEditableSlug(editableSlug), [editableSlug]);
  const hasInvalidBlogSlug = React.useMemo(
    () => Boolean(normalizedEditableSlug && normalizedEditableSlug.includes("/")),
    [normalizedEditableSlug]
  );
  const normalizedSlugForPublish = React.useMemo(() => {
    if (!normalizedEditableSlug || hasInvalidBlogSlug) return "";
    return normalizedEditableSlug;
  }, [hasInvalidBlogSlug, normalizedEditableSlug]);
  const isPersistedLive = persistedStatus === "publish";
  const isPersistedDraftLike = Boolean(persistedContent && !isPersistedLive && !isPersistedTrashed);
  const hasSlugConflict = Boolean(slugCheckResult?.exists && !slugCheckResult?.sameMappedContent && slugCheckResult?.conflict);
  const slugConflictReason = slugCheckResult?.conflict?.reason || null;
  const isPublishBusy =
    wpPublishMutation.isPending ||
    wpPreviewMutation.isPending ||
    wpUnpublishMutation.isPending;
  const publishStateLabel = isPersistedLive ? "Live" : isPersistedDraftLike ? "Draft" : isPersistedTrashed ? "In Trash" : "Not Published";
  const publishStateHint = isPersistedLive
    ? "This content is live on WordPress."
    : isPersistedDraftLike
      ? "A draft exists in WordPress."
      : isPersistedTrashed
        ? "This content was moved to trash."
        : "No WordPress page exists yet.";
  const publishUrlPreview = React.useMemo(() => {
    const siteUrl = String(wpConnection?.siteUrl || "").replace(/\/+$/, "");
    const slugForPreview = normalizedSlugForPublish || normalizeWordpressBlogEditableSlug(slugCheckResult?.slug || "");
    if (!siteUrl || !slugForPreview) return null;
    return `${siteUrl}/${slugForPreview}`;
  }, [normalizedSlugForPublish, slugCheckResult?.slug, wpConnection?.siteUrl]);
  const liveUrl = React.useMemo(() => {
    if (persistedContent?.permalink) return persistedContent.permalink;
    if (lastPublishedData?.permalink) return lastPublishedData.permalink;
    if (isPersistedLive && persistedContent?.wpId && wpConnection?.siteUrl) {
      return `${String(wpConnection.siteUrl).replace(/\/+$/, "")}/?p=${persistedContent.wpId}`;
    }
    return null;
  }, [isPersistedLive, lastPublishedData?.permalink, persistedContent?.permalink, persistedContent?.wpId, wpConnection?.siteUrl]);

  const normalizedStoredStyleColorOverrides = React.useMemo(
    () => normalizeMassicStyleColorOverrides(wpStyleProfileQuery.data?.styleOverrides || {}).colors || {},
    [wpStyleProfileQuery.data?.styleOverrides]
  );
  const serializedStoredColorOverrides = React.useMemo(
    () => JSON.stringify(normalizedStoredStyleColorOverrides),
    [normalizedStoredStyleColorOverrides]
  );
  const normalizedStoredStyleTypographyOverrides = React.useMemo(
    () => normalizeMassicStyleTypographyOverrides(wpStyleProfileQuery.data?.styleOverrides || {}).typography || {},
    [wpStyleProfileQuery.data?.styleOverrides]
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
      if (prevSerialized === serializedStoredColorOverrides) return prev;
      return normalizedStoredStyleColorOverrides;
    });
  }, [normalizedStoredStyleColorOverrides, serializedStoredColorOverrides]);
  React.useEffect(() => {
    setStyleTypographyOverridesDraft((prev) => {
      const prevSerialized = JSON.stringify(
        normalizeMassicStyleTypographyOverrides({ typography: prev }).typography || {}
      );
      if (prevSerialized === serializedStoredTypographyOverrides) return prev;
      return normalizedStoredStyleTypographyOverrides;
    });
  }, [normalizedStoredStyleTypographyOverrides, serializedStoredTypographyOverrides]);

  const extractionStatus = (wpStyleProfileQuery.data?.latestExtraction?.status || "").toLowerCase();
  const shouldApplyWpStyle = isWpConnected && !!wpStyleProfileQuery.data?.profile && (extractionStatus === "success" || extractionStatus === "partial");
  const styleProfileForPreview = React.useMemo(
    () =>
      shouldApplyWpStyle
        ? applyMassicStyleOverrides(wpStyleProfileQuery.data?.profile, {
            colors: styleColorOverridesDraft,
            typography: styleTypographyOverridesDraft,
          })
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
  const extractedStyleColors = React.useMemo(() => {
    const extractedProfile = wpStyleProfileQuery.data?.extractedProfile as { colors?: Record<string, unknown> } | undefined;
    return (extractedProfile?.colors || {}) as Record<string, unknown>;
  }, [wpStyleProfileQuery.data?.extractedProfile]);
  const effectiveProfileColors = React.useMemo(() => {
    const profile = wpStyleProfileQuery.data?.profile as { colors?: Record<string, unknown> } | undefined;
    return (profile?.colors || {}) as Record<string, unknown>;
  }, [wpStyleProfileQuery.data?.profile]);
  const normalizeAnyColor = React.useCallback((value: unknown) => {
    if (typeof value !== "string") return null;
    return normalizeMassicStyleColorOverrides({ colors: { primary: value } }).colors?.primary || null;
  }, []);
  const extractedColorByKey = React.useMemo(() => {
    const next: Partial<Record<MassicStyleColorKey, string>> = {};
    for (const key of MASSIC_STYLE_COLOR_KEYS) {
      const extracted = normalizeAnyColor(extractedStyleColors[key]);
      const profileFallback = normalizeAnyColor(effectiveProfileColors[key]);
      if (extracted) next[key] = extracted;
      else if (profileFallback) next[key] = profileFallback;
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
    setStyleColorOverridesDraft((prev) => ({
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
    setStyleColorOverridesDraft((prev) => {
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

  const [previewEditMode, setPreviewEditMode] = React.useState<PreviewEditMode>("text");
  const [activeLinkEditor, setActiveLinkEditor] = React.useState<ActiveLinkEditorState | null>(null);
  const [linkHrefDraft, setLinkHrefDraft] = React.useState("");
  const [linkLabelDraft, setLinkLabelDraft] = React.useState("");
  const [linkHrefError, setLinkHrefError] = React.useState<string | null>(null);
  const [activeTextEditor, setActiveTextEditor] = React.useState<ActiveTextEditorState | null>(null);
  const [activeMediaEditor, setActiveMediaEditor] = React.useState<ActiveMediaEditorState | null>(null);
  const [activeLayoutEditor, setActiveLayoutEditor] = React.useState<ActiveLayoutEditorState | null>(null);
  const [spacingDraft, setSpacingDraft] = React.useState<EditableSpacingValue>(createEmptySpacingValue);
  const [hoveredLayoutId, setHoveredLayoutId] = React.useState<string | null>(null);
  const [insertDialogOpen, setInsertDialogOpen] = React.useState(false);
  const [insertAnchor, setInsertAnchor] = React.useState<InsertAnchor>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [layoutDeleteDialogOpen, setLayoutDeleteDialogOpen] = React.useState(false);
  const [selectionFormats, setSelectionFormats] = React.useState<{ bold: boolean; italic: boolean; underline: boolean; strike: boolean }>({ bold: false, italic: false, underline: false, strike: false });
  const [isAiRefineExpanded, setIsAiRefineExpanded] = React.useState(false);

  const sourceHtmlRef = React.useRef("");
  const textNodeIndexRef = React.useRef<EditableTextNodeRef[]>([]);
  const linkIndexRef = React.useRef<EditableLinkRef[]>([]);
  const spacingIndexRef = React.useRef<EditableSpacingRef[]>([]);
  const layoutIndexRef = React.useRef<EditableLayoutNode[]>([]);
  const slotIndexRef = React.useRef<EditableSlotNode[]>([]);
  const blockIndexRef = React.useRef<EditableBlockNode[]>([]);
  const sectionIndexRef = React.useRef<EditableSectionRef[]>([]);
  const undoStackRef = React.useRef<string[]>([]);
  const redoStackRef = React.useRef<string[]>([]);
  const editsRef = React.useRef<Record<string, string>>({});
  const linkEditsRef = React.useRef<Record<string, string>>({});
  const linkLabelEditsRef = React.useRef<Record<string, string>>({});
  const spacingEditsRef = React.useRef<Record<string, EditableSpacingValue>>({});
  const saveTimerRef = React.useRef<number | null>(null);
  const isSavingRef = React.useRef(false);
  const queuedSaveRef = React.useRef(false);
  const previewContainerRef = React.useRef<HTMLDivElement | null>(null);
  const lastRenderedHtmlRef = React.useRef("");
  const isEditorFocusedRef = React.useRef(false);
  const isInitialLoadRef = React.useRef(true);
  const lastSavedHtmlRef = React.useRef("");
  const lastStatusRef = React.useRef<string>("");
  const hasLocalEditsRef = React.useRef(false);
  const isEditingSessionRef = React.useRef(false);
  const lastCommittedHtmlRef = React.useRef("");
  const pendingBackgroundRefetchRef = React.useRef(false);
  const lastAppliedActiveTextSignatureRef = React.useRef("");
  const pendingReselectRef = React.useRef<boolean>(false);
  const pendingScrollToInsertRef = React.useRef<boolean>(false);
  const savedTextSelectionRef = React.useRef<{ range: Range; textId: string | null } | null>(null);

  const status = (data?.status || "").toString().toLowerCase();
  const isProcessing = status === "pending" || status === "processing";
  const hasFinalContent = canonicalizeHtml(sourceHtmlRef.current).length > 0;

  const normalizeEditorHtml = React.useCallback((html: string) => {
    const sanitized = ensureMassicContentWrapper(sanitizePageHtml(html));
    const upgraded = upgradeLegacySplitLayouts(sanitized);
    return ensureMassicContentWrapper(normalizeLayoutHtml(upgraded));
  }, []);

  const validateEditorHtml = React.useCallback((html: string): LayoutValidationResult => {
    return validatePublishableLayoutHtml(html);
  }, []);

  const composeCurrentHtml = React.useCallback(() => {
    const mergedText = applyTextEditsToHtml(sourceHtmlRef.current, textNodeIndexRef.current, editsRef.current);
    const mergedLinks = applyLinkEditsToHtml(mergedText, linkIndexRef.current, linkEditsRef.current);
    const mergedLinkLabels = applyLinkLabelEditsToHtml(mergedLinks, linkIndexRef.current, linkLabelEditsRef.current);
    const mergedSpacing = applySpacingEditsToHtml(mergedLinkLabels, spacingIndexRef.current, spacingEditsRef.current);
    return normalizeEditorHtml(mergedSpacing);
  }, [normalizeEditorHtml]);

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

      const serverCanonical = canonicalizeHtml(normalizeEditorHtml(resolvePageContent(latestData)));
      const committedCanonical = canonicalizeHtml(lastCommittedHtmlRef.current);
      if (!committedCanonical) return;

      if (serverCanonical === committedCanonical) {
        hasLocalEditsRef.current = false;
        if (
          !isEditorFocusedRef.current &&
          Object.keys(editsRef.current).length === 0 &&
          Object.keys(linkEditsRef.current).length === 0 &&
          Object.keys(linkLabelEditsRef.current).length === 0 &&
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
      const validation = validateEditorHtml(nextHtml);
      if (!validation.isValid) {
        toast.error(validation.errors[0] || "Layout is invalid and could not be saved.");
        return;
      }
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
      const submittedLinkLabelEdits = { ...linkLabelEditsRef.current };
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

        const remainingLinkLabelEdits = { ...linkLabelEditsRef.current };
        for (const [id, value] of Object.entries(submittedLinkLabelEdits)) {
          if (remainingLinkLabelEdits[id] === value) {
            delete remainingLinkLabelEdits[id];
          }
        }
        linkLabelEditsRef.current = remainingLinkLabelEdits;

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
          layoutIndexRef.current = committedModel.layoutIndex;
          slotIndexRef.current = committedModel.slotIndex;
          blockIndexRef.current = committedModel.blockIndex;
          sectionIndexRef.current = committedModel.sectionIndex;
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
    [composeCurrentHtml, runBackgroundRefetch, updatePageContentRequest, validateEditorHtml, normalizeEditorHtml]
  );

  React.useEffect(() => {
    if (!data) return;

    const nextStatus = (data?.status || "").toString().toLowerCase();
    const previousStatus = lastStatusRef.current;
    const wasPolling = previousStatus === "pending" || previousStatus === "processing";
    const isPolling = nextStatus === "pending" || nextStatus === "processing";
    const transitionedFromPollingToTerminal = wasPolling && !isPolling;
    const rawPage = resolvePageContent(data);
    const sanitized = normalizeEditorHtml(rawPage);
    const serverCanonical = canonicalizeHtml(sanitized);
    const localCanonical = canonicalizeHtml(lastSavedHtmlRef.current);
    const hasPendingEdits =
      Object.keys(editsRef.current).length > 0 ||
      Object.keys(linkEditsRef.current).length > 0 ||
      Object.keys(linkLabelEditsRef.current).length > 0 ||
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
    layoutIndexRef.current = model.layoutIndex;
    slotIndexRef.current = model.slotIndex;
    blockIndexRef.current = model.blockIndex;
    sectionIndexRef.current = model.sectionIndex;
    editsRef.current = {};
    linkEditsRef.current = {};
    linkLabelEditsRef.current = {};
    spacingEditsRef.current = {};
    lastSavedHtmlRef.current = canonicalizeHtml(sanitized);
    setTextNodeIndex(model.textNodeIndex);
    setPreviewHtml(model.previewHtml);
    setActiveLinkEditor(null);
    setActiveMediaEditor(null);
    setActiveTextEditor(null);
    setLinkHrefDraft("");
    setLinkLabelDraft("");
    setLinkHrefError(null);
    setActiveLayoutEditor(null);
    setSpacingDraft(createEmptySpacingValue());
    setHoveredLayoutId(null);

    if (isInitialLoadRef.current) {
      window.setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 250);
    }
  }, [data, normalizeEditorHtml]);

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

  const buildPublishPayload = React.useCallback(
    (targetStatus: "draft" | "publish") => ({
      connectionId: String(wpConnection?.connectionId || ""),
      status: targetStatus,
      workflowSource: "infer_ai" as const,
      workflowPayload: data || {},
      contentId: String(publishContentId),
      type: publishType,
      title: String(publishTitle),
      slug: normalizedSlugForPublish || null,
      contentMarkdown: extractPlainTextFromHtml(previewHtml),
      contentHtml: previewHtml,
      excerpt: null,
      head: { title: String(publishTitle), meta: { description: undefined } },
    }),
    [data, previewHtml, publishContentId, publishTitle, publishType, normalizedSlugForPublish, wpConnection?.connectionId]
  );

  const runSlugCheck = React.useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!isWpConnected || !wpConnection?.connectionId || !publishContentId) return null;
      if (!normalizedEditableSlug) {
        setSlugCheckResult(null);
        setSlugCheckError("Slug is required.");
        lastAutoSlugCheckKeyRef.current = "";
        return null;
      }
      if (hasInvalidBlogSlug) {
        setSlugCheckResult(null);
        setSlugCheckError("Page slug must be a single segment (no nested '/' paths).");
        lastAutoSlugCheckKeyRef.current = "";
        return null;
      }
      const checkKey = `${wpConnection.connectionId}:${String(publishContentId)}:${publishType}:${normalizedSlugForPublish}`;
      if (!force && lastAutoSlugCheckKeyRef.current === checkKey) return null;
      if (!force) lastAutoSlugCheckKeyRef.current = checkKey;
      setIsSlugChecking(true);
      setSlugCheckError(null);
      try {
        const response = await slugCheckMutateAsync({
          connectionId: String(wpConnection.connectionId),
          contentId: String(publishContentId),
          type: publishType,
          slug: normalizedSlugForPublish,
        });
        const result = response?.data || null;
        setSlugCheckResult(result);
        return result;
      } catch (err: unknown) {
        const message = (err as { message?: string })?.message || "Failed to check slug in WordPress.";
        setSlugCheckResult(null);
        setSlugCheckError(message);
        return null;
      } finally {
        setIsSlugChecking(false);
      }
    },
    [
      hasInvalidBlogSlug,
      isWpConnected,
      normalizedEditableSlug,
      normalizedSlugForPublish,
      publishContentId,
      publishType,
      slugCheckMutateAsync,
      wpConnection?.connectionId,
    ]
  );

  React.useEffect(() => {
    if (!isPublishModalOpen) return;
    if (isSlugEdited) return;
    setEditableSlug(normalizeWordpressBlogEditableSlug(effectiveModalSlug));
  }, [effectiveModalSlug, isPublishModalOpen, isSlugEdited]);

  React.useEffect(() => {
    if (isPublishModalOpen) {
      setPollingDisabled(true);
      return;
    }
    setPollingDisabled(false);
  }, [isPublishModalOpen]);

  React.useEffect(() => {
    if (!isPublishModalOpen || !isWpConnected || !wpConnection?.connectionId || !publishContentId) return;
    void contentStatusQuery.refetch();
  }, [isPublishModalOpen, isWpConnected, publishContentId, wpConnection?.connectionId]);

  React.useEffect(() => {
    if (!isPublishModalOpen) return;
    setIsSlugEdited(false);
    setSlugCheckResult(null);
    setSlugCheckError(null);
    setIsAutoResolvingSlug(false);
    lastAutoSlugCheckKeyRef.current = "";
  }, [isPublishModalOpen]);

  React.useEffect(() => {
    if (!isEmbeddedPreviewOpen || !isEmbeddedPreviewLoading) return;
    const t = window.setTimeout(() => setShowEmbedFallbackHint(true), 8000);
    return () => window.clearTimeout(t);
  }, [isEmbeddedPreviewLoading, isEmbeddedPreviewOpen]);

  React.useEffect(() => {
    if (!isPublishModalOpen || !isWpConnected || !wpConnection?.connectionId || !publishContentId) return;
    if (!normalizedEditableSlug) {
      setSlugCheckResult(null);
      setSlugCheckError(isSlugEdited ? "Slug is required." : null);
      lastAutoSlugCheckKeyRef.current = "";
      return;
    }
    if (hasInvalidBlogSlug) {
      setSlugCheckResult(null);
      setSlugCheckError("Page slug must be a single segment (no nested '/' paths).");
      lastAutoSlugCheckKeyRef.current = "";
      return;
    }
    const delayMs = isSlugEdited ? 350 : 0;
    const timer = window.setTimeout(() => void runSlugCheck(), delayMs);
    return () => window.clearTimeout(timer);
  }, [isPublishModalOpen, hasInvalidBlogSlug, isWpConnected, isSlugEdited, normalizedEditableSlug, publishContentId, runSlugCheck, wpConnection?.connectionId]);

  const handleRedirectToChannels = React.useCallback(() => {
    router.push(`/business/${businessId}/web?integrations=1`);
    setIsPublishModalOpen(false);
  }, [businessId, router]);

  const handlePublishDraft = React.useCallback(async () => {
    if (!isWpConnected || !wpConnection?.connectionId || !hasFinalContent) return;
    let result;
    try {
      result = await wpPublishMutation.mutateAsync(buildPublishPayload("draft"));
    } catch (error) {
      const e = error as WordpressPublishError;
      if (e?.code === "slug_conflict") {
        const details = e?.details || {};
        const reason = (typeof details?.reason === "string" ? details.reason : (details?.conflict as WordpressSlugConflictInfo | null)?.reason) || null;
        setSlugCheckResult({
          slug: normalizedSlugForPublish,
          publishUrl: publishUrlPreview || null,
          exists: true,
          sameMappedContent: false,
          conflict: (details?.conflict as WordpressSlugConflictInfo) || null,
          suggestedSlug: typeof details?.suggestedSlug === "string" ? details.suggestedSlug : null,
          mappedToDifferentContent: false,
          mappedContentId: null,
        });
        setSlugCheckError(reason === "parent_type_conflict" ? "Nested parent path conflict" : "Slug conflict: choose a unique slug");
        toast.error("Slug conflict: choose a unique slug");
      }
      return;
    }
    const published = result?.data;
    if (!published) return;
    setLastPublishedData({
      contentId: published.contentId,
      wpId: published.wpId,
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "draft",
      slug: published.slug || normalizedSlugForPublish || null,
    });
    toast.success("Draft pushed to WordPress");
    const previewRes = await wpPreviewMutation.mutateAsync({
      connectionId: wpConnection.connectionId,
      contentId: published.contentId,
      wpId: published.wpId,
    });
    const previewUrl = previewRes?.data?.previewUrl;
    if (previewUrl) {
      setLastPublishedData((prev) => (prev ? { ...prev, previewUrl } : prev));
      openEmbeddedPreview(previewUrl, "WordPress Draft Preview");
      toast.success("Preview ready");
    }
    void contentStatusQuery.refetch();
  }, [buildPublishPayload, contentStatusQuery, hasFinalContent, isWpConnected, wpConnection?.connectionId, openEmbeddedPreview, wpPreviewMutation, wpPublishMutation, normalizedSlugForPublish, publishUrlPreview]);

  const handlePublishLive = React.useCallback(async () => {
    if (!isWpConnected || !wpConnection?.connectionId || !hasFinalContent) return;
    if (!isPersistedDraftLike && !lastPublishedData?.wpId) {
      toast.error("Publish draft first to generate a preview");
      return;
    }
    let result;
    try {
      result = await wpPublishMutation.mutateAsync(buildPublishPayload("publish"));
    } catch (error) {
      const e = error as WordpressPublishError;
      if (e?.code === "slug_conflict") {
        const details = e?.details || {};
        const reason = (typeof details?.reason === "string" ? details.reason : (details?.conflict as WordpressSlugConflictInfo | null)?.reason) || null;
        setSlugCheckResult({
          slug: normalizedSlugForPublish,
          publishUrl: publishUrlPreview || null,
          exists: true,
          sameMappedContent: false,
          conflict: (details?.conflict as WordpressSlugConflictInfo) || null,
          suggestedSlug: typeof details?.suggestedSlug === "string" ? details.suggestedSlug : null,
          mappedToDifferentContent: false,
          mappedContentId: null,
        });
        setSlugCheckError(reason === "parent_type_conflict" ? "Nested parent path conflict" : "Slug conflict: choose a unique slug");
        toast.error("Slug conflict: choose a unique slug");
      }
      return;
    }
    const published = result?.data;
    if (!published) return;
    setLastPublishedData((prev) => ({
      ...prev,
      contentId: published.contentId,
      wpId: published.wpId,
      permalink: published.permalink || null,
      editUrl: published.editUrl || null,
      status: published.status || "publish",
      slug: published.slug || normalizedSlugForPublish || null,
    }));
    toast.success("Published live to WordPress");
    void contentStatusQuery.refetch();
    setIsPublishModalOpen(false);
  }, [buildPublishPayload, contentStatusQuery, hasFinalContent, isWpConnected, isPersistedDraftLike, lastPublishedData?.wpId, wpConnection?.connectionId, wpPublishMutation, normalizedSlugForPublish, publishUrlPreview]);

  const handleOpenPreview = React.useCallback(async () => {
    const wpIdToUse = persistedContent?.wpId || lastPublishedData?.wpId;
    if (!wpConnection?.connectionId || !wpIdToUse) {
      toast.error("Draft not found for preview");
      return;
    }
    const res = await wpPreviewMutation.mutateAsync({
      connectionId: wpConnection.connectionId,
      contentId: String(publishContentId),
      wpId: Number(wpIdToUse),
    });
    const url = res?.data?.previewUrl;
    if (!url) return;
    setLastPublishedData((prev) =>
      prev ? { ...prev, previewUrl: url } : { contentId: String(publishContentId), wpId: Number(wpIdToUse), permalink: persistedContent?.permalink || null, editUrl: null, status: persistedStatus || "draft", slug: persistedContent?.slug || normalizedSlugForPublish || null, previewUrl: url }
    );
    openEmbeddedPreview(url, "WordPress Draft Preview");
  }, [lastPublishedData?.wpId, persistedContent?.permalink, persistedContent?.slug, persistedContent?.wpId, persistedStatus, publishContentId, wpConnection?.connectionId, openEmbeddedPreview, wpPreviewMutation, normalizedSlugForPublish]);

  const handleChangeWordpressStatus = React.useCallback(
    async (targetStatus: "draft" | "trash") => {
      if (!isWpConnected || !wpConnection?.connectionId || !publishContentId) return;
      const res = await wpUnpublishMutation.mutateAsync({
        connectionId: String(wpConnection.connectionId),
        contentId: String(publishContentId),
        targetStatus,
      });
      const d = res?.data;
      if (d) {
        setLastPublishedData((prev) => (prev ? { ...prev, status: d.status || targetStatus, permalink: null, previewUrl: undefined } : prev));
      }
      setIsEmbeddedPreviewOpen(false);
      toast.success(targetStatus === "trash" ? "Deleted in WordPress (moved to trash)" : "Moved to draft in WordPress");
      await contentStatusQuery.refetch();
      if (targetStatus === "trash") setIsPublishModalOpen(false);
    },
    [contentStatusQuery, isWpConnected, publishContentId, wpConnection?.connectionId, wpUnpublishMutation]
  );

  const isSlugActionBusy = isPublishBusy || isSlugChecking || isAutoResolvingSlug;

  const confirmAndRunPublishAction = React.useCallback(() => {
    if (confirmPublishAction === "draft") handlePublishDraft();
    else if (confirmPublishAction === "live") handlePublishLive();
    setConfirmPublishAction(null);
  }, [confirmPublishAction, handlePublishDraft, handlePublishLive]);

  const autoResolveSlug = React.useCallback(async () => {
    if (!slugCheckResult?.suggestedSlug || isSlugActionBusy) return;
    setIsAutoResolvingSlug(true);
    setEditableSlug(normalizeWordpressBlogEditableSlug(slugCheckResult.suggestedSlug));
    setIsSlugEdited(false);
    lastAutoSlugCheckKeyRef.current = "";
    await runSlugCheck({ force: true });
    setIsAutoResolvingSlug(false);
  }, [isSlugActionBusy, runSlugCheck, slugCheckResult?.suggestedSlug]);

  // Manage innerHTML via ref instead of dangerouslySetInnerHTML so that
  // re-renders (from hover/selection state changes) never recreate iframes.
  React.useLayoutEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    if (lastRenderedHtmlRef.current === previewHtml) return;
    lastRenderedHtmlRef.current = previewHtml;
    container.innerHTML = previewHtml;

    if (pendingReselectRef.current) {
      pendingReselectRef.current = false;
      const marked = container.querySelector(`[${RESELECT_MARKER_ATTR}]`) as HTMLElement | null;
      if (marked) {
        marked.removeAttribute(RESELECT_MARKER_ATTR);
        requestAnimationFrame(() => marked.click());
      }
    }

    if (pendingScrollToInsertRef.current) {
      pendingScrollToInsertRef.current = false;
      const inserted = container.querySelector('[data-massic-inserted]') as HTMLElement | null;
      if (inserted) {
        inserted.removeAttribute('data-massic-inserted');
        requestAnimationFrame(() => {
          inserted.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (previewEditMode === 'layout') {
            setTimeout(() => inserted.click(), 350);
          }
        });
      }
    }
  }, [previewHtml, previewEditMode]);

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
    if (ref.nodeKind === "layout") return "Layout Container";
    const rawClasses = String(ref.className || "")
      .split(/\s+/)
      .map((name) => name.trim())
      .filter(Boolean);
    const preferredClass = rawClasses.find((className) => className.startsWith("massic-")) || rawClasses[0];
    if (preferredClass) {
      const FRIENDLY: Record<string, string> = {
        "massic-card": "Card",
        "massic-container": "Container",
        "massic-grid": "Grid",
        "massic-split": "Split Layout",
        "massic-feature": "Feature",
        "massic-hero": "Hero",
        "massic-cta": "CTA",
        "massic-cta-band": "CTA Band",
        "massic-section": "Section",
        "massic-stats": "Stats",
        "massic-stat": "Stat Item",
        "massic-testimonial": "Testimonial",
        "massic-faq": "FAQ",
        "massic-alert": "Alert",
        "massic-step": "Step",
        "massic-stack": "Stack",
        "massic-actions": "Actions",
        "massic-video-wrap": "Video",
        "massic-comparison-table": "Table",
      };
      return FRIENDLY[preferredClass] || preferredClass.replace("massic-", "").replace(/-/g, " ");
    }
    const TAG_LABELS: Record<string, string> = {
      img: "Image",
      iframe: "Video",
      p: "Paragraph",
      blockquote: "Quote",
      h1: "Heading",
      h2: "Heading",
      h3: "Heading",
      h4: "Heading",
      h5: "Heading",
      h6: "Heading",
      ul: "List",
      ol: "List",
      li: "List Item",
      details: "Details",
      summary: "Summary",
    };
    if (TAG_LABELS[ref.tagName]) return TAG_LABELS[ref.tagName];
    return ref.tagName === "div" ? "Container" : ref.tagName;
  }, []);

  const applySpacingPreviewToTarget = React.useCallback((spacingId: string, spacing: EditableSpacingValue | null) => {
    const target = previewContainerRef.current?.querySelector(
      `[data-massic-spacing-id="${spacingId}"]`
    ) as HTMLElement | null;
    if (!target) return;
    const marginProps = ["margin-top", "margin-bottom", "margin-left", "margin-right"] as const;
    for (const prop of marginProps) {
      target.style.removeProperty(prop);
    }
    if (!spacing) return;
    const styleStr = buildSpacingStyleString(spacing);
    if (!styleStr) return;
    for (const part of styleStr.split(";")) {
      const colonIdx = part.indexOf(":");
      if (colonIdx < 1) continue;
      const prop = part.slice(0, colonIdx).trim();
      const val = part.slice(colonIdx + 1).trim();
      target.style.setProperty(prop, val);
    }
  }, []);

  const getPreviewTextElement = React.useCallback((target: Node | null) => {
    if (!target) return null;
    if (target instanceof HTMLElement) {
      return target.closest("[data-massic-text-id]") as HTMLElement | null;
    }
    const parent = target.parentElement;
    return parent?.closest("[data-massic-text-id]") as HTMLElement | null;
  }, []);

  const getPreviewTextOwnerElement = React.useCallback((target: HTMLElement | null) => {
    if (!target) return null;
    return target.closest(TEXT_OWNER_SELECTOR) as HTMLElement | null;
  }, []);

  const getPreviewTextOwnersForRange = React.useCallback((range: Range) => {
    const container = previewContainerRef.current;
    if (!container) return [] as HTMLElement[];
    return Array.from(
      container.querySelectorAll(TEXT_OWNER_SELECTOR)
    ).filter((node) => {
      try {
        return range.intersectsNode(node);
      } catch {
        return false;
      }
    }) as HTMLElement[];
  }, []);

  const persistPreviewSelection = React.useCallback((selectionInput?: Selection | null) => {
    const container = previewContainerRef.current;
    const selection = selectionInput ?? window.getSelection();
    if (!container || !selection || selection.rangeCount === 0) {
      savedTextSelectionRef.current = null;
      return;
    }

    const range = selection.getRangeAt(0);
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      savedTextSelectionRef.current = null;
      return;
    }

    const startTextElement = getPreviewTextElement(range.startContainer);
    const endTextElement = getPreviewTextElement(range.endContainer);
    const startOwner = getPreviewTextOwnerElement(startTextElement);
    const endOwner = getPreviewTextOwnerElement(endTextElement);
    const owners = getPreviewTextOwnersForRange(range);
    if (!startOwner || !endOwner || owners.length === 0) {
      savedTextSelectionRef.current = null;
      return;
    }

    savedTextSelectionRef.current = {
      range: range.cloneRange(),
      textId: startTextElement?.dataset.massicTextId || endTextElement?.dataset.massicTextId || null,
    };
  }, [getPreviewTextElement, getPreviewTextOwnerElement, getPreviewTextOwnersForRange]);

  const restoreSavedPreviewSelection = React.useCallback(() => {
    const saved = savedTextSelectionRef.current;
    const selection = window.getSelection();
    if (!saved || !selection) return selection;

    try {
      selection.removeAllRanges();
      selection.addRange(saved.range.cloneRange());
    } catch {
      savedTextSelectionRef.current = null;
    }

    return selection;
  }, []);

  const getSavedPreviewSelectionContext = React.useCallback(() => {
    const container = previewContainerRef.current;
    if (!container) return null;

    const highlightedSelection = container.querySelector(
      `[${AI_SELECTION_ATTR}="true"]`
    ) as HTMLElement | null;
    if (highlightedSelection) {
      const owner = highlightedSelection.closest(TEXT_OWNER_SELECTOR) as HTMLElement | null;
      if (!owner) return null;
      const range = document.createRange();
      range.selectNodeContents(highlightedSelection);
      return {
        range,
        owner,
        owners: [owner],
        textId:
          highlightedSelection.closest("[data-massic-text-id]")?.getAttribute("data-massic-text-id") ||
          savedTextSelectionRef.current?.textId ||
          null,
        surroundingContext: normalizeSelectedText(owner.textContent || ""),
      };
    }

    const savedRange = savedTextSelectionRef.current?.range?.cloneRange();
    const liveSelection = window.getSelection();
    const liveRange = liveSelection && liveSelection.rangeCount > 0
      ? liveSelection.getRangeAt(0).cloneRange()
      : null;
    const range = savedRange || liveRange;
    if (!range || range.collapsed) return null;

    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      return null;
    }

    const startTextElement = getPreviewTextElement(range.startContainer);
    const endTextElement = getPreviewTextElement(range.endContainer);
    const startOwner = getPreviewTextOwnerElement(startTextElement);
    const endOwner = getPreviewTextOwnerElement(endTextElement);
    const owners = getPreviewTextOwnersForRange(range);
    if (!startOwner || !endOwner || owners.length === 0) {
      return null;
    }

    return {
      range,
      owner: startOwner,
      owners,
      textId:
        savedTextSelectionRef.current?.textId ||
        startTextElement?.dataset.massicTextId ||
        endTextElement?.dataset.massicTextId ||
        null,
      surroundingContext: owners
        .map((owner) => normalizeSelectedText(owner.textContent || ""))
        .filter(Boolean)
        .join("\n\n"),
    };
  }, [getPreviewTextElement, getPreviewTextOwnerElement, getPreviewTextOwnersForRange]);

  const clearAiSelectionHighlight = React.useCallback(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    const highlightedNodes = Array.from(
      container.querySelectorAll(`[${AI_SELECTION_ATTR}="true"]`)
    );
    highlightedNodes.forEach((node) => {
      unwrapElementPreservingChildren(node);
    });
    const highlightedOwners = Array.from(
      container.querySelectorAll(`[${AI_SELECTION_OWNER_ATTR}="true"]`)
    );
    highlightedOwners.forEach((node) => {
      (node as HTMLElement).removeAttribute(AI_SELECTION_OWNER_ATTR);
    });
  }, []);

  const applyAiSelectionHighlight = React.useCallback(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    clearAiSelectionHighlight();

    const selectionContext = getSavedPreviewSelectionContext();
    if (!selectionContext) return;

    const selectedText = normalizeSelectedText(selectionContext.range.toString());
    if (!selectedText) return;

    if (selectionContext.owners.length > 1) {
      selectionContext.owners.forEach((owner) => {
        owner.setAttribute(AI_SELECTION_OWNER_ATTR, "true");
      });
      savedTextSelectionRef.current = {
        range: selectionContext.range.cloneRange(),
        textId: selectionContext.textId,
      };
      return;
    }

    const wrapper = document.createElement("span");
    wrapper.setAttribute(AI_SELECTION_ATTR, "true");
    const fragment = selectionContext.range.extractContents();
    wrapper.appendChild(fragment);
    selectionContext.range.insertNode(wrapper);

    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    savedTextSelectionRef.current = {
      range: nextRange.cloneRange(),
      textId: selectionContext.textId,
    };
  }, [clearAiSelectionHighlight, getSavedPreviewSelectionContext]);

  const createPlainTextFragment = React.useCallback((value: string) => {
    const fragment = document.createDocumentFragment();
    const normalized = String(value || "").replace(/\r\n/g, "\n");
    const lines = normalized.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) {
        fragment.appendChild(document.createElement("br"));
      }
      fragment.appendChild(document.createTextNode(line));
    });
    return fragment;
  }, []);

  const splitRefinedTextIntoBlocks = React.useCallback((value: string) => {
    const normalized = String(value || "").replace(/\r\n/g, "\n").trim();
    if (!normalized) return [];
    const blocks = normalized
      .split(/\n\s*\n+/)
      .map((block) => block.trim())
      .filter(Boolean);
    if (blocks.length > 1) return blocks;
    return normalized
      .split("\n")
      .map((block) => block.trim())
      .filter(Boolean);
  }, []);

  const sanitizeClonedTextOwner = React.useCallback((element: HTMLElement) => {
    element.removeAttribute("contenteditable");
    element.removeAttribute("spellcheck");
    element.removeAttribute("tabindex");
    element.removeAttribute("data-massic-text-editing");
    element.removeAttribute("data-massic-text-owner-selected");
    element.removeAttribute(AI_SELECTION_OWNER_ATTR);
  }, []);

  const describeTextOwnerForAi = React.useCallback((owner: HTMLElement) => {
    const tagName = owner.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tagName)) {
      return `heading (${tagName.toUpperCase()})`;
    }
    if (tagName === "p") return "paragraph";
    if (tagName === "li") return "list item";
    if (tagName === "blockquote") return "blockquote";
    if (tagName === "summary") return "summary";
    if (tagName === "details") return "details";
    if (tagName === "a") return "link";
    return tagName;
  }, []);

  const normalizeRefinedTextForOwner = React.useCallback((owner: HTMLElement, value: string) => {
    const tagName = owner.tagName.toLowerCase();
    const normalized = String(value || "").replace(/\r\n/g, "\n").trim();

    if (/^h[1-6]$/.test(tagName)) {
      return normalized.replace(/^#{1,6}\s+/, "").trim();
    }

    if (tagName === "li") {
      return normalized.replace(/^([-*+]|\d+\.)\s+/, "").trim();
    }

    return normalized;
  }, []);

  const splitRefinedTextAcrossOwners = React.useCallback((value: string, owners: HTMLElement[]) => {
    const cleaned = String(value || "").replace(/\r\n/g, "\n").trim();
    if (!owners.length) return [];
    if (!cleaned) return owners.map(() => "");

    const blocks = splitRefinedTextIntoBlocks(cleaned);
    if (blocks.length === owners.length) {
      return blocks;
    }

    if (blocks.length > owners.length) {
      return [
        ...blocks.slice(0, owners.length - 1),
        blocks.slice(owners.length - 1).join("\n\n"),
      ];
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (owners.length === 1 || words.length <= 1) {
      return [cleaned, ...owners.slice(1).map(() => "")].slice(0, owners.length);
    }

    const originalWordCounts = owners.map((owner) => {
      const ownerWords = normalizeSelectedText(owner.textContent || "")
        .split(/\s+/)
        .filter(Boolean);
      return Math.max(1, ownerWords.length);
    });

    const result: string[] = [];
    let cursor = 0;

    for (let index = 0; index < owners.length; index += 1) {
      const remainingOwners = owners.length - index;
      const remainingWords = words.length - cursor;

      if (index === owners.length - 1) {
        result.push(words.slice(cursor).join(" "));
        break;
      }

      const remainingOriginalWords = originalWordCounts
        .slice(index)
        .reduce((sum, count) => sum + count, 0);
      const proportionalTake = Math.round(
        (originalWordCounts[index]! / remainingOriginalWords) * remainingWords
      );
      const takeCount = Math.max(
        1,
        Math.min(proportionalTake, remainingWords - (remainingOwners - 1))
      );

      result.push(words.slice(cursor, cursor + takeCount).join(" "));
      cursor += takeCount;
    }

    while (result.length < owners.length) {
      result.push("");
    }

    return result.slice(0, owners.length);
  }, [splitRefinedTextIntoBlocks]);

  const serializePreviewDomToSourceHtml = React.useCallback(() => {
    const container = previewContainerRef.current;
    if (!container) return sourceHtmlRef.current;
    const clone = container.cloneNode(true) as HTMLDivElement;

    const textWrappers = Array.from(clone.querySelectorAll("[data-massic-text-id]"));
    textWrappers.forEach((node) => {
      unwrapElementPreservingChildren(node);
    });

    const aiSelectionWrappers = Array.from(
      clone.querySelectorAll(`[${AI_SELECTION_ATTR}="true"]`)
    );
    aiSelectionWrappers.forEach((node) => {
      unwrapElementPreservingChildren(node);
    });

    const elements = Array.from(clone.querySelectorAll("*"));
    elements.forEach((element) => {
      Array.from(element.attributes).forEach((attr) => {
        if (attr.name.startsWith("data-massic-")) {
          element.removeAttribute(attr.name);
        }
      });
      element.removeAttribute("title");
      element.removeAttribute("contenteditable");
      element.removeAttribute("spellcheck");
      element.removeAttribute("tabindex");
      element.classList.remove("massic-text-editable");
      if (!element.className.trim()) {
        element.removeAttribute("class");
      }
    });

    return normalizeEditorHtml(clone.innerHTML);
  }, [normalizeEditorHtml]);

  const commitPreviewDomToSource = React.useCallback(() => {
    const nextHtml = serializePreviewDomToSourceHtml();
    if (canonicalizeHtml(nextHtml) === canonicalizeHtml(sourceHtmlRef.current)) {
      return nextHtml;
    }
    sourceHtmlRef.current = nextHtml;
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) {
      setPollingDisabled(true);
    }
    setIsDirty(true);
    return nextHtml;
  }, [pollingDisabled, serializePreviewDomToSourceHtml]);

  const applyTextStyleToPreviewOwner = React.useCallback((element: HTMLElement, style: Partial<EditableTextStyleValue>) => {
    if (style.bold !== undefined) {
      if (style.bold) {
        element.style.setProperty("font-weight", "700");
      } else {
        element.style.removeProperty("font-weight");
      }
    }

    if (style.italic !== undefined) {
      if (style.italic) {
        element.style.setProperty("font-style", "italic");
      } else {
        element.style.removeProperty("font-style");
      }
    }

    if (style.align !== undefined) {
      if (style.align && style.align !== "left") {
        element.style.setProperty("text-align", style.align);
      } else {
        element.style.removeProperty("text-align");
      }
    }

    if (style.lineHeight !== undefined) {
      if (style.lineHeight.trim()) {
        element.style.setProperty("line-height", style.lineHeight.trim());
      } else {
        element.style.removeProperty("line-height");
      }
    }

    if (style.letterSpacing !== undefined) {
      if (style.letterSpacing.trim()) {
        element.style.setProperty("letter-spacing", style.letterSpacing.trim());
      } else {
        element.style.removeProperty("letter-spacing");
      }
    }

    if (style.underline !== undefined || style.strike !== undefined) {
      const parts: string[] = [];
      const computedDecoration = String(element.style.textDecoration || element.style.textDecorationLine || "").toLowerCase();
      const underline = style.underline ?? computedDecoration.includes("underline");
      const strike = style.strike ?? computedDecoration.includes("line-through");
      if (underline) parts.push("underline");
      if (strike) parts.push("line-through");
      if (parts.length) {
        element.style.setProperty("text-decoration", parts.join(" "));
      } else {
        element.style.removeProperty("text-decoration");
        element.style.removeProperty("text-decoration-line");
      }
    }
  }, []);

  React.useEffect(() => {
    if (!activeTextEditor) {
      lastAppliedActiveTextSignatureRef.current = "";
      return;
    }

    const signature = JSON.stringify({
      id: activeTextEditor.id,
      style: activeTextEditor.style,
    });
    if (signature === lastAppliedActiveTextSignatureRef.current) {
      return;
    }

    lastAppliedActiveTextSignatureRef.current = signature;
    const textElement = previewContainerRef.current?.querySelector(
      `[data-massic-text-id="${activeTextEditor.id}"]`
    ) as HTMLElement | null;
    const owner = getPreviewTextOwnerElement(textElement);
    if (!owner) {
      return;
    }

    applyTextStyleToPreviewOwner(owner, activeTextEditor.style);
    commitPreviewDomToSource();
  }, [activeTextEditor, applyTextStyleToPreviewOwner, commitPreviewDomToSource, getPreviewTextOwnerElement]);

  const pushUndo = React.useCallback(() => {
    const stack = undoStackRef.current;
    stack.push(sourceHtmlRef.current);
    if (stack.length > 30) stack.shift();
    redoStackRef.current = [];
  }, []);

  const closeActiveTextEditor = React.useCallback(() => {
    setActiveTextEditor(null);
    savedTextSelectionRef.current = null;
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(linkLabelEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  const openTextEditorForElement = React.useCallback((target: HTMLElement) => {
    if (!previewContainerRef.current) return;
    const info = getTextBlockInfoFromElement(target);
    const textTarget = target.closest("[data-massic-text-id]") as HTMLElement | null;
    if (!info || !textTarget) return;
    persistPreviewSelection();

    const container = previewContainerRef.current;
    const targetRect = textTarget.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const nextLeft = Math.max(
      8,
      Math.min(targetRect.left - containerRect.left + container.scrollLeft, container.scrollWidth - 360)
    );
    const nextTop = Math.max(8, targetRect.bottom - containerRect.top + container.scrollTop + 8);

    if (!activeTextEditor || activeTextEditor.id !== info.id) {
      pushUndo();
    }
    setActiveLinkEditor(null);
    setActiveMediaEditor(null);
    setLinkHrefError(null);
    setActiveTextEditor({
      id: info.id,
      label: info.label,
      text: info.text,
      style: info.style,
      left: Number.isFinite(nextLeft) ? nextLeft : 8,
      top: Number.isFinite(nextTop) ? nextTop : 8,
    });
    isEditorFocusedRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) {
      setPollingDisabled(true);
    }
  }, [activeTextEditor, persistPreviewSelection, pollingDisabled, pushUndo]);

  const updateActiveTextStyle = React.useCallback((patch: Partial<EditableTextStyleValue>) => {
    setActiveTextEditor((current) => current ? {
      ...current,
      style: {
        ...current.style,
        ...patch,
      },
    } : current);
  }, []);

  const handleApplyInlineTextFormat = React.useCallback((format: "bold" | "italic" | "underline" | "strike") => {
    let selection = window.getSelection();
    const container = previewContainerRef.current;

    const applyBlockFallback = () => {
      if (!activeTextEditor) return;
      const patch =
        format === "bold" ? { bold: !activeTextEditor.style.bold }
          : format === "italic" ? { italic: !activeTextEditor.style.italic }
            : format === "underline" ? { underline: !activeTextEditor.style.underline }
              : { strike: !activeTextEditor.style.strike };
      updateActiveTextStyle(patch);
    };

    if ((!selection || selection.rangeCount === 0 || selection.isCollapsed) && savedTextSelectionRef.current) {
      selection = restoreSavedPreviewSelection();
    }

    if (!selection || !container || selection.rangeCount === 0) {
      applyBlockFallback();
      return;
    }

    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer;
    const isInsidePreview = container.contains(commonNode) && container.contains(range.startContainer) && container.contains(range.endContainer);

    if (!isInsidePreview || selection.isCollapsed || !selection.toString().trim()) {
      applyBlockFallback();
      return;
    }

    const ownerElement = (() => {
      const el = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
      return el?.closest(TEXT_OWNER_SELECTOR) as HTMLElement | null;
    })();

    if (!ownerElement || !container.contains(ownerElement)) {
      applyBlockFallback();
      return;
    }

    pushUndo();

    const tagNames = getInlineFormatTagNames(format);
    const tagSelector = tagNames.join(",");

    const startFormatAncestor = (() => {
      let el = range.startContainer instanceof HTMLElement ? range.startContainer : range.startContainer.parentElement;
      while (el && el !== ownerElement && ownerElement.contains(el)) {
        if (tagNames.includes(el.tagName.toLowerCase())) return el;
        el = el.parentElement;
      }
      return null;
    })();
    const endFormatAncestor = (() => {
      let el = range.endContainer instanceof HTMLElement ? range.endContainer : range.endContainer.parentElement;
      while (el && el !== ownerElement && ownerElement.contains(el)) {
        if (tagNames.includes(el.tagName.toLowerCase())) return el;
        el = el.parentElement;
      }
      return null;
    })();

    const isAlreadyFormatted = !!(startFormatAncestor && endFormatAncestor && startFormatAncestor === endFormatAncestor);

    if (isAlreadyFormatted) {
      const formatAncestor = startFormatAncestor!;
      const parentNode = formatAncestor.parentNode;
      if (!parentNode) {
        commitPreviewDomToSource();
        return;
      }

      const beforeRange = document.createRange();
      beforeRange.setStart(formatAncestor, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);

      const afterRange = document.createRange();
      afterRange.setStart(range.endContainer, range.endOffset);
      afterRange.setEnd(formatAncestor, formatAncestor.childNodes.length);

      const beforeFragment = beforeRange.cloneContents();
      const middleFragment = stripInlineFormatFromFragment(range.cloneContents(), format);
      const afterFragment = afterRange.cloneContents();

      if (fragmentHasMeaningfulContent(beforeFragment)) {
        const beforeWrapper = formatAncestor.cloneNode(false) as HTMLElement;
        beforeWrapper.appendChild(beforeFragment);
        parentNode.insertBefore(beforeWrapper, formatAncestor);
      }

      const middleNodes = Array.from(middleFragment.childNodes);
      if (fragmentHasMeaningfulContent(middleFragment)) {
        parentNode.insertBefore(middleFragment, formatAncestor);
      }

      if (fragmentHasMeaningfulContent(afterFragment)) {
        const afterWrapper = formatAncestor.cloneNode(false) as HTMLElement;
        afterWrapper.appendChild(afterFragment);
        parentNode.insertBefore(afterWrapper, formatAncestor);
      }

      parentNode.removeChild(formatAncestor);
      if (middleNodes.length > 0) {
        const nextRange = document.createRange();
        nextRange.setStartBefore(middleNodes[0]!);
        nextRange.setEndAfter(middleNodes[middleNodes.length - 1]!);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        persistPreviewSelection(selection);
      } else {
        selection.removeAllRanges();
        savedTextSelectionRef.current = null;
      }
      setSelectionFormats({ bold: false, italic: false, underline: false, strike: false });
      commitPreviewDomToSource();
      return;
    }

    const tagName = format === "bold" ? "strong" : format === "italic" ? "em" : format === "underline" ? "u" : "s";

    const contents = range.extractContents();
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(contents);
    const existingFormats = tempDiv.querySelectorAll(tagSelector);
    existingFormats.forEach((el) => unwrapElementPreservingChildren(el));

    const wrapper = document.createElement(tagName);
    while (tempDiv.firstChild) {
      wrapper.appendChild(tempDiv.firstChild);
    }
    range.insertNode(wrapper);

    wrapper.normalize();

    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    persistPreviewSelection(selection);
    setSelectionFormats(detectInlineFormatsAtNode(wrapper, container));
    commitPreviewDomToSource();
  }, [activeTextEditor, commitPreviewDomToSource, persistPreviewSelection, pushUndo, restoreSavedPreviewSelection, updateActiveTextStyle]);

  const handleAiRefine = React.useCallback(
    async (_action: "custom", selectedText: string, customPrompt?: string) => {
      const instruction = customPrompt?.trim();
      if (!instruction) {
        throw new Error("Add an instruction to refine the selected text.");
      }

      const selectionContext = getSavedPreviewSelectionContext();
      if (!selectionContext) {
        throw new Error("Select text in the editor to refine it.");
      }

      const instructionWithStructure =
        selectionContext.owners.length > 1
          ? `${instruction}\n\nPreserve the same content structure as the selected text. Return exactly ${selectionContext.owners.length} blocks in this order: ${selectionContext.owners
              .map((owner) => describeTextOwnerForAi(owner))
              .join(", ")}. Do not merge headings and paragraphs into one paragraph.`
          : instruction;

      const response = await api.post<AiTextTransformResponse>(
        `/ai/text/transform?business_id=${encodeURIComponent(businessId)}`,
        "python",
        {
          selected_text: selectedText,
          instruction: instructionWithStructure,
          surrounding_context: selectionContext.surroundingContext || null,
        },
        {
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
        }
      );

      const revisedText = String(response?.revised_text || "").trim();
      if (!revisedText) {
        throw new Error("AI returned an empty refinement.");
      }

      return revisedText;
    },
    [businessId, describeTextOwnerForAi, getSavedPreviewSelectionContext]
  );

  const handleAcceptAiRefine = React.useCallback(
    (revisedText: string) => {
      const highlightedSelection = previewContainerRef.current?.querySelector(
        `[${AI_SELECTION_ATTR}="true"]`
      ) as HTMLElement | null;
      const selectionContext = getSavedPreviewSelectionContext();
      if (!selectionContext && !highlightedSelection) {
        toast.error("The selected text is no longer available.");
        return;
      }

      pushUndo();
      let insertedAnchor: Node | null = null;

      if (
        selectionContext &&
        selectionContext.owners.length > 1
      ) {
        const owners = selectionContext.owners;
        const firstOwner = owners[0] || null;
        const lastOwner = owners[owners.length - 1] || null;
        const firstParent = firstOwner?.parentNode || null;
        const mappedBlocks = splitRefinedTextAcrossOwners(revisedText, owners);
        const canReplaceAsBlocks =
          !!firstOwner &&
          !!lastOwner &&
          !!firstParent &&
          owners.every((owner) => owner.parentNode === firstParent);

        if (canReplaceAsBlocks) {
          const fragment = document.createDocumentFragment();
          const replacements = owners.map((owner, index) => {
            const replacement = owner.cloneNode(false) as HTMLElement;
            sanitizeClonedTextOwner(replacement);
            replacement.replaceChildren(
              createPlainTextFragment(
                normalizeRefinedTextForOwner(owner, mappedBlocks[index] || "")
              )
            );
            fragment.appendChild(replacement);
            return replacement;
          });
          firstParent.insertBefore(fragment, firstOwner!);
          insertedAnchor = replacements[0] || null;
          owners.forEach((owner) => {
            owner.parentNode?.removeChild(owner);
          });
        } else {
          const selection = restoreSavedPreviewSelection();
          const range = selectionContext.range.cloneRange();
          range.deleteContents();
          const fragment = createPlainTextFragment(revisedText);
          insertedAnchor = fragment.lastChild;
          range.insertNode(fragment);
          selection?.removeAllRanges();
        }
      } else if (highlightedSelection?.parentNode) {
        const normalizedText = selectionContext?.owners[0]
          ? normalizeRefinedTextForOwner(selectionContext.owners[0], revisedText)
          : revisedText;
        const fragment = createPlainTextFragment(normalizedText);
        insertedAnchor = fragment.lastChild || highlightedSelection.previousSibling;
        highlightedSelection.parentNode.insertBefore(fragment, highlightedSelection);
        highlightedSelection.parentNode.removeChild(highlightedSelection);
      } else {
        const selection = restoreSavedPreviewSelection();
        const range = selectionContext?.range.cloneRange();
        if (!range) return;
        range.deleteContents();
        const normalizedText = selectionContext?.owners[0]
          ? normalizeRefinedTextForOwner(selectionContext.owners[0], revisedText)
          : revisedText;
        const fragment = createPlainTextFragment(normalizedText);
        insertedAnchor = fragment.lastChild;
        range.insertNode(fragment);
        selection?.removeAllRanges();
      }

      const textNode = insertedAnchor instanceof Text
        ? insertedAnchor
        : getPreviewTextElement(insertedAnchor)?.firstChild;
      const nextRange = document.createRange();
      if (insertedAnchor instanceof HTMLElement) {
        nextRange.selectNodeContents(insertedAnchor);
      } else if (textNode) {
        nextRange.selectNodeContents(textNode);
      } else {
        nextRange.selectNodeContents(previewContainerRef.current || document.body);
      }
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(nextRange);
      persistPreviewSelection(selection);
      commitPreviewDomToSource();

      const textId =
        selectionContext?.owners.length === 1 ? selectionContext.textId || null : null;
      const textElement = textId
        ? (previewContainerRef.current?.querySelector(
            `[data-massic-text-id="${textId}"]`
          ) as HTMLElement | null)
        : getPreviewTextElement(insertedAnchor);
      const info = textElement ? getTextBlockInfoFromElement(textElement) : null;

      if (info) {
        setActiveTextEditor((current) =>
          current
            ? {
                ...current,
                id: info.id,
                label: info.label,
                text: info.text,
                style: info.style,
              }
            : current
        );
      }

      if (previewContainerRef.current) {
        setSelectionFormats(
          detectInlineFormatsAtNode(insertedAnchor, previewContainerRef.current)
        );
      }
    },
    [
      commitPreviewDomToSource,
      createPlainTextFragment,
      getPreviewTextElement,
      getSavedPreviewSelectionContext,
      persistPreviewSelection,
      pushUndo,
      restoreSavedPreviewSelection,
      normalizeRefinedTextForOwner,
      sanitizeClonedTextOwner,
      splitRefinedTextAcrossOwners,
    ]
  );

  const closeActiveLayoutEditor = React.useCallback(() => {
    setActiveLayoutEditor(null);
    setSpacingDraft(createEmptySpacingValue());
    setHoveredLayoutId(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(linkLabelEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  const cancelActiveLayoutEditor = React.useCallback(() => {
    closeActiveLayoutEditor();
  }, [closeActiveLayoutEditor]);

  const closeActiveLinkEditor = React.useCallback(() => {
    setActiveLinkEditor(null);
    setLinkLabelDraft("");
    setLinkHrefError(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(linkLabelEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  const closeActiveMediaEditor = React.useCallback(() => {
    setActiveMediaEditor(null);
    isEditorFocusedRef.current = false;
    if (
      !Object.keys(editsRef.current).length &&
      !Object.keys(linkEditsRef.current).length &&
      !Object.keys(linkLabelEditsRef.current).length &&
      !Object.keys(spacingEditsRef.current).length &&
      !isSavingRef.current
    ) {
      isEditingSessionRef.current = false;
      setPollingDisabled(false);
    }
  }, []);

  React.useEffect(() => {
    if (previewEditMode === "layout") {
      setActiveLinkEditor(null);
      setActiveMediaEditor(null);
      setActiveTextEditor(null);
      setLinkHrefError(null);
      return;
    }
    cancelActiveLayoutEditor();
  }, [cancelActiveLayoutEditor, previewEditMode]);

  React.useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const previousActive = container.querySelectorAll("[data-massic-layout-selected='true']");
    previousActive.forEach((node) => {
      (node as HTMLElement).removeAttribute("data-massic-layout-selected");
    });

    if (previewEditMode !== "layout") return;
    const activeSpacingId = activeLayoutEditor?.spacingId;
    const activeSlotId = activeLayoutEditor?.slotId;
    const activeSectionId = activeLayoutEditor?.sectionId;
    const targetId = activeSpacingId || activeSlotId || activeSectionId;
    if (!targetId) return;

    const attr = activeSpacingId
      ? "data-massic-spacing-id"
      : activeSlotId
        ? "data-massic-slot-id"
        : "data-massic-section-id";
    const nextActive = container.querySelector(`[${attr}="${targetId}"]`) as HTMLElement | null;
    if (!nextActive) return;
    nextActive.setAttribute("data-massic-layout-selected", "true");
  }, [activeLayoutEditor?.slotId, activeLayoutEditor?.spacingId, activeLayoutEditor?.sectionId, previewEditMode, previewHtml]);

  React.useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const previousSelected = container.querySelectorAll("[data-massic-text-owner-selected='true']");
    previousSelected.forEach((node) => {
      (node as HTMLElement).removeAttribute("data-massic-text-owner-selected");
    });

    if (previewEditMode !== "text") return;
    if (!activeTextEditor?.id) return;

    const selectedText = container.querySelector(
      `[data-massic-text-id="${activeTextEditor.id}"]`
    ) as HTMLElement | null;
    if (!selectedText) return;
    const owner = selectedText.closest(TEXT_OWNER_SELECTOR) as HTMLElement | null;
    if (!owner) return;
    owner.setAttribute("data-massic-text-owner-selected", "true");
  }, [activeTextEditor?.id, previewEditMode, previewHtml]);

  React.useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const previousEditable = container.querySelectorAll("[data-massic-text-editing='true']");
    previousEditable.forEach((node) => {
      const element = node as HTMLElement;
      element.removeAttribute("data-massic-text-editing");
      element.removeAttribute("contenteditable");
      element.removeAttribute("spellcheck");
      element.removeAttribute("tabindex");
    });

    if (previewEditMode !== "text" || !activeTextEditor?.id) return;

    const selectedText = container.querySelector(
      `[data-massic-text-id="${activeTextEditor.id}"]`
    ) as HTMLElement | null;
    const owner = getPreviewTextOwnerElement(selectedText);
    if (!owner) return;

    owner.setAttribute("contenteditable", "true");
    owner.setAttribute("spellcheck", "true");
    owner.setAttribute("tabindex", "0");
    owner.setAttribute("data-massic-text-editing", "true");
  }, [activeTextEditor?.id, getPreviewTextOwnerElement, previewEditMode, previewHtml]);

  React.useEffect(() => {
    if (previewEditMode !== "text" || !isAiRefineExpanded) {
      clearAiSelectionHighlight();
      return;
    }

    applyAiSelectionHighlight();

    return () => {
      clearAiSelectionHighlight();
    };
  }, [
    applyAiSelectionHighlight,
    clearAiSelectionHighlight,
    isAiRefineExpanded,
    previewEditMode,
  ]);

  React.useEffect(() => {
    if (previewEditMode !== "text") {
      setSelectionFormats({ bold: false, italic: false, underline: false, strike: false });
      return;
    }
    const container = previewContainerRef.current;
    if (!container) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        if (isAiRefineExpanded) return;
        savedTextSelectionRef.current = null;
        setSelectionFormats({ bold: false, italic: false, underline: false, strike: false });
        return;
      }
      const range = selection.getRangeAt(0);
      if (!container.contains(range.startContainer)) {
        if (isAiRefineExpanded) return;
        savedTextSelectionRef.current = null;
        setSelectionFormats({ bold: false, italic: false, underline: false, strike: false });
        return;
      }
      persistPreviewSelection(selection);
      if (selection.isCollapsed) {
        setSelectionFormats(detectInlineFormatsAtNode(range.startContainer, container));
        return;
      }
      if (!container.contains(range.endContainer)) {
        if (isAiRefineExpanded) return;
        savedTextSelectionRef.current = null;
        setSelectionFormats({ bold: false, italic: false, underline: false, strike: false });
        return;
      }
      const startFormats = detectInlineFormatsAtNode(range.startContainer, container);
      const endFormats = detectInlineFormatsAtNode(range.endContainer, container);
      setSelectionFormats({
        bold: startFormats.bold && endFormats.bold,
        italic: startFormats.italic && endFormats.italic,
        underline: startFormats.underline && endFormats.underline,
        strike: startFormats.strike && endFormats.strike,
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [isAiRefineExpanded, persistPreviewSelection, previewEditMode]);

  React.useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const previousHovered = container.querySelectorAll("[data-massic-layout-hovered='true']");
    previousHovered.forEach((node) => {
      (node as HTMLElement).removeAttribute("data-massic-layout-hovered");
    });

    if (previewEditMode !== "layout") return;
    if (!hoveredLayoutId) return;
    const spacingEl = container.querySelector(`[data-massic-spacing-id="${hoveredLayoutId}"]`) as HTMLElement | null;
    const slotEl = container.querySelector(`[data-massic-slot-id="${hoveredLayoutId}"]`) as HTMLElement | null;
    const sectionEl = container.querySelector(`[data-massic-section-id="${hoveredLayoutId}"]`) as HTMLElement | null;
    const nextHovered = spacingEl || slotEl || sectionEl;
    if (!nextHovered) return;
    nextHovered.setAttribute("data-massic-layout-hovered", "true");
  }, [hoveredLayoutId, previewEditMode, previewHtml]);

  React.useEffect(() => {
    if (previewEditMode !== "layout") return;
    if (!activeLayoutEditor?.spacingId) return;
    applySpacingPreviewToTarget(activeLayoutEditor.spacingId, spacingDraft);
  }, [
    activeLayoutEditor?.spacingId,
    previewEditMode,
    previewHtml,
    applySpacingPreviewToTarget,
    spacingDraft,
  ]);

  const getResolvedSpacingValue = React.useCallback((spacingId: string | null, fallback: EditableSpacingValue) => {
    if (!spacingId) return fallback;

    if (Object.prototype.hasOwnProperty.call(spacingEditsRef.current, spacingId)) {
      return spacingEditsRef.current[spacingId];
    }

    const spacingRef = spacingIndexRef.current.find((entry) => entry.id === spacingId);
    if (!spacingRef) return fallback;

    return {
      outsideTop: spacingRef.outsideTop,
      outsideBottom: spacingRef.outsideBottom,
      outsideLeft: spacingRef.outsideLeft,
      outsideRight: spacingRef.outsideRight,
    };
  }, []);

  const handlePreviewMouseDownCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    const target = event.target as HTMLElement | null;
    if (!target || isEditorPopoverTarget(target)) return;
    if (target.closest("[data-massic-text-editing='true']")) return;

    if (resolveMediaSelection(target) || (getEditableLinkElement(target) && !target.closest("[data-massic-text-id]"))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [previewEditMode]);

  const handlePreviewMouseUpCapture = React.useCallback((_event: React.MouseEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    const textElement =
      getPreviewTextElement(startNode) ||
      getPreviewTextElement(range.endContainer);

    if (textElement) {
      openTextEditorForElement(textElement);
    }
  }, [getPreviewTextElement, openTextEditorForElement, previewEditMode]);

  const handlePreviewClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (isEditorPopoverTarget(target)) {
      return;
    }

    const anyAnchor = getAnyAnchorElement(target);
    if (anyAnchor) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (previewEditMode === "layout") {
      event.preventDefault();
      event.stopPropagation();

      const spacingTarget = getEditableSpacingElement(target);
      const slotTarget = getEditableSlotElement(target);
      const sectionTarget = getEditableSectionElement(target);
      const primaryTarget = spacingTarget || slotTarget || sectionTarget;
      if (!primaryTarget) {
        if (activeLayoutEditor) cancelActiveLayoutEditor();
        return;
      }

      const spacingId = spacingTarget?.dataset.massicSpacingId || null;
      const slotId = slotTarget?.dataset.massicSlotId || null;
      const layoutId = spacingTarget?.dataset.massicLayoutId || slotTarget?.closest("[data-massic-layout-id]")?.getAttribute("data-massic-layout-id") || null;
      const sectionId = sectionTarget?.dataset.massicSectionId || null;
      const baseClassName = spacingId ? String(spacingTarget!.getAttribute("class") || "") : "";
      const baseStyleStr = spacingId ? String(spacingTarget!.getAttribute("style") || "") : "";
      const baseSpacingValue = spacingId
        ? getResolvedSpacingValue(spacingId, parseEditableSpacingValue(baseClassName, baseStyleStr))
        : createEmptySpacingValue();

      if (activeLayoutEditor?.spacingId && activeLayoutEditor.spacingId !== spacingId) {
        applySpacingPreviewToTarget(
          activeLayoutEditor.spacingId,
          getResolvedSpacingValue(activeLayoutEditor.spacingId, activeLayoutEditor.baseSpacing)
        );
      }

      if (!previewContainerRef.current) return;
      const container = previewContainerRef.current;
      const targetRect = primaryTarget.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const nextLeft = Math.max(
        8,
        Math.min(targetRect.left - containerRect.left + container.scrollLeft, container.scrollWidth - 300)
      );
      const nextTop = Math.max(8, targetRect.top - containerRect.top + container.scrollTop - 44);

      const spacingRef = spacingId ? spacingIndexRef.current.find((item) => item.id === spacingId) : undefined;
      const slotRef = slotId ? slotIndexRef.current.find((item) => item.id === slotId) : undefined;
      const sectionRef = sectionId ? sectionIndexRef.current.find((item) => item.id === sectionId) : undefined;
      const idx = sectionId ? sectionIndexRef.current.findIndex((item) => item.id === sectionId) : -1;
      const hasDirectSpacingTarget = !!spacingId && spacingTarget !== slotTarget;

      const targetKind: ActiveLayoutEditorState["targetKind"] =
        spacingRef?.nodeKind === "layout" ? "layout"
          : hasDirectSpacingTarget ? "block"
            : slotRef ? "slot"
              : "section";
      const isElement = targetKind === "block";
      const isLayout = targetKind === "layout";
      const isSlot = targetKind === "slot";

      let label: string;
      if (isSlot) {
        label = slotRef?.isEmpty ? "Empty Layout Slot" : "Layout Slot";
      } else if (isLayout) {
        label = "Layout Container";
      } else if (isElement) {
        label = resolveSpacingLabel(spacingRef);
      } else if (sectionRef) {
        label = sectionRef.label;
      } else {
        label = resolveSpacingLabel(spacingRef);
      }
      const siblingInfo = isElement && spacingId
        ? getElementSiblingInfo(sourceHtmlRef.current, spacingId)
        : { isFirst: true, isLast: true, siblingCount: 1, isEmpty: false };
      const targetTagName = spacingRef?.tagName || sectionRef?.tagName || slotRef?.tagName || null;
      const canInsertInside = !!targetTagName && new Set(["div", "section", "article", "li", "blockquote", "details"]).has(targetTagName);

      const mediaSelection = target ? resolveMediaSelection(target as HTMLElement) : null;
      const mediaTarget = mediaSelection?.media || null;

      setSpacingDraft(baseSpacingValue);
      setActiveLayoutEditor({
        left: Number.isFinite(nextLeft) ? nextLeft : 8,
        top: Number.isFinite(nextTop) ? nextTop : 8,
        label,
        targetKind,
        targetTagName,
        layoutId,
        slotId: targetKind === "slot" ? slotId : null,
        sectionId,
        sectionCount: sectionIndexRef.current.length,
        sectionIndex: idx,
        spacingId,
        baseClassName,
        baseStyleStr,
        baseSpacing: baseSpacingValue,
        isElement,
        isLayout,
        isSlot,
        canInsertInside,
        isFirstSibling: siblingInfo.isFirst,
        isLastSibling: siblingInfo.isLast,
        isEmptyElement: isSlot ? !!slotRef?.isEmpty : siblingInfo.isEmpty,
        mediaTarget: isElement ? mediaTarget : null,
      });
      setHoveredLayoutId(spacingId || slotId || sectionId);
      isEditorFocusedRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) setPollingDisabled(true);
      return;
    }

    const mediaSelection = resolveMediaSelection(target);
    if (mediaSelection?.spacingEl.dataset.massicSpacingId && previewContainerRef.current) {
      const container = previewContainerRef.current;
      const mediaRect = (target.closest("img,iframe,.massic-video-wrap,[data-massic-media-editable]") as HTMLElement | null
        ?? mediaSelection.spacingEl).getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const nextLeft = Math.max(
        8,
        Math.min(mediaRect.left - containerRect.left + container.scrollLeft, container.scrollWidth - 308)
      );
      const nextTop = Math.max(8, mediaRect.bottom - containerRect.top + container.scrollTop + 8);

      setActiveLinkEditor(null);
      setActiveTextEditor(null);
      setLinkHrefError(null);
      setActiveMediaEditor({
        spacingId: mediaSelection.spacingEl.dataset.massicSpacingId,
        left: Number.isFinite(nextLeft) ? nextLeft : 8,
        top: Number.isFinite(nextTop) ? nextTop : 8,
        label: mediaSelection.media.type === "img" ? "Edit Image" : "Edit Video",
        media: mediaSelection.media,
      });
      isEditorFocusedRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) {
        setPollingDisabled(true);
      }
      return;
    }

    const textTarget = target.closest("[data-massic-text-id]") as HTMLElement | null;
    if (textTarget) {
      return;
    }

    const anchor = getEditableLinkElement(target);
    if (anchor) {
      const linkId = anchor.dataset.massicLinkId;
      if (!linkId || !previewContainerRef.current) return;

      event.preventDefault();
      event.stopPropagation();

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
      const textIds = Array.from(anchor.querySelectorAll("[data-massic-text-id]"))
        .map((node) => (node as HTMLElement).dataset.massicTextId || "")
        .filter(Boolean);

      setActiveMediaEditor(null);
      setActiveTextEditor(null);
      setActiveLinkEditor({
        id: linkId,
        left: Number.isFinite(nextLeft) ? nextLeft : 8,
        top: Number.isFinite(nextTop) ? nextTop : 8,
        label: linkRef?.label || (anchor.textContent || "").trim() || "Link",
        textIds,
      });
      setLinkHrefDraft(currentHref);
      setLinkLabelDraft(
        Object.prototype.hasOwnProperty.call(linkLabelEditsRef.current, linkId)
          ? linkLabelEditsRef.current[linkId]
          : (anchor.textContent || "").replace(/\u00A0/g, " ").trim()
      );
      setLinkHrefError(null);
      isEditorFocusedRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) {
        setPollingDisabled(true);
      }
      return;
    }

    if (!anchor) {
      if (activeLinkEditor) {
        closeActiveLinkEditor();
      }
      if (activeMediaEditor) {
        closeActiveMediaEditor();
      }
      if (activeTextEditor) {
        closeActiveTextEditor();
      }
      return;
    }

  }, [
    activeTextEditor,
    activeLinkEditor,
    activeMediaEditor,
    activeLayoutEditor,
    closeActiveTextEditor,
    closeActiveLinkEditor,
    closeActiveMediaEditor,
    cancelActiveLayoutEditor,
    pollingDisabled,
    previewEditMode,
    applySpacingPreviewToTarget,
    getResolvedSpacingValue,
    resolveSpacingLabel,
  ]);

  const handlePreviewAuxClickCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = getAnyAnchorElement(event.target);
    if (!anchor) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handlePreviewMouseMoveCapture = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (previewEditMode !== "layout") return;
    const lockedId = activeLayoutEditor?.spacingId || activeLayoutEditor?.slotId || activeLayoutEditor?.sectionId;
    if (lockedId) {
      setHoveredLayoutId((prev) => (prev === lockedId ? prev : lockedId));
      return;
    }
    const slotTarget = getEditableSlotElement(event.target);
    const spacingTarget = getEditableSpacingElement(event.target);
    const sectionTarget = getEditableSectionElement(event.target);
    const nextId = spacingTarget?.dataset.massicSpacingId || slotTarget?.dataset.massicSlotId || sectionTarget?.dataset.massicSectionId || null;
    setHoveredLayoutId((prev) => (prev === nextId ? prev : nextId));
  }, [activeLayoutEditor?.slotId, activeLayoutEditor?.spacingId, activeLayoutEditor?.sectionId, previewEditMode]);

  const handlePreviewMouseLeaveCapture = React.useCallback(() => {
    if (previewEditMode !== "layout") return;
    const lockedId = activeLayoutEditor?.spacingId || activeLayoutEditor?.slotId || activeLayoutEditor?.sectionId;
    if (lockedId) {
      setHoveredLayoutId((prev) => (prev === lockedId ? prev : lockedId));
      return;
    }
    setHoveredLayoutId(null);
  }, [activeLayoutEditor?.slotId, activeLayoutEditor?.spacingId, activeLayoutEditor?.sectionId, previewEditMode]);

  const syncSpacingIndexEntry = React.useCallback((spacingId: string, spacingValue: EditableSpacingValue, className: string) => {
    spacingIndexRef.current = spacingIndexRef.current.map((entry) => {
      if (entry.id !== spacingId) return entry;
      return {
        ...entry,
        className,
        outsideTop: spacingValue.outsideTop,
        outsideBottom: spacingValue.outsideBottom,
        outsideLeft: spacingValue.outsideLeft,
        outsideRight: spacingValue.outsideRight,
      };
    });
  }, []);

  const saveActiveSpacingValue = React.useCallback(async (nextValue: EditableSpacingValue) => {
    const active = activeLayoutEditor;
    if (!active?.spacingId) return;

    spacingEditsRef.current = {
      ...spacingEditsRef.current,
      [active.spacingId]: nextValue,
    };

    applySpacingPreviewToTarget(active.spacingId, nextValue);
    syncSpacingIndexEntry(active.spacingId, nextValue, active.baseClassName);
    closeActiveLayoutEditor();
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    setIsDirty(true);
  }, [activeLayoutEditor, closeActiveLayoutEditor, applySpacingPreviewToTarget, syncSpacingIndexEntry]);

  const handleApplySpacingForActiveTarget = React.useCallback(async () => {
    await saveActiveSpacingValue(spacingDraft);
  }, [saveActiveSpacingValue, spacingDraft]);

  const handleResetSpacingForActiveTarget = React.useCallback(() => {
    const active = activeLayoutEditor;
    if (!active?.spacingId) return;
    const empty = createEmptySpacingValue();
    setSpacingDraft(empty);
    spacingEditsRef.current = { ...spacingEditsRef.current, [active.spacingId]: empty };
    applySpacingPreviewToTarget(active.spacingId, empty);
    syncSpacingIndexEntry(active.spacingId, empty, active.baseClassName);
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    setIsDirty(true);
  }, [activeLayoutEditor, applySpacingPreviewToTarget, syncSpacingIndexEntry]);

  const stepActiveSpacingDraft = React.useCallback((key: SpacingDraftKey, direction: 1 | -1) => {
    setSpacingDraft((prev) => {
      const next = { ...prev, [key]: pxToSpacingToken(spacingTokenToPx(prev[key]) + direction * SPACING_STEP) };
      const active = activeLayoutEditor;
      if (active?.spacingId) {
        spacingEditsRef.current = { ...spacingEditsRef.current, [active.spacingId]: next };
        applySpacingPreviewToTarget(active.spacingId, next);
        syncSpacingIndexEntry(active.spacingId, next, active.baseClassName);
        hasLocalEditsRef.current = true;
        isEditingSessionRef.current = true;
        setIsDirty(true);
      }
      return next;
    });
  }, [activeLayoutEditor, applySpacingPreviewToTarget, syncSpacingIndexEntry]);

  const saveActiveLinkHref = React.useCallback(async (nextHrefInput: string, nextLabelInput?: string) => {
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

    if (nextLabelInput !== undefined) {
      const normalizedLabel = nextLabelInput.replace(/\u00A0/g, " ").trim();
      linkLabelEditsRef.current = {
        ...linkLabelEditsRef.current,
        [active.id]: normalizedLabel,
      };
    }

    if (previewContainerRef.current) {
      const selector = `a[data-massic-link-id="${active.id}"]`;
      const linkEl = previewContainerRef.current.querySelector(selector) as HTMLAnchorElement | null;
      if (linkEl) {
        if (normalizedHref) {
          linkEl.setAttribute("href", normalizedHref);
        } else {
          linkEl.removeAttribute("href");
        }

        if (nextLabelInput !== undefined) {
          const normalizedLabel = nextLabelInput.replace(/\u00A0/g, " ").trim();
          let appliedToTextNode = false;
          for (const textId of active.textIds) {
            const textEl = linkEl.querySelector(`[data-massic-text-id="${textId}"]`) as HTMLElement | null;
            if (!textEl) continue;
            textEl.textContent = normalizedLabel;
            editsRef.current = {
              ...editsRef.current,
              [textId]: normalizedLabel,
            };
            appliedToTextNode = true;
            break;
          }

          if (!appliedToTextNode) {
            linkEl.textContent = normalizedLabel;
          }
        }
      }
    }

    setLinkHrefDraft(normalizedHref);
    if (nextLabelInput !== undefined) {
      setLinkLabelDraft(nextLabelInput);
    }
    setLinkHrefError(null);
    closeActiveLinkEditor();
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    setIsDirty(true);
  }, [activeLinkEditor, closeActiveLinkEditor]);

  const handleSaveActiveLinkHref = React.useCallback(async () => {
    await saveActiveLinkHref(linkHrefDraft, linkLabelDraft);
  }, [linkHrefDraft, linkLabelDraft, saveActiveLinkHref]);

  const handleRemoveActiveLinkHref = React.useCallback(async () => {
    await saveActiveLinkHref("", linkLabelDraft);
  }, [linkLabelDraft, saveActiveLinkHref]);

  const rebuildModelFromSource = React.useCallback((html: string) => {
    const sanitized = normalizeEditorHtml(html);
    sourceHtmlRef.current = sanitized;
    const model = buildEditableHtmlModel(sanitized);
    textNodeIndexRef.current = model.textNodeIndex;
    linkIndexRef.current = model.linkIndex;
    spacingIndexRef.current = model.spacingIndex;
    layoutIndexRef.current = model.layoutIndex;
    slotIndexRef.current = model.slotIndex;
    blockIndexRef.current = model.blockIndex;
    sectionIndexRef.current = model.sectionIndex;
    editsRef.current = {};
    linkEditsRef.current = {};
    linkLabelEditsRef.current = {};
    spacingEditsRef.current = {};
    setTextNodeIndex(model.textNodeIndex);
    setPreviewHtml(model.previewHtml);
    setActiveLayoutEditor(null);
    setActiveMediaEditor(null);
    setHoveredLayoutId(null);
    return sanitized;
  }, [normalizeEditorHtml]);

  const handleUndo = React.useCallback(() => {
    const stack = undoStackRef.current;
    if (!stack.length) return;
    redoStackRef.current.push(sourceHtmlRef.current);
    if (redoStackRef.current.length > 30) redoStackRef.current.shift();
    const previous = stack.pop()!;
    rebuildModelFromSource(previous);
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) setPollingDisabled(true);
    setIsDirty(true);
  }, [pollingDisabled, rebuildModelFromSource]);

  const handleRedo = React.useCallback(() => {
    const stack = redoStackRef.current;
    if (!stack.length) return;
    undoStackRef.current.push(sourceHtmlRef.current);
    const next = stack.pop()!;
    rebuildModelFromSource(next);
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    if (!pollingDisabled) setPollingDisabled(true);
    setIsDirty(true);
  }, [pollingDisabled, rebuildModelFromSource]);

  const handleManualSave = React.useCallback(async () => {
    const nextHtml = composeCurrentHtml();
    if (!nextHtml) return;
    const validation = validateEditorHtml(nextHtml);
    if (!validation.isValid) {
      toast.error(validation.errors[0] || "Layout is invalid and could not be saved.");
      return;
    }
    setIsSaving(true);
    try {
      await updatePageContentRequest(nextHtml);
      sourceHtmlRef.current = nextHtml;
      lastSavedHtmlRef.current = canonicalizeHtml(nextHtml);
      lastCommittedHtmlRef.current = canonicalizeHtml(nextHtml);
      editsRef.current = {};
      linkEditsRef.current = {};
      linkLabelEditsRef.current = {};
      spacingEditsRef.current = {};
      hasLocalEditsRef.current = false;
      setIsDirty(false);

      const committedModel = buildEditableHtmlModel(nextHtml);
      textNodeIndexRef.current = committedModel.textNodeIndex;
      linkIndexRef.current = committedModel.linkIndex;
      spacingIndexRef.current = committedModel.spacingIndex;
      layoutIndexRef.current = committedModel.layoutIndex;
      slotIndexRef.current = committedModel.slotIndex;
      blockIndexRef.current = committedModel.blockIndex;
      sectionIndexRef.current = committedModel.sectionIndex;
      setTextNodeIndex(committedModel.textNodeIndex);
      setPreviewHtml(committedModel.previewHtml);
      setActiveLinkEditor(null);
      setActiveMediaEditor(null);
      setActiveTextEditor(null);
      setLinkHrefDraft("");
      setLinkLabelDraft("");
      setLinkHrefError(null);

      toast.success("Changes saved");
      window.setTimeout(() => { void runBackgroundRefetch(); }, 500);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [composeCurrentHtml, runBackgroundRefetch, updatePageContentRequest, validateEditorHtml]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        void handleManualSave();
      } else if (mod && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if ((mod && e.shiftKey && e.key === "z") || (mod && e.key === "y")) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleManualSave, handleUndo, handleRedo]);

  const executeSectionMutation = React.useCallback(
    (mutatedHtml: string, reselect?: boolean) => {
      const markerRegex = new RegExp(` ${RESELECT_MARKER_ATTR}="1"`, "g");
      const insertedRegex = / data-massic-inserted="1"/g;
      const cleanHtml = mutatedHtml.replace(markerRegex, "").replace(insertedRegex, "");
      const sanitized = normalizeEditorHtml(cleanHtml);
      sourceHtmlRef.current = sanitized;
      const needsMarkers = reselect || pendingScrollToInsertRef.current;
      const modelHtml = needsMarkers ? normalizeEditorHtml(mutatedHtml) : sanitized;
      const model = buildEditableHtmlModel(modelHtml);
      textNodeIndexRef.current = model.textNodeIndex;
      linkIndexRef.current = model.linkIndex;
      spacingIndexRef.current = model.spacingIndex;
      layoutIndexRef.current = model.layoutIndex;
      slotIndexRef.current = model.slotIndex;
      blockIndexRef.current = model.blockIndex;
      sectionIndexRef.current = model.sectionIndex;
      editsRef.current = {};
      linkEditsRef.current = {};
      linkLabelEditsRef.current = {};
      spacingEditsRef.current = {};
      setTextNodeIndex(model.textNodeIndex);
      setPreviewHtml(model.previewHtml);
      setActiveLinkEditor(null);
      setActiveMediaEditor(null);
      setActiveTextEditor(null);
      setLinkHrefDraft("");
      setLinkLabelDraft("");
      setLinkHrefError(null);
      setActiveLayoutEditor(null);
      setHoveredLayoutId(null);

      hasLocalEditsRef.current = true;
      isEditingSessionRef.current = true;
      if (!pollingDisabled) setPollingDisabled(true);
      setIsDirty(true);

      if (reselect) {
        pendingReselectRef.current = true;
      }
    },
    [normalizeEditorHtml, pollingDisabled]
  );

  const handleUpdateActiveMedia = React.useCallback(
    (updates: { src?: string; alt?: string; width?: string }) => {
      const active = activeMediaEditor;
      if (!active) return;
      pushUndo();
      const marked = markSpacingElementForReselect(sourceHtmlRef.current, active.spacingId);
      const result = updateMediaInElementBySpacingId(
        marked,
        active.spacingId,
        active.media.mediaIndex,
        active.media.type,
        updates,
      );
      executeSectionMutation(result, true);
      setActiveMediaEditor(null);
    },
    [activeMediaEditor, executeSectionMutation, pushUndo]
  );

  const handleMoveSection = React.useCallback(
    (sectionId: string, direction: "up" | "down") => {
      pushUndo();
      const marked = markSectionElementForReselect(sourceHtmlRef.current, sectionId);
      const result = moveSectionInHtml(marked, sectionId, direction);
      executeSectionMutation(result, true);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleDeleteSection = React.useCallback(
    (sectionId: string) => {
      pushUndo();
      const result = deleteSectionFromHtml(sourceHtmlRef.current, sectionId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleDuplicateSection = React.useCallback(
    (sectionId: string) => {
      pushUndo();
      const marked = markSectionElementForReselect(sourceHtmlRef.current, sectionId);
      const result = duplicateSectionInHtml(marked, sectionId);
      executeSectionMutation(result, true);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleOpenInsertDialog = React.useCallback(
    (anchor: InsertAnchor) => {
      setInsertAnchor(anchor);
      setInsertDialogOpen(true);
    },
    []
  );

  const handleInsertBlock = React.useCallback(
    (blockHtml: string) => {
      pushUndo();
      const markedBlock = blockHtml.replace(/^(<\w+)/, '$1 data-massic-inserted="1"');
      let src = sourceHtmlRef.current;
      let result: string;
      if (insertAnchor?.kind === "wrap-grid") {
        const { spacingId, side } = insertAnchor;
        result = wrapBlockInTwoColumnLayout(src, spacingId, side, markedBlock);
      } else if (insertAnchor?.kind === "slot") {
        result = insertBlockIntoSlot(src, insertAnchor.slotId, markedBlock, "end");
      } else if (insertAnchor?.kind === "element") {
        const { spacingId, position } = insertAnchor;
        if (position === "inside") {
          result = insertInsideElementBySpacingId(src, spacingId, "end", markedBlock);
        } else {
          result = insertAdjacentToElementBySpacingId(src, spacingId, position, markedBlock);
        }
      } else {
        result = insertBlockInHtml(
          src,
          insertAnchor?.sectionId ?? null,
          insertAnchor?.position ?? "after",
          markedBlock
        );
      }
      setInsertDialogOpen(false);
      setInsertAnchor(null);
      pendingScrollToInsertRef.current = true;
      executeSectionMutation(result);
    },
    [executeSectionMutation, insertAnchor, pushUndo]
  );

  // Element-level handlers (for inner elements like cards, containers, grid items)
  const handleDeleteElement = React.useCallback(
    (spacingId: string) => {
      pushUndo();
      const result = deleteBlockAndNormalize(sourceHtmlRef.current, spacingId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleDuplicateElement = React.useCallback(
    (spacingId: string) => {
      pushUndo();
      const marked = markSpacingElementForReselect(sourceHtmlRef.current, spacingId);
      const result = duplicateElementBySpacingId(marked, spacingId);
      executeSectionMutation(result, true);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleMoveElement = React.useCallback(
    (spacingId: string, direction: "up" | "down") => {
      pushUndo();
      const marked = markSpacingElementForReselect(sourceHtmlRef.current, spacingId);
      const result = moveElementBySpacingId(marked, spacingId, direction);
      executeSectionMutation(result, true);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleUpdateMedia = React.useCallback(
    (spacingId: string, media: MediaElementInfo, updates: { src?: string; alt?: string; width?: string }) => {
      pushUndo();
      const marked = markSpacingElementForReselect(sourceHtmlRef.current, spacingId);
      const result = updateMediaInElementBySpacingId(
        marked,
        spacingId,
        media.mediaIndex,
        media.type,
        updates,
      );
      executeSectionMutation(result, true);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleCollapseLayout = React.useCallback(
    (spacingId: string) => {
      pushUndo();
      const marked = markSpacingElementForReselect(sourceHtmlRef.current, spacingId);
      const result = collapseLayoutBySpacingId(marked, spacingId);
      executeSectionMutation(result, true);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleDeleteSlot = React.useCallback(
    (slotId: string) => {
      pushUndo();
      const result = deleteSlotById(sourceHtmlRef.current, slotId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleDeleteLayout = React.useCallback(
    (spacingId: string) => {
      pushUndo();
      const result = deleteLayoutBySpacingId(sourceHtmlRef.current, spacingId);
      executeSectionMutation(result);
    },
    [executeSectionMutation, pushUndo]
  );

  const handleConfirmActiveLayoutDelete = React.useCallback(() => {
    const active = activeLayoutEditor;
    setLayoutDeleteDialogOpen(false);
    if (!active) return;
    if (active.targetKind === "section" && active.sectionId) {
      handleDeleteSection(active.sectionId);
      return;
    }
    if (active.targetKind === "slot" && active.slotId) {
      handleDeleteSlot(active.slotId);
      return;
    }
    if (active.targetKind === "layout" && active.spacingId) {
      handleDeleteLayout(active.spacingId);
      return;
    }
    if (active.spacingId) {
      handleDeleteElement(active.spacingId);
    }
  }, [activeLayoutEditor, handleDeleteElement, handleDeleteLayout, handleDeleteSection, handleDeleteSlot]);

  const handleSelectParentSection = React.useCallback(() => {
    if (!activeLayoutEditor || !previewContainerRef.current) return;
    const selectedEl = activeLayoutEditor.slotId
      ? previewContainerRef.current.querySelector(`[data-massic-slot-id="${activeLayoutEditor.slotId}"]`) as HTMLElement | null
      : activeLayoutEditor.spacingId
        ? previewContainerRef.current.querySelector(`[data-massic-spacing-id="${activeLayoutEditor.spacingId}"]`) as HTMLElement | null
        : null;
    if (!selectedEl) return;
    const parentSection = selectedEl.closest("[data-massic-section-id]") as HTMLElement | null;
    if (!parentSection) return;
    const sectionId = parentSection.dataset.massicSectionId;
    if (!sectionId) return;

    const container = previewContainerRef.current;
    const targetRect = parentSection.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const nextLeft = Math.max(
      8,
      Math.min(targetRect.left - containerRect.left + container.scrollLeft, container.scrollWidth - 300)
    );
    const nextTop = Math.max(8, targetRect.top - containerRect.top + container.scrollTop - 44);
    const sectionRef = sectionIndexRef.current.find((item) => item.id === sectionId);
    const idx = sectionIndexRef.current.findIndex((item) => item.id === sectionId);
    const parentSpacingId = parentSection.dataset.massicSpacingId || null;
    const baseClassName = parentSpacingId ? String(parentSection.getAttribute("class") || "") : "";
    const baseStyleStr = parentSpacingId ? String(parentSection.getAttribute("style") || "") : "";
    const baseSpacingValue = parentSpacingId
      ? getResolvedSpacingValue(parentSpacingId, parseEditableSpacingValue(baseClassName, baseStyleStr))
      : createEmptySpacingValue();

    if (activeLayoutEditor.spacingId) {
      applySpacingPreviewToTarget(
        activeLayoutEditor.spacingId,
        getResolvedSpacingValue(activeLayoutEditor.spacingId, activeLayoutEditor.baseSpacing)
      );
    }
    setSpacingDraft(baseSpacingValue);
    setActiveLayoutEditor({
      left: Number.isFinite(nextLeft) ? nextLeft : 8,
      top: Number.isFinite(nextTop) ? nextTop : 8,
      label: sectionRef?.label || "Section",
      targetKind: "section",
      targetTagName: sectionRef?.tagName || null,
      layoutId: null,
      slotId: null,
      sectionId,
      sectionCount: sectionIndexRef.current.length,
      sectionIndex: idx,
      spacingId: parentSpacingId,
      baseClassName,
      baseStyleStr,
      baseSpacing: baseSpacingValue,
      isElement: false,
      isLayout: false,
      isSlot: false,
      canInsertInside: false,
      isFirstSibling: true,
      isLastSibling: true,
      isEmptyElement: false,
      mediaTarget: null,
    });
    setHoveredLayoutId(parentSpacingId || sectionId);
  }, [activeLayoutEditor, applySpacingPreviewToTarget, getResolvedSpacingValue]);

  const handleInputCapture = React.useCallback(() => {
    if (previewEditMode !== "text") return;

    const selection = window.getSelection();
    const target = selection?.anchorNode instanceof HTMLElement
      ? selection.anchorNode
      : selection?.anchorNode?.parentElement;
    const info = target ? getTextBlockInfoFromElement(target as HTMLElement) : null;

    if (info) {
      persistPreviewSelection(selection);
      setActiveTextEditor((current) => current && current.id === info.id ? {
        ...current,
        text: info.text,
        style: info.style,
      } : current);
    }
    commitPreviewDomToSource();
  }, [commitPreviewDomToSource, persistPreviewSelection, previewEditMode]);

  const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;
    const nextTarget = event.relatedTarget as HTMLElement | null;
    const movingToEditor = Boolean(nextTarget?.closest("[data-massic-text-editor='true']"));
    if (!movingToEditor) {
      isEditorFocusedRef.current = false;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    }
  };

  const handleFocusCapture = () => {
    return;
  };

  const handlePasteCapture = React.useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    if (previewEditMode !== "text") return;

    const target = event.target as HTMLElement | null;
    if (!target?.closest("[data-massic-text-editing='true']")) return;

    event.preventDefault();
    const plainText = event.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(plainText);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    textNode.parentElement?.normalize();
    persistPreviewSelection(selection);
    handleInputCapture();
  }, [handleInputCapture, persistPreviewSelection, previewEditMode]);

  const preserveSelectionOnToolbarMouseDown = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (previewEditMode !== "text") return;
    persistPreviewSelection();
    event.preventDefault();
  }, [persistPreviewSelection, previewEditMode]);

  const updateActiveSpacingDraft = React.useCallback((key: SpacingDraftKey, nextToken: EditableSpacingValue[SpacingDraftKey]) => {
    setSpacingDraft((prev) => {
      const next = { ...prev, [key]: nextToken };
      const active = activeLayoutEditor;
      if (active?.spacingId) {
        spacingEditsRef.current = { ...spacingEditsRef.current, [active.spacingId]: next };
        applySpacingPreviewToTarget(active.spacingId, next);
        syncSpacingIndexEntry(active.spacingId, next, active.baseClassName);
        hasLocalEditsRef.current = true;
        isEditingSessionRef.current = true;
        setIsDirty(true);
      }
      return next;
    });
  }, [activeLayoutEditor, applySpacingPreviewToTarget, syncSpacingIndexEntry]);

  const applyUniformSpacingDraft = React.useCallback((px: number | null) => {
    const token = px == null ? null : pxToSpacingToken(px);
    const nextValue: EditableSpacingValue = {
      outsideTop: token,
      outsideRight: token,
      outsideBottom: token,
      outsideLeft: token,
    };

    setSpacingDraft(nextValue);

    const active = activeLayoutEditor;
    if (!active?.spacingId) return;

    spacingEditsRef.current = {
      ...spacingEditsRef.current,
      [active.spacingId]: nextValue,
    };
    applySpacingPreviewToTarget(active.spacingId, nextValue);
    syncSpacingIndexEntry(active.spacingId, nextValue, active.baseClassName);
    hasLocalEditsRef.current = true;
    isEditingSessionRef.current = true;
    setIsDirty(true);
  }, [activeLayoutEditor, applySpacingPreviewToTarget, syncSpacingIndexEntry]);

  const handleKeyDownCapture = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
      if (undoStackRef.current.length > 0) {
        event.preventDefault();
        handleUndo();
        return;
      }
    }

    if (previewEditMode === "layout") {
      if (activeLayoutEditor && event.key === "Escape") {
        event.preventDefault();
        cancelActiveLayoutEditor();
      }
      if (activeLayoutEditor && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        setLayoutDeleteDialogOpen(true);
      }
      return;
    }

    if (activeLinkEditor && event.key === "Escape") {
      event.preventDefault();
      closeActiveLinkEditor();
      return;
    }
    if (activeMediaEditor && event.key === "Escape") {
      event.preventDefault();
      closeActiveMediaEditor();
      return;
    }
    if (activeTextEditor && event.key === "Escape") {
      event.preventDefault();
      closeActiveTextEditor();
      return;
    }

    if (previewEditMode === "text" && activeTextEditor && event.key === "Enter" && !event.shiftKey) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-massic-text-editing='true']")) {
        event.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const br = document.createElement("br");
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        return;
      }
    }

    if (previewEditMode === "text" && activeTextEditor && (event.metaKey || event.ctrlKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        handleApplyInlineTextFormat("bold");
        return;
      }
      if (key === "i") {
        event.preventDefault();
        handleApplyInlineTextFormat("italic");
        return;
      }
      if (key === "u") {
        event.preventDefault();
        handleApplyInlineTextFormat("underline");
        return;
      }
      if (event.shiftKey && key === "x") {
        event.preventDefault();
        handleApplyInlineTextFormat("strike");
      }
    }
  }, [activeLayoutEditor, activeLinkEditor, activeMediaEditor, activeTextEditor, cancelActiveLayoutEditor, closeActiveLinkEditor, closeActiveMediaEditor, closeActiveTextEditor, handleApplyInlineTextFormat, handleUndo, previewEditMode]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Typography variant="h4" className="shrink-0">Page</Typography>
            {keyword ? (
              <Typography variant="muted" className="ml-2 truncate text-xs">
                {keyword}
              </Typography>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center rounded-md border border-border p-0.5">
              <Button type="button" size="sm" variant={previewEditMode === "text" ? "default" : "ghost"} className="h-[34px] px-3 text-xs" onClick={() => setPreviewEditMode("text")}>
                Text
              </Button>
              <Button type="button" size="sm" variant={previewEditMode === "layout" ? "default" : "ghost"} className="h-[34px] px-3 text-xs" onClick={() => setPreviewEditMode("layout")}>
                Layout
              </Button>
            </div>
            <Button type="button" size="sm" variant="outline" className="h-[34px] gap-1 px-3 text-xs" onClick={() => {
              if (activeLayoutEditor?.targetKind === "section" && activeLayoutEditor.sectionId) {
                handleOpenInsertDialog({ kind: "section", sectionId: activeLayoutEditor.sectionId, position: "after" });
              } else if (activeLayoutEditor?.isElement && activeLayoutEditor.spacingId) {
                handleOpenInsertDialog({ kind: "element", spacingId: activeLayoutEditor.spacingId, position: "after" });
              } else if (activeLayoutEditor?.isSlot && activeLayoutEditor.slotId) {
                handleOpenInsertDialog({ kind: "slot", slotId: activeLayoutEditor.slotId });
              } else {
                handleOpenInsertDialog(null);
              }
            }}>
              <Plus className="h-4 w-4" />
              Insert
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="inline-flex items-center gap-0.5">
              <Tooltip><TooltipTrigger asChild>
                <Button type="button" size="icon" variant="outline" className="h-[34px] w-[34px]" onClick={handleUndo} disabled={!undoStackRef.current.length}>
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger><TooltipContent>Undo (Ctrl+Z)</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button type="button" size="icon" variant="outline" className="h-[34px] w-[34px]" onClick={handleRedo} disabled={!redoStackRef.current.length}>
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger><TooltipContent>Redo (Ctrl+Y)</TooltipContent></Tooltip>
            </div>
            <Tooltip><TooltipTrigger asChild>
              <Button type="button" size="icon" className="h-[34px] w-[34px]" onClick={() => void handleManualSave()} disabled={!isDirty || isSaving}>
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent>{isSaving ? "Saving..." : isDirty ? "Save" : "Saved"}</TooltipContent></Tooltip>
            <div className="h-5 w-px bg-border" />
            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-[34px] w-[34px]" onClick={handleCopyHtml} disabled={isProcessing}>
                <FileCode className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent>Copy HTML</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-[34px] w-[34px]" onClick={handleCopyText} disabled={isProcessing}>
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent>Copy Text</TooltipContent></Tooltip>
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

      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish to WordPress</DialogTitle>
            <DialogDescription>Choose what to do with this page.</DialogDescription>
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
                <Typography className="text-sm font-mono break-all">{wordpressSlugToDisplay(effectiveModalSlug, "/untitled-content")}</Typography>
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
                  disabled={isPublishBusy || isSlugChecking}
                />
              </div>
              <div className="space-y-1">
                <Typography className="text-xs text-muted-foreground">Publish route</Typography>
                <Typography className="text-sm font-mono break-all">{publishUrlPreview || "Unavailable"}</Typography>
              </div>
              {isSlugChecking ? <Typography className="text-xs text-muted-foreground">Checking slug availability...</Typography> : null}
              {slugCheckError ? <Typography className="text-xs text-destructive">{slugCheckError}</Typography> : null}
              {hasSlugConflict ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 space-y-2 min-w-0">
                  <div className="break-words">
                    {slugConflictReason === "parent_type_conflict"
                      ? "This nested page path is blocked. Change the parent path."
                      : "This slug already exists in WordPress. Use a unique slug."}
                  </div>
                  {slugCheckResult?.suggestedSlug ? (
                    <Button size="sm" variant="outline" className="h-auto w-full justify-start whitespace-normal break-all text-left" onClick={autoResolveSlug} disabled={isSlugActionBusy}>
                      {isAutoResolvingSlug ? "Resolving..." : `Use ${wordpressSlugToDisplay(slugCheckResult.suggestedSlug, "/next-available")}`}
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
                            onChange={(e) => handleStyleOverrideColorChange(key, e.target.value)}
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
                    Showing core colors. Enable &quot;Show All&quot; for text/surface options.
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
            <Button variant="outline" onClick={() => setIsPublishModalOpen(false)} disabled={isPublishBusy}>
              Cancel
            </Button>
            {isWpConnected ? (
              <>
                {isPersistedLive ? (
                  <>
                    <Button variant="outline" onClick={() => handleChangeWordpressStatus("draft")} disabled={wpUnpublishMutation.isPending}>
                      {wpUnpublishMutation.isPending ? "Updating..." : "Move to Draft"}
                    </Button>
                    <Button onClick={() => liveUrl && openEmbeddedPreview(liveUrl, "Published WordPress Page")} disabled={!liveUrl}>
                      View Live
                    </Button>
                  </>
                ) : isPersistedDraftLike ? (
                  <>
                    <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)} disabled={wpUnpublishMutation.isPending}>
                      {wpUnpublishMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                    <Button variant="outline" onClick={handleOpenPreview} disabled={!persistedContent?.wpId || wpPreviewMutation.isPending}>
                      {wpPreviewMutation.isPending ? "Loading..." : "Preview Draft"}
                    </Button>
                    <Button
                      onClick={() => setConfirmPublishAction("live")}
                      disabled={!hasFinalContent || !normalizedSlugForPublish || hasSlugConflict || isSlugChecking || wpPublishMutation.isPending}
                    >
                      {wpPublishMutation.isPending ? "Publishing..." : "Publish Live"}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setConfirmPublishAction("draft")}
                    disabled={
                      !hasFinalContent ||
                      !normalizedSlugForPublish ||
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
            <AlertDialogTitle>{confirmPublishAction === "live" ? "Publish Live to WordPress?" : "Publish Draft to WordPress?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPublishAction === "live"
                ? `This will update the live WordPress content at ${publishUrlPreview || "the selected route"}.`
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
            <AlertDialogDescription>This will move the WordPress content to trash. You can restore it later from WordPress admin.</AlertDialogDescription>
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
        <DialogContent className="w-[96vw] h-[90vh] max-w-[1400px] sm:max-w-[1400px] p-0 overflow-hidden" showCloseButton={false}>
          <DialogTitle className="sr-only">Preview {embeddedPreviewTitle}</DialogTitle>
          <div className="h-full flex flex-col bg-background">
            <div className="shrink-0 border-b px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Typography variant="h6" className="truncate">{embeddedPreviewTitle}</Typography>
                <Typography className="text-xs text-muted-foreground truncate">{embeddedPreviewUrl}</Typography>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1 rounded-md border p-1 bg-muted/40">
                  <Button size="sm" variant={previewViewport === "desktop" ? "default" : "ghost"} className="gap-1.5" onClick={() => setPreviewViewport("desktop")}>
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </Button>
                  <Button size="sm" variant={previewViewport === "tablet" ? "default" : "ghost"} className="gap-1.5" onClick={() => setPreviewViewport("tablet")}>
                    <Tablet className="h-4 w-4" />
                    Tablet
                  </Button>
                  <Button size="sm" variant={previewViewport === "mobile" ? "default" : "ghost"} className="gap-1.5" onClick={() => setPreviewViewport("mobile")}>
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </Button>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => embeddedPreviewUrl && window.open(embeddedPreviewUrl, "_blank", "noopener,noreferrer")} disabled={!embeddedPreviewUrl}>
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
                <div className={cn("mx-auto h-full transition-all duration-300", previewViewport === "desktop" && "w-full", previewViewport === "tablet" && "w-full max-w-[900px]", previewViewport === "mobile" && "w-full max-w-[430px]")}>
                  <iframe
                    title={embeddedPreviewTitle}
                    src={embeddedPreviewUrl}
                    className={cn("h-full w-full border-0 bg-white", previewViewport !== "desktop" && "rounded-xl border shadow-sm")}
                    onLoad={() => setIsEmbeddedPreviewLoading(false)}
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
              {showEmbedFallbackHint ? (
                <div className="absolute bottom-3 right-3 rounded-md border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                  If preview is blocked, use &quot;Open in New Tab&quot;.
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

        {!isProcessing && status !== "error" ? (
          <Card className="p-0">
            <div className="sticky top-0 z-30 border-b bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
              <div>
                {previewEditMode === "text" ? (
                  <div data-massic-text-editor="true" className="space-y-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <Tooltip><TooltipTrigger asChild>
                        <Button type="button" size="icon" variant={selectionFormats.bold || activeTextEditor?.style.bold ? "default" : "ghost"} className="h-8 w-8" disabled={!activeTextEditor} onMouseDown={preserveSelectionOnToolbarMouseDown} onClick={() => handleApplyInlineTextFormat("bold")}>
                          <Bold className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger><TooltipContent>Bold (Ctrl/Cmd+B)</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button type="button" size="icon" variant={selectionFormats.italic || activeTextEditor?.style.italic ? "default" : "ghost"} className="h-8 w-8" disabled={!activeTextEditor} onMouseDown={preserveSelectionOnToolbarMouseDown} onClick={() => handleApplyInlineTextFormat("italic")}>
                          <Italic className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger><TooltipContent>Italic (Ctrl/Cmd+I)</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button type="button" size="icon" variant={selectionFormats.underline || activeTextEditor?.style.underline ? "default" : "ghost"} className="h-8 w-8" disabled={!activeTextEditor} onMouseDown={preserveSelectionOnToolbarMouseDown} onClick={() => handleApplyInlineTextFormat("underline")}>
                          <Underline className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger><TooltipContent>Underline (Ctrl/Cmd+U)</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button type="button" size="icon" variant={selectionFormats.strike || activeTextEditor?.style.strike ? "default" : "ghost"} className="h-8 w-8" disabled={!activeTextEditor} onMouseDown={preserveSelectionOnToolbarMouseDown} onClick={() => handleApplyInlineTextFormat("strike")}>
                          <Strikethrough className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger><TooltipContent>Strikethrough (Ctrl/Cmd+Shift+X)</TooltipContent></Tooltip>
                      <div className="mx-1 h-5 w-px bg-border" />
                      <Tooltip><TooltipTrigger asChild>
                        <Button type="button" size="icon" variant={activeTextEditor?.style.align === "left" ? "default" : "ghost"} className="h-8 w-8" disabled={!activeTextEditor} onMouseDown={preserveSelectionOnToolbarMouseDown} onClick={() => activeTextEditor && updateActiveTextStyle({ align: "left" })}>
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger><TooltipContent>Align Left</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button type="button" size="icon" variant={activeTextEditor?.style.align === "center" ? "default" : "ghost"} className="h-8 w-8" disabled={!activeTextEditor} onMouseDown={preserveSelectionOnToolbarMouseDown} onClick={() => activeTextEditor && updateActiveTextStyle({ align: "center" })}>
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger><TooltipContent>Align Center</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button type="button" size="icon" variant={activeTextEditor?.style.align === "right" ? "default" : "ghost"} className="h-8 w-8" disabled={!activeTextEditor} onMouseDown={preserveSelectionOnToolbarMouseDown} onClick={() => activeTextEditor && updateActiveTextStyle({ align: "right" })}>
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger><TooltipContent>Align Right</TooltipContent></Tooltip>
                      <div className="mx-1 h-5 w-px bg-border" />
                      <Tooltip><TooltipTrigger asChild>
                        <Input
                          value={activeTextEditor?.style.lineHeight ?? ""}
                          onChange={(event) => updateActiveTextStyle({ lineHeight: event.target.value })}
                          placeholder="LH"
                          className="h-8! w-8! bg-background text-xs text-center px-0! py-0!"
                          disabled={!activeTextEditor}
                        />
                      </TooltipTrigger><TooltipContent>Line Height</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Input
                          value={activeTextEditor?.style.letterSpacing ?? ""}
                          onChange={(event) => updateActiveTextStyle({ letterSpacing: event.target.value })}
                          placeholder="LS"
                          className="h-8! w-8! bg-background text-xs text-center px-0! py-0!"
                          disabled={!activeTextEditor}
                        />
                      </TooltipTrigger><TooltipContent>Letter Spacing</TooltipContent></Tooltip>
                      {(activeTextEditor || activeLinkEditor) ? (
                        <>
                          <div className="mx-1 h-5 w-px bg-border" />
                          {activeLinkEditor ? (
                            <>
                              <Tooltip><TooltipTrigger asChild>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => void handleRemoveActiveLinkHref()}>
                                  <Unlink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Remove Link</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild>
                                <Button type="button" size="icon" className="h-8 w-8" onClick={() => void handleSaveActiveLinkHref()}>
                                  <Check className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Apply Link</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={closeActiveLinkEditor}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger><TooltipContent>Close</TooltipContent></Tooltip>
                            </>
                          ) : activeTextEditor ? (
                            <Tooltip><TooltipTrigger asChild>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={closeActiveTextEditor}>
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger><TooltipContent>Deselect</TooltipContent></Tooltip>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    {activeLinkEditor ? (
                      <div data-massic-link-editor="true" className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Typography className="text-[11px] font-medium text-muted-foreground">Link Label</Typography>
                          <Input
                            value={linkLabelDraft}
                            onChange={(event) => setLinkLabelDraft(event.target.value)}
                            placeholder="Button or link text"
                            className="h-8 bg-background text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Typography className="text-[11px] font-medium text-muted-foreground">URL</Typography>
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
                            className="h-8 bg-background text-xs"
                            autoFocus
                          />
                        </div>
                        {linkHrefError ? (
                          <Typography className="text-[11px] text-destructive md:col-span-2">{linkHrefError}</Typography>
                        ) : null}
                      </div>
                    ) : null}
                    {activeMediaEditor ? (
                      <div data-massic-media-editor="true" className="rounded-md border bg-background p-3">
                        <MediaEditorPanel
                          media={activeMediaEditor.media}
                          onUpdate={handleUpdateActiveMedia}
                          onCancel={closeActiveMediaEditor}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div data-massic-section-editor="true" className="overflow-x-auto pb-1">
                    <div className="flex min-w-max items-center gap-1 whitespace-nowrap">
                        {activeLayoutEditor ? (
                          <span className="mr-1 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            {activeLayoutEditor.label}
                          </span>
                        ) : (
                          <span className="mr-1 text-xs text-muted-foreground">Select an element</span>
                        )}
                        <div className="mx-0.5 h-5 w-px bg-border" />
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor} onClick={activeLayoutEditor ? handleSelectParentSection : undefined}>
                            <CornerLeftUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Select Parent Section</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor} onClick={() => { if (activeLayoutEditor?.targetKind === "section" && activeLayoutEditor.sectionId) handleMoveSection(activeLayoutEditor.sectionId, "up"); else if (activeLayoutEditor?.isElement && activeLayoutEditor.spacingId) handleMoveElement(activeLayoutEditor.spacingId, "up"); }}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Move Up</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor} onClick={() => { if (activeLayoutEditor?.targetKind === "section" && activeLayoutEditor.sectionId) handleMoveSection(activeLayoutEditor.sectionId, "down"); else if (activeLayoutEditor?.isElement && activeLayoutEditor.spacingId) handleMoveElement(activeLayoutEditor.spacingId, "down"); }}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Move Down</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor} onClick={() => { if (activeLayoutEditor?.targetKind === "section" && activeLayoutEditor.sectionId) handleDuplicateSection(activeLayoutEditor.sectionId); else if (activeLayoutEditor?.isElement && activeLayoutEditor.spacingId) handleDuplicateElement(activeLayoutEditor.spacingId); }}>
                            <CopyPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Duplicate</TooltipContent></Tooltip>
                        <div className="mx-0.5 h-5 w-px bg-border" />
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor} onClick={() => { if (activeLayoutEditor?.targetKind === "section" && activeLayoutEditor.sectionId) handleOpenInsertDialog({ kind: "section", sectionId: activeLayoutEditor.sectionId, position: "before" }); else if (activeLayoutEditor?.isElement && activeLayoutEditor.spacingId) handleOpenInsertDialog({ kind: "element", spacingId: activeLayoutEditor.spacingId, position: "before" }); }}>
                            <ArrowUpFromLine className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Insert Above</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor} onClick={() => { if (activeLayoutEditor?.targetKind === "section" && activeLayoutEditor.sectionId) handleOpenInsertDialog({ kind: "section", sectionId: activeLayoutEditor.sectionId, position: "after" }); else if (activeLayoutEditor?.isElement && activeLayoutEditor.spacingId) handleOpenInsertDialog({ kind: "element", spacingId: activeLayoutEditor.spacingId, position: "after" }); else if (activeLayoutEditor?.isSlot && activeLayoutEditor.slotId) handleOpenInsertDialog({ kind: "slot", slotId: activeLayoutEditor.slotId }); }}>
                            <ArrowDownFromLine className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Insert Below</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant={activeLayoutEditor?.isEmptyElement ? "default" : "ghost"} className="h-8 w-8" disabled={!activeLayoutEditor?.isElement || !activeLayoutEditor?.canInsertInside} onClick={() => { if (activeLayoutEditor?.isElement && activeLayoutEditor.spacingId) handleOpenInsertDialog({ kind: "element", spacingId: activeLayoutEditor.spacingId, position: "inside" }); }}>
                            <SquarePlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Insert Inside</TooltipContent></Tooltip>
                        <div className="mx-0.5 h-5 w-px bg-border" />
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor?.isElement} onClick={() => { if (activeLayoutEditor?.isElement && activeLayoutEditor.spacingId) handleOpenInsertDialog({ kind: "wrap-grid", spacingId: activeLayoutEditor.spacingId, side: "left" }); }}>
                            <PanelLeft className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Add Column Left</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor?.isElement} onClick={() => { if (activeLayoutEditor?.isElement && activeLayoutEditor.spacingId) handleOpenInsertDialog({ kind: "wrap-grid", spacingId: activeLayoutEditor.spacingId, side: "right" }); }}>
                            <PanelRight className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Add Column Right</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor?.isLayout} onClick={() => { if (activeLayoutEditor?.isLayout && activeLayoutEditor.spacingId) handleCollapseLayout(activeLayoutEditor.spacingId); }}>
                            <Minimize2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Collapse Layout</TooltipContent></Tooltip>
                        <div className="mx-0.5 h-5 w-px bg-border" />
                        <Popover>
                          <Tooltip><TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={!activeLayoutEditor?.spacingId || activeLayoutEditor.targetKind === "slot"}
                              >
                                <MoveVertical className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                          </TooltipTrigger><TooltipContent>Spacing</TooltipContent></Tooltip>
                          <PopoverContent align="start" className="w-80 p-3">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <Typography className="text-xs font-medium">Spacing</Typography>
                                  <Typography className="text-[11px] text-muted-foreground">
                                    {formatSpacingButtonLabel(spacingDraft)}
                                  </Typography>
                                </div>
                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => void handleResetSpacingForActiveTarget()}>
                                  <RotateCcw className="mr-1.5 h-3 w-3" />
                                  Reset
                                </Button>
                              </div>
                              <div className="flex items-center gap-1 rounded-md border bg-muted/20 p-1">
                                {[
                                  { label: "0", value: null },
                                  { label: "16", value: 16 },
                                  { label: "24", value: 24 },
                                ].map((preset) => {
                                  const isActive = ["outsideTop", "outsideRight", "outsideBottom", "outsideLeft"].every((key) => {
                                    const spacingKey = key as SpacingDraftKey;
                                    return spacingTokenToPx(spacingDraft[spacingKey]) === (preset.value ?? 0);
                                  });

                                  return (
                                    <Button
                                      key={preset.label}
                                      type="button"
                                      variant={isActive ? "default" : "ghost"}
                                      size="sm"
                                      className="h-7 flex-1 text-[11px]"
                                      onClick={() => applyUniformSpacingDraft(preset.value)}
                                    >
                                      {preset.label}
                                    </Button>
                                  );
                                })}
                              </div>
                              <div className="space-y-2">
                                {([
                                  ["outsideTop", "Top", ArrowUp],
                                  ["outsideRight", "Right", PanelRight],
                                  ["outsideBottom", "Bottom", ArrowDown],
                                  ["outsideLeft", "Left", PanelLeft],
                                ] as Array<[SpacingDraftKey, string, React.ComponentType<{ className?: string }>]>).map(([key, label, Icon]) => (
                                  <div key={key} className="rounded-md border bg-muted/20 px-2 py-1.5">
                                    <div className="mb-1.5 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-background text-muted-foreground">
                                          <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <Typography className="text-[11px] font-medium">{label}</Typography>
                                      </div>
                                      <div className="rounded bg-background px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                                        {spacingTokenToPx(spacingDraft[key])} px
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button type="button" size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => stepActiveSpacingDraft(key, -1)}>
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <Slider
                                        min={EDITABLE_SPACING_PX_MIN}
                                        max={EDITABLE_SPACING_PX_MAX}
                                        step={SPACING_STEP}
                                        value={[spacingTokenToPx(spacingDraft[key])]}
                                        onValueChange={(values) => {
                                          const nextValue = values[0];
                                          updateActiveSpacingDraft(
                                            key,
                                            typeof nextValue === "number" ? pxToSpacingToken(nextValue) : null
                                          );
                                        }}
                                        className="flex-1"
                                      />
                                      <Button type="button" size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => stepActiveSpacingDraft(key, 1)}>
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <div className="inline-flex h-8 items-center rounded-md bg-muted px-2 text-[10px] font-medium text-muted-foreground">
                          {activeLayoutEditor?.spacingId && activeLayoutEditor.targetKind !== "slot"
                            ? formatSpacingButtonLabel(spacingDraft)
                            : "0"}
                        </div>
                        <div className="mx-0.5 h-5 w-px bg-border" />
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" disabled={!activeLayoutEditor} onClick={() => setLayoutDeleteDialogOpen(true)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!activeLayoutEditor} onClick={activeLayoutEditor ? cancelActiveLayoutEditor : undefined}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger><TooltipContent>Deselect</TooltipContent></Tooltip>
                    </div>
                    {activeLayoutEditor?.mediaTarget && activeLayoutEditor.spacingId ? (
                      <div className="mt-2 rounded-md border bg-background p-3">
                        <MediaEditorPanel
                          media={activeLayoutEditor.mediaTarget}
                          onUpdate={(updates) => handleUpdateMedia(activeLayoutEditor.spacingId!, activeLayoutEditor.mediaTarget!, updates)}
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <div className="relative p-4 pt-3">
              <div
                ref={previewContainerRef}
                className={cn(
                  "massic-html-preview min-h-[420px] overflow-auto rounded-md border bg-background p-4",
                  previewEditMode === "text" && "massic-mode-text",
                  previewEditMode === "layout" && "massic-mode-layout"
                )}
                style={previewStyleVars}
                onMouseDownCapture={handlePreviewMouseDownCapture}
                onMouseUpCapture={handlePreviewMouseUpCapture}
                onClickCapture={handlePreviewClickCapture}
                onAuxClickCapture={handlePreviewAuxClickCapture}
                onMouseMoveCapture={handlePreviewMouseMoveCapture}
                onMouseLeave={handlePreviewMouseLeaveCapture}
                onInputCapture={handleInputCapture}
                onBlurCapture={handleBlurCapture}
                onFocusCapture={handleFocusCapture}
                onPasteCapture={handlePasteCapture}
                onKeyDownCapture={handleKeyDownCapture}
              />
              <AIRefineToolbarDom
                containerRef={previewContainerRef}
                enabled={previewEditMode === "text"}
                onRefine={handleAiRefine}
                onAccept={handleAcceptAiRefine}
                onExpandedChange={setIsAiRefineExpanded}
              />
            </div>
            <InsertBlockDialog
              open={insertDialogOpen}
              onOpenChange={setInsertDialogOpen}
              onInsert={handleInsertBlock}
              mode={
                (insertAnchor?.kind === "element" && insertAnchor.position === "inside") || insertAnchor?.kind === "wrap-grid" || insertAnchor?.kind === "slot"
                  ? "inner"
                  : "section"
              }
              insertHint={
                insertAnchor?.kind === "element" && insertAnchor.position === "inside"
                  ? "Will be added inside the selected element"
                  : insertAnchor?.kind === "element" && insertAnchor.position === "before"
                    ? "Will be inserted before the selected element"
                    : insertAnchor?.kind === "element" && insertAnchor.position === "after"
                      ? "Will be inserted after the selected element"
                      : insertAnchor?.kind === "section" && insertAnchor.position === "before"
                        ? "Will be inserted before the selected section"
                        : insertAnchor?.kind === "section" && insertAnchor.position === "after"
                          ? "Will be inserted after the selected section"
                          : insertAnchor?.kind === "slot"
                            ? "Will be added inside the selected slot"
                            : insertAnchor?.kind === "wrap-grid"
                              ? `Will add a column to the ${insertAnchor.side}`
                              : "Will be inserted at the end of the page"
              }
            />
            <AlertDialog open={layoutDeleteDialogOpen} onOpenChange={setLayoutDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {activeLayoutEditor?.label || "selection"}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the selected {activeLayoutEditor?.targetKind || "item"} from the page. You can undo it with Ctrl+Z.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={handleConfirmActiveLayoutDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <style>{`
              ${previewMassicVarCss}
              .massic-html-preview .massic-text-editable {
                border-radius: 4px;
                outline: none;
                transition: background-color 120ms ease, box-shadow 120ms ease;
              }
              .massic-html-preview a[data-massic-link-id] {
                cursor: pointer;
                position: relative;
                transition: box-shadow 120ms ease, background-color 120ms ease, color 120ms ease;
              }
              .massic-html-preview.massic-mode-text .massic-text-editable {
                cursor: text;
                position: relative;
                border-radius: 4px;
                transition: box-shadow 120ms ease, background-color 120ms ease;
              }
              .massic-html-preview.massic-mode-text [data-massic-media-editable] {
                cursor: pointer;
                position: relative;
                transition: box-shadow 120ms ease, background-color 120ms ease, transform 120ms ease;
              }
              .massic-html-preview a[data-massic-link-id]:hover,
              .massic-html-preview a[data-massic-link-id]:focus-visible {
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 12%, transparent);
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--massic-primary, #2E6A56) 35%, transparent);
                border-radius: 4px;
                outline: none;
              }
              .massic-html-preview.massic-mode-text [data-massic-media-editable]:hover,
              .massic-html-preview.massic-mode-text [data-massic-media-editable]:focus-visible {
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--massic-primary, #2E6A56) 40%, transparent);
              }
              .massic-html-preview.massic-mode-text .massic-text-editable:hover {
                background: transparent;
                box-shadow: none;
              }
              .massic-html-preview.massic-mode-text [data-massic-text-owner-selected='true'] {
                border-radius: 6px;
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 5%, transparent);
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--massic-primary, #2E6A56) 28%, transparent);
              }
              .massic-html-preview.massic-mode-text [data-massic-ai-selection='true'] {
                border-radius: 3px;
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 24%, white);
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--massic-primary, #2E6A56) 35%, transparent);
              }
              .massic-html-preview.massic-mode-text [data-massic-ai-selection-owner='true'] {
                border-radius: 6px;
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 10%, transparent);
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--massic-primary, #2E6A56) 22%, transparent);
              }
              .massic-html-preview.massic-mode-text [data-massic-text-editing='true'] {
                cursor: text;
                outline: none;
              }
              .massic-html-preview.massic-mode-text a[data-massic-link-id] .massic-text-editable:hover {
                background: transparent;
                box-shadow: none;
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
              .massic-html-preview.massic-mode-text [data-massic-media-editable]:hover::after,
              .massic-html-preview.massic-mode-text [data-massic-media-editable]:focus-visible::after {
                content: attr(data-massic-edit-hint);
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
              .massic-html-preview.massic-mode-text .massic-text-editable:hover::after {
                content: none;
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
              .massic-html-preview.massic-mode-text a[data-massic-link-id] .massic-text-editable:hover::after {
                content: none;
              }
              .massic-html-preview.massic-mode-layout .massic-text-editable {
                pointer-events: none;
              }
              .massic-html-preview.massic-mode-layout a[data-massic-link-id]:hover::after,
              .massic-html-preview.massic-mode-layout a[data-massic-link-id]:focus-visible::after {
                content: none;
              }
              .massic-html-preview .massic-layout.massic-grid,
              .massic-html-preview .massic-grid {
                display: grid !important;
                gap: var(--massic-s5) !important;
              }
              .massic-html-preview .massic-layout.massic-grid.cols-2,
              .massic-html-preview .massic-grid.cols-2 {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
              .massic-html-preview .massic-layout.massic-grid.cols-3,
              .massic-html-preview .massic-grid.cols-3 {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              }
              .massic-html-preview .massic-layout.massic-grid.cols-4,
              .massic-html-preview .massic-grid.cols-4 {
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              }
              .massic-html-preview .massic-layout > .massic-slot,
              .massic-html-preview .massic-grid > .massic-slot,
              .massic-html-preview .massic-grid > *,
              .massic-html-preview .massic-split > * {
                min-width: 0;
              }
              .massic-html-preview .massic-split {
                display: grid !important;
                gap: var(--massic-s6) !important;
                align-items: center;
                grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) !important;
              }
              /* Responsive collapse removed from preview – inline styles on elements
                 guarantee the correct grid-template-columns regardless of viewport size. */
              .massic-html-preview.massic-mode-layout [data-massic-spacing-id],
              .massic-html-preview.massic-mode-layout [data-massic-section-id],
              .massic-html-preview.massic-mode-layout [data-massic-slot-id] {
                position: relative;
                cursor: pointer;
                outline: 1px dashed transparent;
                outline-offset: 2px;
                transition: outline-color 120ms ease, background-color 120ms ease;
              }
              .massic-html-preview.massic-mode-layout [data-massic-slot-id] {
                min-height: 72px;
              }
              .massic-html-preview.massic-mode-layout [data-massic-slot-empty='true'] {
                background:
                  repeating-linear-gradient(
                    135deg,
                    color-mix(in srgb, var(--massic-primary, #2E6A56) 4%, transparent),
                    color-mix(in srgb, var(--massic-primary, #2E6A56) 4%, transparent) 10px,
                    transparent 10px,
                    transparent 20px
                  );
              }
              .massic-html-preview.massic-mode-layout [data-massic-section-id] {
                outline-width: 2px;
                outline-offset: 4px;
              }
              .massic-html-preview.massic-mode-layout [data-massic-layout-hovered='true'] {
                outline-color: color-mix(in srgb, var(--massic-primary, #2E6A56) 40%, transparent);
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 5%, transparent);
              }
              .massic-html-preview.massic-mode-layout [data-massic-layout-id]::before,
              .massic-html-preview.massic-mode-layout [data-massic-layout-id]::after,
              .massic-html-preview.massic-mode-layout .massic-grid::before,
              .massic-html-preview.massic-mode-layout .massic-grid::after,
              .massic-html-preview.massic-mode-layout .massic-split::before,
              .massic-html-preview.massic-mode-layout .massic-split::after {
                display: none !important;
              }
              .massic-html-preview.massic-mode-layout [data-massic-layout-selected='true'] {
                outline-color: color-mix(in srgb, var(--massic-primary, #2E6A56) 70%, transparent);
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 8%, transparent);
              }
              .massic-html-preview.massic-mode-layout [data-massic-section-id] + [data-massic-section-id] {
                margin-top: 4px;
              }
              .massic-html-preview.massic-mode-layout [data-massic-section-id] + [data-massic-section-id]::before {
                content: "";
                display: block;
                height: 2px;
                margin: -3px 24px 4px;
                border-radius: 1px;
                background: color-mix(in srgb, var(--massic-primary, #2E6A56) 15%, transparent);
                transition: background-color 150ms ease;
              }
              .massic-html-preview .massic-video-wrap {
                position: relative;
                width: 100%;
                aspect-ratio: 16 / 9;
                overflow: hidden;
                border-radius: 8px;
              }
              .massic-html-preview .massic-video-wrap iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 0;
              }
              .massic-html-preview .massic-video-wrap iframe,
              .massic-html-preview iframe {
                pointer-events: none;
                will-change: transform;
              }
              .massic-html-preview .massic-video-wrap,
              .massic-html-preview [data-massic-media-hint-wrap] {
                isolation: isolate;
              }
            `}</style>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
