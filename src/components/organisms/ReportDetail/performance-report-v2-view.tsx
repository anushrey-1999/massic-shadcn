"use client";

import * as React from "react";

import {
  buildPerformanceReportV2BodyHtml,
  PERFORMANCE_REPORT_V2_SCOPED_CSS,
  type PerformanceReportV2TemplateContext,
} from "@/utils/performance-report-v2-template";
import {
  applyPerformanceReportV2EditedFields,
  getPerformanceReportV2EditedFields,
  stripPerformanceReportV2EditedFields,
  type PerformanceReportV2EditedFields,
} from "@/utils/performance-report-v2";
import { cn } from "@/lib/utils";

interface PerformanceReportV2ViewProps {
  performanceReport: unknown;
  context?: PerformanceReportV2TemplateContext;
  isEditing?: boolean;
  resetVersion?: number;
  onSaveEditedFields?: (editedFields: PerformanceReportV2EditedFields) => Promise<void>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function pickText(...values: unknown[]): string {
  for (const v of values) {
    const t = toText(v).trim();
    if (t) return t;
  }
  return "";
}

function normalizeReviewAreas(value: unknown): Array<{ title: string; body: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isObject(item)) return null;
      const title = toText(item.title).trim();
      const body = toText(item.body).trim();
      return title && body ? { title, body } : null;
    })
    .filter((item): item is { title: string; body: string } => Boolean(item));
}

function unwrapNamedOutput(value: unknown, key: string): Record<string, unknown> {
  if (!isObject(value)) return {};
  if (isObject(value[key])) return value[key] as Record<string, unknown>;
  return value;
}

function getProseOutput(context?: PerformanceReportV2TemplateContext): Record<string, unknown> {
  return unwrapNamedOutput(context?.llmOutputs?.prose, "prose");
}

function splitHeadlineParagraph(paragraph: string): { title: string; body: string } {
  const cleaned = paragraph.replace(/\s+/g, " ").trim();
  if (!cleaned) return { title: "Performance summary", body: "" };
  const match = cleaned.match(/^[^.!?]+[.!?]/);
  if (!match) return { title: cleaned, body: cleaned };
  const title = match[0].trim();
  const body = cleaned.slice(title.length).trim();
  return { title, body: body || cleaned };
}

function normalizeEditableText(value: string, multiline: boolean): string {
  const next = value.replace(/\u00A0/g, " ").replace(/\r\n/g, "\n");
  return multiline ? next.trim() : next.replace(/\s+/g, " ").trim();
}

function serializeEditedFields(value: PerformanceReportV2EditedFields): string {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<PerformanceReportV2EditedFields>((acc, key) => {
        acc[key] = value[key];
        return acc;
      }, {})
  );
}

function cloneEditedFields(value: PerformanceReportV2EditedFields): PerformanceReportV2EditedFields {
  return JSON.parse(JSON.stringify(value)) as PerformanceReportV2EditedFields;
}

function stripInternalFields(value: PerformanceReportV2EditedFields): PerformanceReportV2EditedFields {
  return value;
}

function serializeForCompare(value: PerformanceReportV2EditedFields): string {
  return serializeEditedFields(value);
}

interface EditableField {
  path: string;
  multiline: boolean;
  nodes: HTMLElement[];
  ownerNode: HTMLElement;
  getValue: () => string;
  setValue: (v: string) => void;
}

function resolveEditableFields(
  report: unknown,
  context?: PerformanceReportV2TemplateContext,
  editedFields?: PerformanceReportV2EditedFields
): { values: Record<string, string>; channelNames: string[]; reviewAreas: Array<{ title: string; body: string }> } {
  const r = isObject(report) ? report : {};
  const prose = getProseOutput(context);
  const rChannelNotes = isObject(r.channel_notes) ? (r.channel_notes as Record<string, unknown>) : {};
  const pChannelNotes = isObject(prose.channel_notes) ? (prose.channel_notes as Record<string, unknown>) : {};
  const ef = editedFields ?? {};

  const values: Record<string, string> = {};

  const paragraph = pickText(r.plain_english_paragraph, prose.plain_english_paragraph);
  if (paragraph) {
    values.plain_english_paragraph = paragraph;
    const editedTitle = ef["plain_english_paragraph.title"] ?? "";
    const editedBody = ef["plain_english_paragraph.body"] ?? "";
    if (editedTitle || editedBody) {
      const fallbackSplit = splitHeadlineParagraph(paragraph);
      values["plain_english_paragraph.title"] = editedTitle || fallbackSplit.title;
      values["plain_english_paragraph.body"] = editedBody || fallbackSplit.body;
    } else {
      const split = splitHeadlineParagraph(paragraph);
      values["plain_english_paragraph.title"] = split.title;
      values["plain_english_paragraph.body"] = split.body;
    }
  }

  const allChannelNotes = { ...pChannelNotes, ...rChannelNotes };
  for (const [name, note] of Object.entries(allChannelNotes)) {
    const text = toText(note).trim();
    if (text) values[`channel_notes.${name}`] = text;
  }

  const organicNote = pickText(r.organic_page_note, prose.organic_page_note);
  if (organicNote) values.organic_page_note = organicNote;

  const rankNarr = pickText(r.ranking_narrative, prose.ranking_narrative);
  if (rankNarr) values.ranking_narrative = rankNarr;

  const areas = normalizeReviewAreas(
    Array.isArray(r.review_areas) && r.review_areas.length ? r.review_areas : prose.review_areas
  );
  areas.forEach((a, i) => {
    if (a.title) values[`review_areas.${i}.title`] = a.title;
    if (a.body) values[`review_areas.${i}.body`] = a.body;
  });

  const confNote = pickText(r.confidence_note, prose.confidence_note);
  if (confNote) values.confidence_note = confNote;

  const channels = isObject(report) && Array.isArray(report.channels)
    ? report.channels.filter((c): c is Record<string, unknown> => isObject(c))
    : [];
  const channelNames = channels.map((c) => toText(c.name).trim());

  return { values, channelNames, reviewAreas: areas };
}

function discoverEditableFields(
  container: HTMLElement,
  fieldValues: Record<string, string>,
  channelNames: string[],
  reviewAreas: Array<{ title: string; body: string }>
): EditableField[] {
  const fields: EditableField[] = [];

  const hlTitle = container.querySelector(".headline .hl-title");
  const hlBody = container.querySelector(".headline .hl-body");
  if (hlTitle instanceof HTMLElement && hlBody instanceof HTMLElement && fieldValues.plain_english_paragraph) {
    const owner = (hlTitle.closest(".headline") as HTMLElement) || hlTitle;
    fields.push({
      path: "plain_english_paragraph.title",
      multiline: false,
      nodes: [hlTitle],
      ownerNode: owner,
      getValue: () => normalizeEditableText(hlTitle.innerText, false),
      setValue: (v) => { hlTitle.innerText = v; },
    });
    fields.push({
      path: "plain_english_paragraph.body",
      multiline: true,
      nodes: [hlBody],
      ownerNode: owner,
      getValue: () => normalizeEditableText(hlBody.innerText, true),
      setValue: (v) => { hlBody.innerText = v; },
    });
  }

  const cards = Array.from(container.querySelectorAll(".ch-card"));
  cards.forEach((card, i) => {
    if (!(card instanceof HTMLElement)) return;
    const name = channelNames[i];
    if (!name) return;
    const path = `channel_notes.${name}`;
    if (!fieldValues[path]) return;
    const note = card.querySelector(".ch-note");
    if (!(note instanceof HTMLElement)) return;
    fields.push({
      path,
      multiline: false,
      nodes: [note],
      ownerNode: note,
      getValue: () => normalizeEditableText(note.innerText, false),
      setValue: (v) => { note.innerText = v; },
    });
  });

  const pgNote = container.querySelector(".pg-note");
  if (pgNote instanceof HTMLElement && fieldValues.organic_page_note) {
    fields.push({
      path: "organic_page_note",
      multiline: false,
      nodes: [pgNote],
      ownerNode: pgNote,
      getValue: () => normalizeEditableText(pgNote.innerText, false),
      setValue: (v) => { pgNote.innerText = v; },
    });
  }

  const rkSub = container.querySelector(".rk-sub");
  if (rkSub instanceof HTMLElement && fieldValues.ranking_narrative) {
    fields.push({
      path: "ranking_narrative",
      multiline: true,
      nodes: [rkSub],
      ownerNode: rkSub,
      getValue: () => normalizeEditableText(rkSub.innerText, true),
      setValue: (v) => { rkSub.innerText = v; },
    });
  }

  const wrItems = Array.from(container.querySelectorAll(".wr-item"));
  wrItems.forEach((item, i) => {
    if (!(item instanceof HTMLElement)) return;
    const area = reviewAreas[i];
    if (!area) return;
    const textNode = item.querySelector(".wr-text");
    if (!(textNode instanceof HTMLElement)) return;
    const titleNode = textNode.querySelector("strong");
    if (!(titleNode instanceof HTMLElement)) return;

    let bodyNode = textNode.querySelector("[data-report-review-body]") as HTMLElement | null;
    if (!bodyNode) {
      bodyNode = document.createElement("span");
      bodyNode.setAttribute("data-report-review-body", "true");
      const children = Array.from(textNode.childNodes);
      let moved = false;
      for (const child of children) {
        if (child === titleNode) continue;
        bodyNode.appendChild(child);
        moved = true;
      }
      if (!moved) bodyNode.textContent = "";
      textNode.appendChild(bodyNode);
    }

    const tPath = `review_areas.${i}.title`;
    const bPath = `review_areas.${i}.body`;
    if (fieldValues[tPath]) {
      fields.push({
        path: tPath,
        multiline: false,
        nodes: [titleNode],
        ownerNode: titleNode,
        getValue: () => normalizeEditableText(titleNode.innerText, false).replace(/\.$/, "").trim(),
        setValue: (v) => { titleNode.innerText = `${v}.`; },
      });
    }
    if (fieldValues[bPath] && bodyNode) {
      const bn = bodyNode;
      fields.push({
        path: bPath,
        multiline: true,
        nodes: [bn],
        ownerNode: bn,
        getValue: () => normalizeEditableText(bn.innerText, true),
        setValue: (v) => { bn.innerText = v; },
      });
    }
  });

  const cfBody = container.querySelector(".cf-body");
  if (cfBody instanceof HTMLElement && fieldValues.confidence_note) {
    fields.push({
      path: "confidence_note",
      multiline: true,
      nodes: [cfBody],
      ownerNode: cfBody,
      getValue: () => normalizeEditableText(cfBody.innerText, true),
      setValue: (v) => { cfBody.innerText = v; },
    });
  }

  return fields;
}

const EDIT_CSS = `
  .pr-v2-edit-surface.pr-v2-editing .ch-card,
  .pr-v2-edit-surface.pr-v2-editing .pages-card,
  .pr-v2-edit-surface.pr-v2-editing .rk-card,
  .pr-v2-edit-surface.pr-v2-editing .gbp-card,
  .pr-v2-edit-surface.pr-v2-editing .rv-card {
    overflow: visible;
  }
  .pr-v2-edit-surface.pr-v2-editing [data-edit-owner] {
    cursor: text;
    position: relative;
    border-radius: 8px;
    padding: 6px 8px;
    margin: 0;
    box-sizing: border-box;
    border: 1.5px dashed rgba(46, 106, 86, 0.85);
    transition: background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
    background: #ffffff;
  }
  .pr-v2-edit-surface.pr-v2-editing [data-edit-owner]:hover {
    border-color: rgba(46, 106, 86, 0.85);
    background: #ffffff;
  }
  .pr-v2-edit-surface.pr-v2-editing [data-edit-owner][data-edit-active] {
    border-color: rgba(46, 106, 86, 0.85);
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(45, 106, 86, 0.08);
  }
  .pr-v2-edit-surface.pr-v2-editing [data-edit-field] {
    cursor: text;
    outline: none;
    caret-color: #2E6A56;
  }
`;

export function PerformanceReportV2View({
  performanceReport,
  context,
  isEditing = false,
  resetVersion = 0,
  onSaveEditedFields,
}: PerformanceReportV2ViewProps) {
  const outerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const fieldsRef = React.useRef<EditableField[]>([]);
  const draftRef = React.useRef<PerformanceReportV2EditedFields>({});
  const isSavingRef = React.useRef(false);
  const pendingRef = React.useRef<PerformanceReportV2EditedFields | null>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = React.useRef(onSaveEditedFields);
  const prevResetRef = React.useRef(resetVersion);
  const cleanupRef = React.useRef<(() => void) | null>(null);
  const isEditingRef = React.useRef(isEditing);

  const [activeFieldPath, setActiveFieldPath] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>("idle");

  isEditingRef.current = isEditing;
  React.useEffect(() => { onSaveRef.current = onSaveEditedFields; }, [onSaveEditedFields]);

  const serverEdited = React.useMemo(
    () => getPerformanceReportV2EditedFields(performanceReport),
    [performanceReport]
  );
  const serverSig = React.useMemo(() => serializeEditedFields(serverEdited), [serverEdited]);

  const resolvedReport = React.useMemo(() => {
    if (!isObject(performanceReport)) return performanceReport;
    const stripped = stripPerformanceReportV2EditedFields(performanceReport) as Record<string, unknown>;
    const prose = getProseOutput(context);

    const baseReviewAreas = Array.isArray(stripped.review_areas) && stripped.review_areas.length
      ? stripped.review_areas
      : Array.isArray(prose.review_areas) && (prose.review_areas as unknown[]).length
        ? prose.review_areas
        : stripped.review_areas;

    return applyPerformanceReportV2EditedFields({
      ...stripped,
      review_areas: baseReviewAreas,
      edited_fields: serverEdited,
    });
  }, [performanceReport, serverEdited, context]);

  const { values: fieldValues, channelNames, reviewAreas } = React.useMemo(
    () => resolveEditableFields(resolvedReport, context, serverEdited),
    [resolvedReport, context, serverEdited]
  );

  const currentHtml = React.useMemo(
    () => buildPerformanceReportV2BodyHtml(performanceReport, context),
    [performanceReport, context]
  );

  const serverSigRef = React.useRef(serverSig);
  serverSigRef.current = serverSig;

  const persistNow = React.useCallback(async (snapshot: PerformanceReportV2EditedFields) => {
    const cb = onSaveRef.current;
    if (!cb) return;
    const cleaned = stripInternalFields(snapshot);
    const sig = serializeEditedFields(cleaned);
    if (sig === serverSigRef.current) {
      pendingRef.current = null;
      setSaveState("idle");
      return;
    }
    if (isSavingRef.current) {
      pendingRef.current = cloneEditedFields(snapshot);
      return;
    }
    isSavingRef.current = true;
    setSaveState("saving");
    try {
      await cb(cloneEditedFields(cleaned));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    } finally {
      isSavingRef.current = false;
      const p = pendingRef.current;
      if (p) {
        const pSig = serializeEditedFields(stripInternalFields(p));
        if (pSig !== sig) {
          pendingRef.current = null;
          await persistNow(p);
          return;
        }
      }
      pendingRef.current = null;
    }
  }, []);

  const flushSave = React.useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    const d = draftRef.current;
    if (serializeForCompare(d) === serverSigRef.current) return;
    void persistNow(d);
  }, [persistNow]);

  const flushSaveRef = React.useRef(flushSave);
  flushSaveRef.current = flushSave;

  const scheduleSave = React.useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persistNow(draftRef.current);
    }, 1200);
  }, [persistNow]);

  const teardownEditing = React.useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    fieldsRef.current = [];
  }, []);

  const setupEditing = React.useCallback(() => {
    teardownEditing();

    const container = contentRef.current;
    if (!container) return;

    const fields = discoverEditableFields(container, fieldValues, channelNames, reviewAreas);
    fieldsRef.current = fields;

    for (const field of fields) {
      const initial = draftRef.current[field.path] ?? fieldValues[field.path] ?? field.getValue();
      field.setValue(initial);

      field.ownerNode.setAttribute("data-edit-owner", field.path);

      for (const node of field.nodes) {
        node.setAttribute("data-edit-field", field.path);
        node.setAttribute("contenteditable", "true");
        node.setAttribute("tabindex", "0");
        node.setAttribute("spellcheck", "false");
      }
    }

    const eventCleanups: Array<() => void> = [];

    for (const field of fields) {
      for (const node of field.nodes) {
        const onFocus = () => setActiveFieldPath(field.path);

        const onInput = () => {
          const val = field.getValue();
          draftRef.current = { ...draftRef.current, [field.path]: val };
          scheduleSave();
        };

        const onKeyDown = (e: Event) => {
          const ke = e as KeyboardEvent;
          if (!field.multiline && ke.key === "Enter") {
            ke.preventDefault();
            (ke.currentTarget as HTMLElement | null)?.blur();
          }
        };

        const onBlur = () => {
          setTimeout(() => {
            const active = document.activeElement as HTMLElement | null;
            if (active?.getAttribute("data-edit-field") === field.path) return;
            setActiveFieldPath((cur) => (cur === field.path ? null : cur));
            flushSaveRef.current();
          }, 0);
        };

        const onPaste = (e: Event) => {
          const ce = e as ClipboardEvent;
          ce.preventDefault();
          const text = ce.clipboardData?.getData("text/plain") ?? "";
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const tn = document.createTextNode(text);
          range.insertNode(tn);
          range.setStartAfter(tn);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          tn.parentElement?.normalize();
          onInput();
        };

        node.addEventListener("focus", onFocus);
        node.addEventListener("input", onInput);
        node.addEventListener("keydown", onKeyDown);
        node.addEventListener("blur", onBlur);
        node.addEventListener("paste", onPaste);

        eventCleanups.push(() => {
          node.removeEventListener("focus", onFocus);
          node.removeEventListener("input", onInput);
          node.removeEventListener("keydown", onKeyDown);
          node.removeEventListener("blur", onBlur);
          node.removeEventListener("paste", onPaste);
        });
      }
    }

    cleanupRef.current = () => {
      eventCleanups.forEach((fn) => fn());
      for (const field of fields) {
        for (const node of field.nodes) {
          node.removeAttribute("contenteditable");
          node.removeAttribute("tabindex");
          node.removeAttribute("spellcheck");
          node.removeAttribute("data-edit-field");
        }
        field.ownerNode.removeAttribute("data-edit-owner");
        field.ownerNode.removeAttribute("data-edit-active");
      }
    };
  }, [fieldValues, channelNames, reviewAreas, teardownEditing, scheduleSave]);

  // Inject HTML into the content div imperatively so React never touches it
  const lastInjectedHtml = React.useRef<string>("");

  React.useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (isEditing) {
      // When entering edit mode, freeze the HTML: only inject once
      if (lastInjectedHtml.current === "" || !el.hasAttribute("data-editing")) {
        el.innerHTML = currentHtml;
        lastInjectedHtml.current = currentHtml;
        el.setAttribute("data-editing", "true");
        // defer setup so the DOM has settled
        requestAnimationFrame(() => {
          if (isEditingRef.current) {
            draftRef.current = { ...serverEdited };
            setupEditing();
          }
        });
      }
      // While editing, do NOT update innerHTML even if currentHtml changes
    } else {
      // Not editing: always reflect latest HTML
      el.removeAttribute("data-editing");
      if (lastInjectedHtml.current !== currentHtml) {
        el.innerHTML = currentHtml;
        lastInjectedHtml.current = currentHtml;
      }
      teardownEditing();
    }
  }, [isEditing, currentHtml, serverEdited, setupEditing, teardownEditing]);

  // Handle reset version (discard all edits)
  React.useEffect(() => {
    if (prevResetRef.current !== resetVersion) {
      prevResetRef.current = resetVersion;
      draftRef.current = { ...serverEdited };
      setActiveFieldPath(null);
      setSaveState("idle");
      if (isEditing && contentRef.current) {
        contentRef.current.innerHTML = currentHtml;
        lastInjectedHtml.current = currentHtml;
        requestAnimationFrame(() => {
          if (isEditingRef.current) setupEditing();
        });
      }
    }
  }, [resetVersion, serverEdited, isEditing, currentHtml, setupEditing]);

  // Flush save when leaving edit mode
  const prevEditingForFlush = React.useRef(isEditing);
  React.useEffect(() => {
    const was = prevEditingForFlush.current;
    prevEditingForFlush.current = isEditing;
    if (!isEditing && was) {
      flushSaveRef.current();
      setActiveFieldPath(null);
    }
  }, [isEditing]);

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      teardownEditing();
    };
  }, [teardownEditing]);

  // Sync active field highlight
  React.useEffect(() => {
    for (const field of fieldsRef.current) {
      if (field.path === activeFieldPath) {
        field.ownerNode.setAttribute("data-edit-active", "true");
        for (const n of field.nodes) n.setAttribute("spellcheck", "true");
      } else {
        field.ownerNode.removeAttribute("data-edit-active");
        for (const n of field.nodes) n.setAttribute("spellcheck", "false");
      }
    }
  }, [activeFieldPath]);

  const handleClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditingRef.current) return;
    // Prevent the click from bubbling to any parent handlers
    e.stopPropagation();

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const fieldNode = target.closest("[data-edit-field]") as HTMLElement | null;
    const path = fieldNode?.getAttribute("data-edit-field") || null;

    if (!path) {
      setActiveFieldPath(null);
      return;
    }

    setActiveFieldPath(path);

    if (fieldNode && fieldNode.getAttribute("contenteditable") === "true") {
      requestAnimationFrame(() => {
        fieldNode.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount === 0) {
          const range = document.createRange();
          range.selectNodeContents(fieldNode);
          range.collapse(false);
          sel.addRange(range);
        }
      });
    }
  }, []);

  const isDirty = React.useMemo(() => {
    return serializeForCompare(draftRef.current) !== serverSig;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSig, saveState]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-background shadow-sm",
        isEditing ? "border-emerald-200 bg-background" : "border-general-border",
        !isEditing && "overflow-hidden"
      )}
    >
      <style>{PERFORMANCE_REPORT_V2_SCOPED_CSS}</style>
      {isEditing && <style>{EDIT_CSS}</style>}
      {isEditing && (
        <div className="border-b border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="text-[11px] font-medium text-muted-foreground">
              {saveState === "saving"
                ? "Saving\u2026"
                : saveState === "error"
                  ? "Autosave failed"
                  : isDirty
                    ? "Autosaving\u2026"
                    : saveState === "saved"
                      ? "Saved"
                      : "Click any highlighted section to edit"}
            </div>
          </div>
        </div>
      )}
      <div
        ref={outerRef}
        className={cn("pr-v2-edit-surface", isEditing && "pr-v2-editing")}
        onClickCapture={handleClick}
      >
        <div ref={contentRef} />
      </div>
    </div>
  );
}
