"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/utils/clipboard";
import { resolvePageContent } from "@/utils/page-content-resolver";
import { api } from "@/hooks/use-api";
import { ensureMassicContentWrapper } from "@/utils/page-content-format";
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
import { buildStyledMassicHtml, getMassicCssText } from "@/utils/massic-html-copy";
import { useWebActionContentQuery } from "@/hooks/use-web-page-actions";

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

  const contentQuery = useWebActionContentQuery({
    type: "page",
    businessId,
    pageId,
    enabled: !!businessId && !!pageId,
    pollingDisabled,
    pollingIntervalMs: 6000,
  });

  const data = contentQuery.data;
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

  const cssVarOverrides: Record<string, string> = {};
  const previewStyleVars: React.CSSProperties = {};
  const previewMassicVarCss = "";

  const status = (data?.status || "").toString().toLowerCase();
  const isProcessing = status === "pending" || status === "processing";
  const hasFinalContent = canonicalizeHtml(sourceHtmlRef.current).length > 0;


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

        {!isProcessing && status !== "error" ? (
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
    </div>
  );
}

