"use client";

import { memo, useState } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// Children render only while expanded and in pages, so a 1 MiB body stays responsive.
const PAGE_SIZE = 100;

type JsonContainer = unknown[] | Record<string, unknown>;

function isContainer(value: unknown): value is JsonContainer {
  return value !== null && typeof value === "object";
}

function typeLabel(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function JsonKey({ name }: { name: string | number | null }) {
  if (name === null) return null;
  return (
    <>
      <span
        className={
          typeof name === "number"
            ? "text-general-muted-foreground"
            : "text-sky-800"
        }
      >
        {name}
      </span>
      <span className="text-general-muted-foreground">:&nbsp;</span>
    </>
  );
}

function JsonPrimitive({ value }: { value: unknown }) {
  if (typeof value === "string")
    return (
      <span className="whitespace-pre-wrap break-all text-emerald-700">
        &quot;{value}&quot;
      </span>
    );
  if (typeof value === "number")
    return <span className="text-amber-700">{value}</span>;
  if (typeof value === "boolean")
    return <span className="text-violet-700">{String(value)}</span>;
  return <span className="italic text-general-muted-foreground">null</span>;
}

function CopyValue({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy value"
      title="Copy value"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      className="ml-1 hidden size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-general-muted-foreground hover:bg-white hover:text-general-foreground focus-visible:flex group-hover/row:flex"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

function JsonNode({
  name,
  value,
  depth,
  expandDepth,
}: {
  name: string | number | null;
  value: unknown;
  depth: number;
  expandDepth: number;
}) {
  const [open, setOpen] = useState(depth < expandDepth);
  const [limit, setLimit] = useState(PAGE_SIZE);

  if (!isContainer(value)) {
    return (
      <div className="group/row flex min-w-0 items-start rounded-sm py-px pl-5 pr-1 hover:bg-secondary">
        {name !== null && (
          <span className="shrink-0 whitespace-nowrap">
            <JsonKey name={name} />
          </span>
        )}
        <span className="min-w-0">
          <JsonPrimitive value={value} />
        </span>
        <span className="ml-auto hidden shrink-0 pl-2 text-[10px] text-general-muted-foreground group-hover/row:inline">
          {typeLabel(value)}
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const keys = isArray ? null : Object.keys(value);
  const size = isArray ? value.length : keys!.length;
  const summary = isArray
    ? size + (size === 1 ? " item" : " items")
    : size + (size === 1 ? " key" : " keys");

  if (size === 0) {
    return (
      <div className="flex items-start rounded-sm py-px pl-5 pr-1 hover:bg-secondary">
        <JsonKey name={name} />
        <span className="text-general-muted-foreground">
          {isArray ? "[]" : "{}"}
        </span>
      </div>
    );
  }

  const shown = Math.min(limit, size);
  return (
    <div>
      <div className="group/row flex items-center rounded-sm pr-1 hover:bg-secondary">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 cursor-pointer items-center py-px text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "mx-1 size-3 shrink-0 text-general-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          <JsonKey name={name} />
          <span className="text-general-muted-foreground">
            {isArray ? "[" : "{"}
            {!open && "…" + (isArray ? "]" : "}")}
          </span>
          <span className="ml-2 rounded-sm bg-secondary px-1 text-[10px] text-general-muted-foreground group-hover/row:bg-white">
            {summary}
          </span>
        </button>
        <CopyValue value={value} />
      </div>
      {open && (
        <div className="ml-[9px] border-l border-general-border pl-2">
          {Array.from({ length: shown }, (_, index) => {
            const key = isArray ? index : keys![index];
            return (
              <JsonNode
                key={key}
                name={key}
                value={isArray ? value[index] : value[key as string]}
                depth={depth + 1}
                expandDepth={expandDepth}
              />
            );
          })}
          {shown < size && (
            <button
              type="button"
              onClick={() => setLimit(limit + PAGE_SIZE)}
              className="my-0.5 ml-5 cursor-pointer rounded-sm px-1 text-general-muted-foreground underline-offset-2 hover:text-general-foreground hover:underline"
            >
              Show {Math.min(PAGE_SIZE, size - shown)} more of {size - shown}{" "}
              remaining
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export const JsonTree = memo(function JsonTree({
  value,
  expandDepth,
  className,
}: {
  value: unknown;
  expandDepth: number;
  className?: string;
}) {
  return (
    <div
      aria-label="JSON tree"
      className={cn(
        "overflow-auto overscroll-contain bg-general-primary-foreground px-2 py-2 font-mono text-xs leading-5",
        className,
      )}
    >
      {isContainer(value) ? (
        <JsonNode name={null} value={value} depth={0} expandDepth={expandDepth} />
      ) : (
        <div className="pl-5">
          <JsonPrimitive value={value} />
        </div>
      )}
    </div>
  );
});
