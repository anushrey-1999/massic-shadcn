"use client";

import { memo, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Highlighting every token of a near-1 MiB payload creates hundreds of thousands
// of nodes and stalls the main app, so large bodies render as plain text.
const MAX_HIGHLIGHT_CHARS = 200_000;
const TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function highlight(json: string) {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of json.matchAll(TOKEN)) {
    const index = match.index;
    if (index > last) nodes.push(json.slice(last, index));
    const [token, string, colon, boolean, nil] = match;
    const className = string
      ? colon
        ? "text-sky-800"
        : "text-emerald-700"
      : boolean
        ? "text-violet-700"
        : nil
          ? "text-general-muted-foreground italic"
          : "text-amber-700";
    nodes.push(
      <span key={index} className={className}>
        {string ?? token}
      </span>,
    );
    if (colon) nodes.push(colon);
    last = index + token.length;
  }
  if (last < json.length) nodes.push(json.slice(last));
  return nodes;
}

export const JsonView = memo(function JsonView({
  json,
  wrap,
  className,
}: {
  json: string;
  wrap: boolean;
  className?: string;
}) {
  const highlighted = json.length <= MAX_HIGHLIGHT_CHARS;
  const content = useMemo(
    () => (highlighted ? highlight(json) : json),
    [highlighted, json],
  );

  return (
    <pre
      tabIndex={0}
      aria-label="JSON response"
      className={cn(
        "overflow-auto overscroll-contain bg-general-primary-foreground px-4 py-3 font-mono text-xs leading-5 text-general-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre",
        className,
      )}
    >
      {content}
    </pre>
  );
});
