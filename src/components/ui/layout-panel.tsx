"use client";

import * as React from "react";
import {
  ChevronsUp,
  ChevronsDown,
  Copy,
  Trash2,
  ArrowUpFromLine,
  ArrowDownFromLine,
  CornerLeftUp,
  MoveUp,
  MoveDown,
  MoveLeft,
  MoveRight,
  RotateCcw,
  X,
  Check,
  Plus,
  PanelLeftOpen,
  PanelRightOpen,
  Image as ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  EDITABLE_SPACING_PX_MAX,
  EDITABLE_SPACING_PX_MIN,
  type EditableSpacingToken,
  type EditableSpacingValue,
  type MediaElementInfo,
} from "@/utils/page-html-editor";

const STEP = 8;

const SPACING_SCALE_PIXEL_BASE: Record<string, number> = {
  none: 0, xs: 8, s: 12, m: 16, l: 24, xl: 32,
};

function tokenToPx(value: EditableSpacingToken | null | undefined): number {
  if (!value || typeof value !== "string") return 0;
  if (value.startsWith("num:")) {
    const n = Number(value.slice(4));
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  const norm = String(value).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(SPACING_SCALE_PIXEL_BASE, norm)) {
    return SPACING_SCALE_PIXEL_BASE[norm];
  }
  return 0;
}

function clampPx(v: number): number {
  return Math.round(Math.max(EDITABLE_SPACING_PX_MIN, Math.min(EDITABLE_SPACING_PX_MAX, v)));
}

function pxToToken(px: number): EditableSpacingToken {
  return `num:${clampPx(px)}`;
}

const WIDTH_PRESETS = ["100%", "75%", "50%", "33%"];

export interface LayoutPanelProps {
  label: string;
  top: number;
  left: number;

  targetKind: "section" | "block" | "layout" | "slot";
  isSection: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;

  hasParentSection: boolean;
  onSelectParentSection?: () => void;

  isElement: boolean;
  isLayout?: boolean;
  isSlot?: boolean;
  canInsertInside?: boolean;
  isFirstSibling: boolean;
  isLastSibling: boolean;
  isEmptyElement: boolean;
  onMoveElementUp?: () => void;
  onMoveElementDown?: () => void;
  onDuplicateElement?: () => void;
  onDeleteElement?: () => void;
  onInsertInside?: () => void;
  onInsertBeforeSibling?: () => void;
  onInsertAfterSibling?: () => void;

  onInsertLeft?: () => void;
  onInsertRight?: () => void;
  onInsertIntoSlot?: () => void;
  onDeleteSlot?: () => void;
  onCollapseLayout?: () => void;

  mediaTarget: MediaElementInfo | null;
  onMediaUpdate?: (updates: { src?: string; alt?: string; width?: string }) => void;

  spacingDraft: EditableSpacingValue;
  onSpacingDraftChange: (draft: EditableSpacingValue) => void;
  onApplySpacing: () => void;
  onResetSpacing: () => void;
  onCancelSpacing: () => void;
}

type SpacingKey = keyof EditableSpacingValue;

const SPACING_DIRS: Array<{
  key: SpacingKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "outsideTop", label: "Top", Icon: MoveUp },
  { key: "outsideBottom", label: "Bottom", Icon: MoveDown },
  { key: "outsideLeft", label: "Left", Icon: MoveLeft },
  { key: "outsideRight", label: "Right", Icon: MoveRight },
];

function IconBtn({
  tip,
  disabled,
  destructive,
  onClick,
  children,
}: {
  tip: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`h-7 w-7 p-0 ${destructive ? "text-destructive hover:text-destructive hover:bg-destructive/10" : ""}`}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

export function MediaEditorPanel({
  media,
  onUpdate,
  onCancel,
}: {
  media: MediaElementInfo;
  onUpdate: (updates: { src?: string; alt?: string; width?: string }) => void;
  onCancel?: () => void;
}) {
  const [srcDraft, setSrcDraft] = React.useState(media.src);
  const [altDraft, setAltDraft] = React.useState(media.alt);
  const [widthDraft, setWidthDraft] = React.useState(media.width || "");

  React.useEffect(() => {
    setSrcDraft(media.src);
    setAltDraft(media.alt);
    setWidthDraft(media.width || "");
  }, [media.src, media.alt, media.width]);

  const isImage = media.type === "img";
  const currentWidth = media.width || "100%";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ImageIcon className="h-3 w-3 text-muted-foreground" />
        <Typography className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {isImage ? "Image" : "Video"}
        </Typography>
      </div>

      {/* URL */}
      <div className="space-y-1">
        <Typography className="text-[10px] font-medium text-muted-foreground">
          {isImage ? "Image URL" : "Embed URL"}
        </Typography>
        <div className="flex gap-1">
          <Input
            value={srcDraft}
            onChange={(e) => setSrcDraft(e.target.value)}
            placeholder={isImage ? "https://example.com/image.jpg" : "https://youtube.com/embed/..."}
            className="h-7 text-[11px] flex-1"
          />
          <Button
            type="button"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            disabled={srcDraft === media.src}
            onClick={() => onUpdate({ src: srcDraft })}
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Typography className="text-[10px] font-medium text-muted-foreground">
          {isImage ? "Alt Text" : "Video Title"}
        </Typography>
        <div className="flex gap-1">
          <Input
            value={altDraft}
            onChange={(e) => setAltDraft(e.target.value)}
            placeholder={isImage ? "Describe the image" : "Describe the embedded video"}
            className="h-7 text-[11px] flex-1"
          />
          <Button
            type="button"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            disabled={altDraft === media.alt}
            onClick={() => onUpdate({ alt: altDraft })}
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Width resize */}
      <div className="space-y-1">
        <Typography className="text-[10px] font-medium text-muted-foreground">
          Width: {currentWidth || "auto"}
        </Typography>
        <div className="flex items-center gap-1 flex-wrap">
          {WIDTH_PRESETS.map((w) => (
            <Button
              key={w}
              type="button"
              size="sm"
              variant={currentWidth === w ? "default" : "outline"}
              className="h-6 px-2 text-[10px]"
              onClick={() => onUpdate({ width: w })}
            >
              {w}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={!WIDTH_PRESETS.includes(currentWidth) && currentWidth !== "100%" ? "default" : "outline"}
            className="h-6 px-2 text-[10px]"
            onClick={() => onUpdate({ width: "" })}
          >
            Auto
          </Button>
        </div>
        <div className="flex gap-1">
          <Input
            value={widthDraft}
            onChange={(e) => setWidthDraft(e.target.value)}
            placeholder="100%, 320px"
            className="h-7 text-[11px] flex-1"
          />
          <Button
            type="button"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            disabled={widthDraft === (media.width || "")}
            onClick={() => onUpdate({ width: widthDraft.trim() })}
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {onCancel ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={onCancel}
          >
            Close
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function LayoutPanel({
  label,
  top,
  left,
  targetKind,
  isSection,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onInsertAbove,
  onInsertBelow,
  hasParentSection,
  onSelectParentSection,
  isElement,
  isLayout = false,
  isSlot = false,
  canInsertInside = true,
  isFirstSibling,
  isLastSibling,
  isEmptyElement,
  onMoveElementUp,
  onMoveElementDown,
  onDuplicateElement,
  onDeleteElement,
  onInsertInside,
  onInsertBeforeSibling,
  onInsertAfterSibling,
  onInsertLeft,
  onInsertRight,
  onInsertIntoSlot,
  onDeleteSlot,
  onCollapseLayout,
  mediaTarget,
  onMediaUpdate,
  spacingDraft,
  onSpacingDraftChange,
  onApplySpacing,
  onResetSpacing,
  onCancelSpacing,
}: LayoutPanelProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const stepSpacing = React.useCallback(
    (key: SpacingKey, direction: 1 | -1) => {
      const current = tokenToPx(spacingDraft[key]);
      const next = clampPx(current + direction * STEP);
      onSpacingDraftChange({ ...spacingDraft, [key]: pxToToken(next) });
    },
    [onSpacingDraftChange, spacingDraft]
  );

  return (
    <>
      <div
        data-massic-section-editor="true"
        className="absolute z-20 rounded-lg border bg-background shadow-lg"
        style={{ top, left, width: "auto", minWidth: 0, maxWidth: 280 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 border-b">
          <Typography className="text-[11px] font-semibold text-foreground truncate max-w-[160px]">
            {label}
          </Typography>
          {hasParentSection && onSelectParentSection ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={onSelectParentSection}
                >
                  <CornerLeftUp className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                Select parent section
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {/* Section actions (top-level sections) */}
        {isSection ? (
          <div className="flex items-center justify-center gap-0.5 border-b px-1.5 py-1.5">
            <IconBtn tip="Move up" disabled={isFirst} onClick={onMoveUp}>
              <ChevronsUp className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn tip="Move down" disabled={isLast} onClick={onMoveDown}>
              <ChevronsDown className="h-3.5 w-3.5" />
            </IconBtn>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <IconBtn tip="Duplicate" onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn tip="Delete section" destructive onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconBtn>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <IconBtn tip="Insert above" onClick={onInsertAbove}>
              <ArrowUpFromLine className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn tip="Insert below" onClick={onInsertBelow}>
              <ArrowDownFromLine className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        ) : null}

        {/* Element actions (inner elements) */}
        {isElement && !isSection ? (
          <div className="border-b px-1.5 py-1.5 space-y-1.5">
            <div className="flex items-center justify-center gap-0.5">
              <IconBtn tip="Move up" disabled={isFirstSibling} onClick={() => onMoveElementUp?.()}>
                <ChevronsUp className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn tip="Move down" disabled={isLastSibling} onClick={() => onMoveElementDown?.()}>
                <ChevronsDown className="h-3.5 w-3.5" />
              </IconBtn>
              <div className="mx-0.5 h-4 w-px bg-border" />
              <IconBtn tip="Duplicate" onClick={() => onDuplicateElement?.()}>
                <Copy className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn tip="Delete" destructive onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconBtn>
              <div className="mx-0.5 h-4 w-px bg-border" />
              <IconBtn tip="Insert before" onClick={() => onInsertBeforeSibling?.()}>
                <ArrowUpFromLine className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn tip="Insert after" onClick={() => onInsertAfterSibling?.()}>
                <ArrowDownFromLine className="h-3.5 w-3.5" />
              </IconBtn>
            </div>

            {/* Insert Left / Right + Insert Inside */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 h-7 gap-1 text-[10px]"
                onClick={() => onInsertLeft?.()}
              >
                <PanelLeftOpen className="h-3 w-3" />
                Left
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isEmptyElement ? "default" : "outline"}
                className="flex-1 h-7 gap-1 text-[10px]"
                disabled={!canInsertInside}
                onClick={() => onInsertInside?.()}
              >
                <Plus className="h-3 w-3" />
                Inside
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-1 h-7 gap-1 text-[10px]"
                onClick={() => onInsertRight?.()}
              >
                <PanelRightOpen className="h-3 w-3" />
                Right
              </Button>
            </div>
          </div>
        ) : null}

        {isLayout ? (
          <div className="border-b px-1.5 py-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-full text-[10px]"
              onClick={() => onCollapseLayout?.()}
            >
              Collapse Layout
            </Button>
          </div>
        ) : null}

        {isSlot ? (
          <div className="border-b px-1.5 py-1.5 space-y-1">
            <Button
              type="button"
              size="sm"
              className="h-7 w-full gap-1 text-[10px]"
              onClick={() => onInsertIntoSlot?.()}
            >
              <Plus className="h-3 w-3" />
              {isEmptyElement ? "Add Content" : "Add More Content"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-full text-[10px] text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Delete Slot
            </Button>
          </div>
        ) : null}

        {/* Media editing (image URL, alt, width) */}
        {mediaTarget && onMediaUpdate ? (
          <div className="border-b px-2 py-2">
            <MediaEditorPanel media={mediaTarget} onUpdate={onMediaUpdate} />
          </div>
        ) : null}

        {/* Spacing controls */}
        {targetKind !== "slot" ? (
        <div className="px-2 py-2 space-y-2">
          <div className="flex items-center justify-center gap-1">
            {SPACING_DIRS.map(({ key, label: dirLabel, Icon }) => {
              const px = tokenToPx(spacingDraft[key]);
              const hasValue = px !== 0;
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`relative flex flex-col items-center justify-center h-9 w-10 rounded-md border transition-colors
                        ${hasValue
                          ? "border-primary/40 bg-primary/5 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        }`}
                      onClick={(e) => stepSpacing(key, e.shiftKey ? -1 : 1)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        stepSpacing(key, -1);
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className={`text-[9px] leading-none mt-0.5 font-medium ${hasValue ? "text-primary" : "text-muted-foreground/70"}`}>
                        {px}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={4}>
                    <span>{dirLabel}: {px}px</span>
                    <span className="block text-[10px] opacity-60">Click +{STEP} · Shift-click −{STEP}</span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Action row */}
          <div className="flex items-center justify-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onResetSpacing}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>Reset spacing</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCancelSpacing}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>Cancel</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="sm" className="h-7 w-7 p-0" onClick={onApplySpacing}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>Apply spacing</TooltipContent>
            </Tooltip>
          </div>
        </div>
        ) : null}
      </div>

      {/* Delete confirmation */}
      {(isSection || isElement || isSlot) ? (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this {isSection ? "section" : isSlot ? "slot" : "element"} from the page. You can undo with Ctrl+Z.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => {
                  setConfirmDelete(false);
                  if (isSection) {
                    onDelete();
                  } else if (isSlot) {
                    onDeleteSlot?.();
                  } else {
                    onDeleteElement?.();
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
