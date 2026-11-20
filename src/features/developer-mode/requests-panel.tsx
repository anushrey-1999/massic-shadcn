"use client";

import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Download,
  Link2,
  Search,
  Trash2,
  WrapText,
  X,
} from "lucide-react";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  clearCapturedRequests,
  requestCaptureStore,
  type CapturedRequest,
} from "@/lib/developer-mode/request-capture";
import type { RequestBackend } from "@/lib/developer-mode/request-privacy";
import { useDeveloperMode } from "./developer-mode-provider";
import { JsonTree } from "./json-tree";
import { JsonView } from "./json-view";

const WIDTH_KEY = "massic:developer-requests:width";
const OPEN_KEY = "massic:developer-requests:open";
const DEFAULT_WIDTH = 560;
const MIN_WIDTH = 360;
const MIN_APP_WIDTH = 480;
// Below this panel width the list and details share one column.
const SPLIT_WIDTH = 760;

type BackendFilter = RequestBackend | "all";
const BACKEND_FILTERS: { value: BackendFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "main", label: "Main" },
  { value: "infer", label: "Infer" },
];

type BodyTab = "response" | "params";
const BODY_TABS: BodyTab[] = ["response", "params"];

type BodyView = "tree" | "raw";
const BODY_VIEWS: { value: BodyView; label: string }[] = [
  { value: "tree", label: "Tree" },
  { value: "raw", label: "Raw" },
];
const DEFAULT_TREE_DEPTH = 2;
// Fully expanding a large body would mount every node at once.
const LARGE_TREE_CHARS = 200_000;
const LARGE_TREE_EXPAND_DEPTH = 4;

function readStorage(storage: "local" | "session", key: string) {
  try {
    return (storage === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: "local" | "session", key: string, value: string) {
  try {
    (storage === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    // Storage can be unavailable in private windows; the panel still works.
  }
}

function clampWidth(width: number) {
  const max = Math.max(MIN_WIDTH, window.innerWidth - MIN_APP_WIDTH);
  return Math.round(Math.min(Math.max(width, MIN_WIDTH), max));
}

function isError(entry: CapturedRequest) {
  return (
    entry.outcome === "network-error" ||
    (entry.status !== undefined && entry.status >= 400)
  );
}

function statusLabel(entry: CapturedRequest) {
  if (entry.outcome === "pending") return "Pending";
  if (entry.outcome === "network-error") return "Failed";
  if (entry.outcome === "cancelled") return "Cancelled";
  return entry.status ? String(entry.status) : "—";
}

const clock = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

function durationLabel(ms: number | undefined) {
  if (ms === undefined) return null;
  return ms < 1000 ? Math.round(ms) + " ms" : (ms / 1000).toFixed(2) + " s";
}

function sizeLabel(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

function requestPath(url: string) {
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  return path && path !== "/…" ? path : url;
}

function backendLabel(backend: RequestBackend | null) {
  if (backend === "main") return "Main";
  if (backend === "infer") return "Infer";
  return null;
}

function RequestStatus({ entry }: { entry: CapturedRequest }) {
  const status = entry.status ?? 0;
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm px-1.5 font-mono text-[11px] font-medium tabular-nums",
        entry.outcome === "pending" || entry.outcome === "cancelled"
          ? "bg-secondary text-general-muted-foreground"
          : entry.outcome === "network-error" || status >= 500
            ? "bg-red-100 text-red-800"
            : status >= 400
              ? "bg-amber-100 text-amber-800"
              : status >= 200 && status < 300
                ? "bg-green-100 text-green-800"
                : "bg-secondary text-general-muted-foreground",
      )}
    >
      {entry.outcome === "pending" && (
        <span
          aria-hidden="true"
          className="size-1.5 animate-pulse rounded-full bg-general-muted-foreground"
        />
      )}
      {statusLabel(entry)}
    </span>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
          className="size-7 text-general-muted-foreground hover:text-general-foreground aria-pressed:bg-secondary aria-pressed:text-general-foreground"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function useCopy() {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  useEffect(() => {
    if (status === "idle") return;
    const reset = setTimeout(() => setStatus("idle"), 1500);
    return () => clearTimeout(reset);
  }, [status]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }
  return [status, copy] as const;
}

function bodyJson(body: CapturedRequest["body"]) {
  return body && "json" in body ? body.json : undefined;
}

function bodyBytes(body: CapturedRequest["body"]) {
  return body && "bytes" in body ? body.bytes : null;
}

function BodyPanel({
  json,
  emptyText,
  fileName,
  view,
  onViewChange,
}: {
  json: string | undefined;
  emptyText: string;
  fileName: string;
  view: BodyView;
  onViewChange: (view: BodyView) => void;
}) {
  const [wrap, setWrap] = useState(false);
  const [tree, setTree] = useState({ depth: DEFAULT_TREE_DEPTH, version: 0 });
  const [copyStatus, copy] = useCopy();
  const parsed = useMemo(
    () => (json === undefined ? undefined : JSON.parse(json)),
    [json],
  );
  const formatted = useMemo(() => {
    if (json === undefined || json.length > 128_000) return json;
    const pretty = JSON.stringify(parsed, null, 2);
    return pretty.length > 1024 * 1024 ? json : pretty;
  }, [json, parsed]);

  if (formatted === undefined) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-general-primary-foreground p-6">
        <p className="text-center text-sm text-general-muted-foreground">
          {emptyText}
        </p>
      </div>
    );
  }

  function download() {
    if (formatted === undefined) return;
    const url = URL.createObjectURL(
      new Blob([formatted], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-general-border pl-4 pr-2">
        <div
          role="group"
          aria-label="View as"
          className="flex h-7 items-center rounded-md bg-secondary p-0.5"
        >
          {BODY_VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={view === option.value}
              onClick={() => onViewChange(option.value)}
              className="h-6 cursor-pointer rounded-sm px-2 text-xs text-general-muted-foreground outline-none hover:text-general-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-white aria-pressed:font-medium aria-pressed:text-general-foreground aria-pressed:shadow-xs"
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          {view === "tree" ? (
            <>
              <IconAction
                label="Expand all"
                onClick={() =>
                  setTree((current) => ({
                    depth:
                      (json?.length ?? 0) > LARGE_TREE_CHARS
                        ? LARGE_TREE_EXPAND_DEPTH
                        : Infinity,
                    version: current.version + 1,
                  }))
                }
              >
                <ChevronsUpDown />
              </IconAction>
              <IconAction
                label="Collapse all"
                onClick={() =>
                  setTree((current) => ({
                    depth: 1,
                    version: current.version + 1,
                  }))
                }
              >
                <ChevronsDownUp />
              </IconAction>
            </>
          ) : (
            <IconAction
              label={wrap ? "Don’t wrap lines" : "Wrap lines"}
              pressed={wrap}
              onClick={() => setWrap(!wrap)}
            >
              <WrapText />
            </IconAction>
          )}
          <IconAction
            label={
              copyStatus === "copied"
                ? "Copied"
                : copyStatus === "error"
                  ? "Couldn’t copy"
                  : "Copy JSON"
            }
            onClick={() => copy(formatted)}
          >
            {copyStatus === "copied" ? <Check /> : <Copy />}
          </IconAction>
          <IconAction label="Download JSON" onClick={download}>
            <Download />
          </IconAction>
        </div>
      </div>
      <p role="status" className="sr-only">
        {copyStatus === "copied"
          ? "Copied to clipboard."
          : copyStatus === "error"
            ? "Couldn’t copy to clipboard."
            : ""}
      </p>
      {view === "tree" ? (
        <JsonTree
          key={tree.version}
          value={parsed}
          expandDepth={tree.depth}
          className="min-h-0 flex-1"
        />
      ) : (
        <JsonView json={formatted} wrap={wrap} className="min-h-0 flex-1" />
      )}
    </>
  );
}

function groupQuery(query: [string, string][]) {
  const groups = new Map<string, string[]>();
  for (const [key, value] of query)
    groups.set(key, [...(groups.get(key) ?? []), value]);
  return Array.from(groups, ([key, values]) => ({ key, values }));
}

function ParamValue({ value }: { value: string }) {
  const parsed = useMemo(() => {
    if (!/^\s*[[{]/.test(value)) return undefined;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return undefined;
    }
  }, [value]);

  if (parsed !== undefined)
    return (
      <JsonTree
        value={parsed}
        expandDepth={2}
        className="-ml-5 overflow-visible bg-transparent p-0"
      />
    );
  if (!value)
    return <span className="italic text-general-muted-foreground">empty</span>;
  return (
    <span className="whitespace-pre-wrap break-all text-emerald-700">
      {value}
    </span>
  );
}

function ParamsPanel({ query }: { query: CapturedRequest["query"] }) {
  const [copyStatus, copy] = useCopy();
  const groups = useMemo(() => groupQuery(query ?? []), [query]);

  if (!query?.length) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-general-primary-foreground p-6">
        <p className="text-center text-sm text-general-muted-foreground">
          {query
            ? "This request has no query parameters."
            : "Parameters aren’t shown for sensitive endpoints."}
        </p>
      </div>
    );
  }

  const asJson = JSON.stringify(
    Object.fromEntries(
      groups.map(({ key, values }) => [
        key,
        values.length === 1 ? values[0] : values,
      ]),
    ),
    null,
    2,
  );

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-general-border pl-4 pr-2">
        <span className="text-xs text-general-muted-foreground">
          {groups.length === 1 ? "1 parameter" : groups.length + " parameters"}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <IconAction
            label="Copy query string"
            onClick={() => copy(new URLSearchParams(query).toString())}
          >
            <Link2 />
          </IconAction>
          <IconAction
            label={
              copyStatus === "copied"
                ? "Copied"
                : copyStatus === "error"
                  ? "Couldn’t copy"
                  : "Copy as JSON"
            }
            onClick={() => copy(asJson)}
          >
            {copyStatus === "copied" ? <Check /> : <Copy />}
          </IconAction>
        </div>
      </div>
      <p role="status" className="sr-only">
        {copyStatus === "copied"
          ? "Copied to clipboard."
          : copyStatus === "error"
            ? "Couldn’t copy to clipboard."
            : ""}
      </p>
      <dl className="min-h-0 flex-1 overflow-auto overscroll-contain bg-general-primary-foreground font-mono text-xs leading-5">
        {groups.map(({ key, values }) => (
          <div
            key={key}
            className="grid grid-cols-[minmax(6rem,35%)_minmax(0,1fr)] gap-3 border-b border-general-border px-4 py-2"
          >
            <dt className="min-w-0 break-all">
              <span className="text-sky-800">{key}</span>
              {values.length > 1 && (
                <span className="ml-1.5 whitespace-nowrap rounded-sm bg-secondary px-1 font-sans text-[10px] text-general-muted-foreground">
                  {values.length} values
                </span>
              )}
            </dt>
            <dd className="min-w-0">
              {values.length === 1 ? (
                <ParamValue value={values[0]} />
              ) : (
                <ol className="space-y-0.5">
                  {values.map((value, index) => (
                    <li key={index} className="flex min-w-0 gap-2">
                      <span className="w-5 shrink-0 text-right text-general-muted-foreground">
                        {index}
                      </span>
                      <div className="min-w-0 flex-1">
                        <ParamValue value={value} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function RequestDetails({
  entry,
  stacked,
  onBack,
  tab,
  onTabChange,
  view,
  onViewChange,
}: {
  entry: CapturedRequest;
  stacked: boolean;
  onBack: () => void;
  tab: BodyTab;
  onTabChange: (tab: BodyTab) => void;
  view: BodyView;
  onViewChange: (view: BodyView) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [urlCopy, copyUrl] = useCopy();

  useEffect(() => {
    if (stacked) heading.current?.focus();
  }, [entry.id, stacked]);

  const path = entry.url.split("?")[0].split("/").filter(Boolean).at(-1);
  const baseName =
    (path?.replace(/[^a-z0-9_-]/gi, "-").slice(0, 50) || "request") +
    "-" +
    entry.id;
  const bytes = bodyBytes(entry.body);
  const tabMeta: Record<BodyTab, { label: string; hint: string | null }> = {
    response: {
      label: "Response",
      hint: bytes === null ? null : sizeLabel(bytes),
    },
    params: {
      label: "Params",
      hint: entry.query?.length
        ? String(new Set(entry.query.map(([key]) => key)).size)
        : null,
    },
  };
  const responseEmptyText =
    entry.body && "omission" in entry.body
      ? entry.body.omission
      : entry.outcome === "pending"
        ? "Waiting for a response…"
        : entry.outcome === "response"
          ? "Reading response…"
          : "No response received.";

  function switchTabWithKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = tab === "response" ? "params" : "response";
    onTabChange(next);
    tabs.current
      ?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)
      ?.focus();
  }

  const meta = [
    backendLabel(entry.backend),
    clock.format(entry.startedAt),
    durationLabel(entry.durationMs),
  ].filter(Boolean);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-2 border-b border-general-border px-4 py-3">
        {stacked && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 h-7 text-general-muted-foreground"
          >
            <ArrowLeft aria-hidden="true" /> All requests
          </Button>
        )}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-general-foreground">
            {entry.method}
          </span>
          <RequestStatus entry={entry} />
          <span className="ml-auto truncate text-xs tabular-nums text-general-muted-foreground">
            {meta.join(" · ")}
          </span>
        </div>
        <div className="flex items-start gap-1">
          <h3
            ref={heading}
            tabIndex={-1}
            className="min-w-0 flex-1 break-all py-1 font-mono text-xs leading-relaxed text-general-foreground outline-none"
          >
            {entry.url}
          </h3>
          <IconAction
            label={urlCopy === "copied" ? "Copied" : "Copy URL"}
            onClick={() => copyUrl(entry.url)}
          >
            {urlCopy === "copied" ? <Check /> : <Copy />}
          </IconAction>
        </div>
      </div>

      <p role="status" className="sr-only">
        {urlCopy === "copied"
          ? "URL copied."
          : urlCopy === "error"
            ? "Couldn’t copy the URL."
            : ""}
      </p>

      <div
        ref={tabs}
        role="tablist"
        aria-label="Request body"
        onKeyDown={switchTabWithKeys}
        className="flex h-10 shrink-0 items-stretch gap-5 border-b border-general-border px-4"
      >
        {BODY_TABS.map((key) => {
          const { label, hint } = tabMeta[key];
          const selected = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              data-tab={key}
              id={`request-${entry.id}-${key}-tab`}
              aria-selected={selected}
              aria-controls={`request-${entry.id}-${key}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(key)}
              className="relative -mb-px flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent text-sm text-general-muted-foreground outline-none hover:text-general-foreground focus-visible:text-general-foreground focus-visible:underline aria-selected:border-general-foreground aria-selected:font-medium aria-selected:text-general-foreground"
            >
              {label}
              {hint !== null && (
                <span className="text-xs font-normal tabular-nums text-general-muted-foreground">
                  {hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`request-${entry.id}-${tab}-panel`}
        aria-labelledby={`request-${entry.id}-${tab}-tab`}
        className="flex min-h-0 flex-1 flex-col"
      >
        {tab === "response" ? (
          <BodyPanel
            json={bodyJson(entry.body)}
            emptyText={responseEmptyText}
            fileName={baseName + ".json"}
            view={view}
            onViewChange={onViewChange}
          />
        ) : (
          <ParamsPanel query={entry.query} />
        )}
      </div>
    </div>
  );
}

function RequestRow({
  entry,
  selected,
  onSelect,
}: {
  entry: CapturedRequest;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = [
    backendLabel(entry.backend),
    clock.format(entry.startedAt),
    durationLabel(entry.durationMs),
  ].filter(Boolean);

  return (
    <li>
      <button
        type="button"
        data-request-id={entry.id}
        aria-pressed={selected}
        onClick={onSelect}
        className="relative grid w-full min-w-0 cursor-pointer gap-0.5 border-b border-general-border px-4 py-2 text-left outline-none hover:bg-secondary focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-pressed:bg-secondary aria-pressed:before:absolute aria-pressed:before:inset-y-0 aria-pressed:before:left-0 aria-pressed:before:w-0.5 aria-pressed:before:bg-general-foreground"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="w-11 shrink-0 font-mono text-[11px] font-medium text-general-muted-foreground">
            {entry.method}
          </span>
          <span
            className="min-w-0 flex-1 truncate font-mono text-xs text-general-foreground"
            title={entry.url}
          >
            {requestPath(entry.url)}
          </span>
          <RequestStatus entry={entry} />
        </span>
        <span className="truncate pl-13 text-xs tabular-nums text-general-muted-foreground">
          {meta.join(" · ")}
        </span>
      </button>
    </li>
  );
}

function RequestsBrowser({
  split,
  searchRef,
}: {
  split: boolean;
  searchRef: Ref<HTMLInputElement>;
}) {
  const entries = useStore(requestCaptureStore, (state) => state.entries);
  const [search, setSearch] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [backend, setBackend] = useState<BackendFilter>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<BodyTab>("response");
  const [view, setView] = useState<BodyView>("tree");
  const list = useRef<HTMLUListElement>(null);
  const normalized = search.trim().toLowerCase();
  const errorCount = entries.filter(isError).length;
  const visible = entries.filter(
    (entry) =>
      (backend === "all" || entry.backend === backend) &&
      (!errorsOnly || isError(entry)) &&
      (!normalized ||
        [
          entry.method,
          entry.url,
          statusLabel(entry),
          ...(entry.query?.flat() ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized)),
  );
  const selected = visible.find((entry) => entry.id === selectedId);
  const stacked = !split;
  const bodyProps = {
    tab,
    onTabChange: setTab,
    view,
    onViewChange: setView,
  };

  function focusRow(id: number) {
    list.current
      ?.querySelector<HTMLButtonElement>(`[data-request-id="${id}"]`)
      ?.focus();
  }

  function back() {
    const id = selectedId;
    setSelectedId(null);
    requestAnimationFrame(() => {
      if (id !== null) focusRow(id);
    });
  }

  function navigate(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const current = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-request-id]",
    );
    const index = visible.findIndex(
      (entry) => String(entry.id) === current?.dataset.requestId,
    );
    const next = visible[index + (event.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    event.preventDefault();
    focusRow(next.id);
    if (split) setSelectedId(next.id);
  }

  const listPane = (
    <section
      aria-label="Request list"
      className={cn(
        "flex min-h-0 min-w-0 flex-col",
        split && "border-r border-general-border",
      )}
    >
      <div className="shrink-0 space-y-2 border-b border-general-border p-3">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-general-muted-foreground"
          />
          <Input
            ref={searchRef}
            type="search"
            aria-label="Search requests"
            placeholder="Filter by URL, method or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Backend"
            className="flex h-7 items-center rounded-md bg-secondary p-0.5"
          >
            {BACKEND_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={backend === option.value}
                onClick={() => setBackend(option.value)}
                className="h-6 cursor-pointer rounded-sm px-2 text-xs text-general-muted-foreground outline-none hover:text-general-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-white aria-pressed:font-medium aria-pressed:text-general-foreground aria-pressed:shadow-xs"
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={errorsOnly}
            onClick={() => setErrorsOnly(!errorsOnly)}
            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-general-border px-2 text-xs text-general-muted-foreground outline-none hover:bg-secondary hover:text-general-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-red-200 aria-pressed:bg-red-50 aria-pressed:text-red-800"
          >
            Errors
            <span
              className={cn(
                "min-w-4 rounded-sm px-1 text-center text-[11px] font-medium tabular-nums",
                errorCount
                  ? "bg-red-100 text-red-800"
                  : "bg-secondary text-general-muted-foreground",
              )}
            >
              {errorCount}
            </span>
          </button>
          <span className="ml-auto text-xs tabular-nums text-general-muted-foreground">
            {visible.length === entries.length
              ? entries.length
              : visible.length + " of " + entries.length}
          </span>
        </div>
      </div>
      {visible.length > 0 ? (
        <ul
          ref={list}
          onKeyDown={navigate}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {visible.map((entry) => (
            <RequestRow
              key={entry.id}
              entry={entry}
              selected={entry.id === selectedId}
              onSelect={() => setSelectedId(entry.id)}
            />
          ))}
        </ul>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
          <p className="text-sm font-medium text-general-foreground">
            {entries.length ? "No matching requests" : "No requests yet"}
          </p>
          <p className="text-sm text-general-muted-foreground">
            {entries.length
              ? "Try a different filter."
              : "Requests appear here as you use Massic."}
          </p>
        </div>
      )}
    </section>
  );

  if (stacked) {
    return selected ? (
      <RequestDetails
        key={selected.id}
        entry={selected}
        stacked
        onBack={back}
        {...bodyProps}
      />
    ) : (
      listPane
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,2fr)_minmax(0,3fr)]">
      {listPane}
      <section aria-label="Request details" className="flex min-h-0 min-w-0">
        {selected ? (
          <RequestDetails
            key={selected.id}
            entry={selected}
            stacked={false}
            onBack={back}
            {...bodyProps}
          />
        ) : (
          <p className="m-auto px-4 text-center text-sm text-general-muted-foreground">
            Select a request to see its response.
          </p>
        )}
      </section>
    </div>
  );
}

function RequestsDock({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState(() =>
    clampWidth(Number(readStorage("local", WIDTH_KEY)) || DEFAULT_WIDTH),
  );
  const [resizing, setResizing] = useState(false);
  const [split, setSplit] = useState(false);
  const hasEntries = useStore(
    requestCaptureStore,
    (state) => state.entries.length > 0,
  );

  useEffect(() => {
    search.current?.focus({ preventScroll: true });
    const node = panel.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setSplit(entry.contentRect.width >= SPLIT_WIDTH),
    );
    observer.observe(node);
    const onResize = () => setWidth((current) => clampWidth(current));
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!resizing) {
      writeStorage("local", WIDTH_KEY, String(width));
      return;
    }
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [resizing, width]);

  function startResize(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
  }

  function resize(event: PointerEvent<HTMLDivElement>) {
    if (resizing) setWidth(clampWidth(window.innerWidth - event.clientX));
  }

  function endResize(event: PointerEvent<HTMLDivElement>) {
    if (!resizing) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setResizing(false);
  }

  function resizeWithKeys(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 64 : 16;
    const next: ((current: number) => number) | null =
      event.key === "ArrowLeft"
        ? (current) => current + step
        : event.key === "ArrowRight"
          ? (current) => current - step
          : event.key === "Home"
            ? () => Infinity
            : event.key === "End"
              ? () => MIN_WIDTH
              : null;
    if (!next) return;
    event.preventDefault();
    setWidth((current) => clampWidth(next(current)));
  }

  function closeOnEscape(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (
      event.key !== "Escape" ||
      !panel.current?.contains(target) ||
      (target instanceof HTMLInputElement && target.value)
    )
      return;
    event.preventDefault();
    onClose();
  }

  return (
    <aside
      ref={panel}
      aria-label="Requests"
      onKeyDown={closeOnEscape}
      style={{ "--requests-width": width + "px" } as CSSProperties}
      className="fixed inset-0 z-50 flex flex-col bg-white md:relative md:inset-auto md:z-auto md:h-full md:w-(--requests-width) md:shrink-0 md:border-l md:border-general-border"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize requests panel"
        aria-valuenow={width}
        aria-valuemin={MIN_WIDTH}
        tabIndex={0}
        onPointerDown={startResize}
        onPointerMove={resize}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        onDoubleClick={() => setWidth(clampWidth(DEFAULT_WIDTH))}
        onKeyDown={resizeWithKeys}
        className={cn(
          "group absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize touch-none outline-none md:block",
          "after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent after:transition-colors hover:after:bg-general-border-three focus-visible:after:w-0.5 focus-visible:after:bg-ring",
          resizing && "after:w-0.5 after:bg-general-foreground/40",
        )}
      />
      <header className="flex h-13 shrink-0 items-center gap-2 border-b border-general-border pl-4 pr-2">
        <Activity
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 text-general-muted-foreground"
        />
        <h2 className="text-sm font-medium text-general-foreground">
          Requests
        </h2>
        <span className="text-xs text-general-muted-foreground">
          This tab only
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <IconAction
            label="Clear requests"
            disabled={!hasEntries}
            onClick={clearCapturedRequests}
          >
            <Trash2 />
          </IconAction>
          <IconAction label="Close panel" onClick={onClose}>
            <X />
          </IconAction>
        </div>
      </header>
      <RequestsBrowser split={split} searchRef={search} />
    </aside>
  );
}

function RequestsTrigger({
  ref,
  onOpen,
}: {
  ref: Ref<HTMLButtonElement>;
  onOpen: () => void;
}) {
  const errorCount = useStore(
    requestCaptureStore,
    (state) => state.entries.filter(isError).length,
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={
            errorCount
              ? `Open requests, ${errorCount} failed`
              : "Open requests"
          }
          onClick={onOpen}
          className="fixed right-0 top-1/2 z-40 flex h-10 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-l-md border border-r-0 border-general-border bg-white text-general-muted-foreground shadow-xs outline-none transition-[width,color] hover:w-9 hover:text-general-foreground focus-visible:w-9 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Activity aria-hidden="true" strokeWidth={1.5} className="size-4" />
          {errorCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute left-1 top-1 size-1.5 rounded-full bg-red-500"
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">Requests</TooltipContent>
    </Tooltip>
  );
}

// The panel renders inside the app layout; a failure here must hide the panel only.
class RequestsPanelBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Developer requests panel failed and was hidden.", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function RequestsPanel() {
  return (
    <RequestsPanelBoundary>
      <RequestsPanelContent />
    </RequestsPanelBoundary>
  );
}

function RequestsPanelContent() {
  const enabled = useDeveloperMode();
  const [open, setOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      readStorage("session", OPEN_KEY) === "1",
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    writeStorage("session", OPEN_KEY, open ? "1" : "0");
    if (!open && restoreFocus.current) {
      restoreFocus.current = false;
      trigger.current?.focus();
    }
  }, [open]);

  if (!enabled) return null;
  if (!open) return <RequestsTrigger ref={trigger} onOpen={() => setOpen(true)} />;
  return (
    <RequestsDock
      onClose={() => {
        restoreFocus.current = true;
        setOpen(false);
      }}
    />
  );
}
