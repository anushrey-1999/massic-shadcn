"use client";

import { Children, isValidElement, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Parent, Root, RootContent } from "mdast";
import { LightCodeBlock } from "@/components/chatbot/markdown";

/** Keep citation markers interactive without touching code or link destinations. */
function remarkAgentCitations() {
  const transform = (parent: Parent) => {
    parent.children = parent.children.flatMap((child): RootContent[] => {
      if (child.type === "text") {
        const parts: RootContent[] = [];
        let offset = 0;
        for (const match of child.value.matchAll(/\[ref:(\d+)\]/g)) {
          if (match.index > offset)
            parts.push({
              type: "text",
              value: child.value.slice(offset, match.index),
            });
          parts.push({
            type: "link",
            url: `#massic-ref-${match[1]}`,
            data: { hProperties: { "data-citation-ref": Number(match[1]) } },
            children: [{ type: "text", value: match[1] }],
          });
          offset = match.index + match[0].length;
        }
        if (!offset) return [child];
        if (offset < child.value.length)
          parts.push({ type: "text", value: child.value.slice(offset) });
        return parts;
      }
      if (
        "children" in child &&
        child.type !== "link" &&
        child.type !== "linkReference"
      )
        transform(child);
      return [child];
    });
  };
  return (tree: Root) => transform(tree);
}

export function AgentMarkdown({
  content,
  renderCitation,
  renderLink,
}: {
  content: string;
  renderCitation: (number: number) => ReactNode;
  renderLink: (href: string, children: ReactNode) => ReactNode;
}) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkAgentCitations]}
      skipHtml
      components={{
        a: ({ node, href, children }) => {
          const reference = node?.properties["data-citation-ref"];
          if (typeof reference === "number") return renderCitation(reference);
          if (!href) return <>{children}</>;
          if (/^https?:\/\//.test(href)) return renderLink(href, children);
          return (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          );
        },
        pre: ({ children }) => {
          const code = Children.toArray(children).find((child) =>
            isValidElement<{ className?: string; children?: string }>(child),
          );
          if (!isValidElement<{ className?: string; children?: string }>(code))
            return <pre>{children}</pre>;
          return (
            <LightCodeBlock
              content={String(code.props.children ?? "").replace(/\n$/, "")}
              language={
                /language-([^\s]+)/.exec(code.props.className ?? "")?.[1]
              }
            />
          );
        },
        table: ({ children }) => (
          <div
            className="my-4 max-w-full overflow-x-auto rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="region"
            aria-label="Response table"
            tabIndex={0}
          >
            <table className="w-full border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/60">{children}</thead>
        ),
        th: ({ children, style }) => (
          <th
            style={style}
            scope="col"
            className="border-b border-border px-3 py-2 text-left align-top font-medium whitespace-nowrap"
          >
            {children}
          </th>
        ),
        td: ({ children, style }) => (
          <td
            style={style}
            className="border-b border-border px-3 py-2 align-top whitespace-nowrap"
          >
            {children}
          </td>
        ),
        tr: ({ children }) => (
          <tr className="last:[&>td]:border-b-0">{children}</tr>
        ),
      }}
    >
      {content}
    </Markdown>
  );
}
