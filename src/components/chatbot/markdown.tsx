"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

export type LightMarkdownInlinePattern = {
  re: RegExp;
  wrap: (m: RegExpExecArray) => React.ReactNode;
};

function LightCodeBlock({ content, language }: { content: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setCopyError(false);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <div className="light-code-block">
      <div className="light-code-block__header">
        <span>{language || "Code"}</span>
        <button type="button" onClick={() => void copy()} aria-label={copied ? "Code copied" : "Copy code"}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          <span>{copyError ? "Copy failed" : copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre>
        <code>{content}</code>
      </pre>
      <span className="sr-only" role="status" aria-live="polite">{copyError ? "Code could not be copied. Select it to copy manually." : copied ? "Code copied to clipboard" : ""}</span>
    </div>
  );
}

export function renderLightMarkdown(
  text: string,
  inlinePatterns: LightMarkdownInlinePattern[] = [],
  options: { enhanced?: boolean } = {}
): React.ReactNode {
  // React escapes text nodes; pre-escaping would show literal HTML entities.
  const esc = (s: string) => s;

  const blocks = splitFencedBlocks(text, options.enhanced === true);

  return (
    <>
      {blocks.map((block, idx) => (
        <div key={idx}>
          {block.type === "code" && options.enhanced ? (
            <LightCodeBlock content={block.content} language={block.language} />
          ) : block.type === "code" ? (
            <pre className="text-sm">
              <code>{block.content}</code>
            </pre>
          ) : (
            renderParagraphs(block.content)
          )}
        </div>
      ))}
    </>
  );

  function renderParagraphs(src: string): React.ReactNode {
    const lines = src.split(/\n/);
    const elements: React.ReactNode[] = [];
    let i = 0;
    const isHorizontalRule = (value: string) => /^\s*([-*_]){3,}\s*$/.test(value);
    const isHeading = (value: string) => /^(#{1,6})\s+(.+)$/.test(value);
    const isBlockquote = (value: string) => /^>\s?(.*)$/.test(value);
    const isUnorderedListItem = (value: string) => /^\s*[-*+]\s+/.test(value);
    const isOrderedListItem = (value: string) => /^\s*\d+\.\s+/.test(value);
    const startsBlock = (value: string) =>
      isHorizontalRule(value) ||
      isHeading(value) ||
      isBlockquote(value) ||
      isUnorderedListItem(value) ||
      isOrderedListItem(value);

    while (i < lines.length) {
      const line = lines[i];

      if (isHorizontalRule(line)) {
        elements.push(<hr key={elements.length} />);
        i++;
        continue;
      }

      const h = /^(#{1,6})\s+(.+)$/.exec(line);
      if (h) {
        const level = h[1].length;
        const content = h[2];
        const Tag = (`h${level}` as unknown) as React.ElementType;
        elements.push(<Tag key={elements.length}>{transformInline(content)}</Tag>);
        i++;
        continue;
      }

      const bq = /^>\s?(.*)$/.exec(line);
      if (bq) {
        elements.push(
          <blockquote key={elements.length}>{transformInline(bq[1])}</blockquote>
        );
        i++;
        continue;
      }

      if (isUnorderedListItem(line)) {
        const items: React.ReactNode[] = [];
        while (i < lines.length && isUnorderedListItem(lines[i])) {
          const itemText = lines[i].replace(/^\s*[-*+]\s+/, "");
          items.push(<li key={items.length}>{transformInline(itemText)}</li>);
          i++;
        }
        elements.push(<ul key={elements.length}>{items}</ul>);
        continue;
      }

      if (isOrderedListItem(line)) {
        const items: React.ReactNode[] = [];
        while (i < lines.length && isOrderedListItem(lines[i])) {
          const itemText = lines[i].replace(/^\s*\d+\.\s+/, "");
          items.push(<li key={items.length}>{transformInline(itemText)}</li>);
          i++;
        }
        elements.push(<ol key={elements.length}>{items}</ol>);
        continue;
      }

      const paragraphLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        (paragraphLines.length === 0 || !startsBlock(lines[i]))
      ) {
        paragraphLines.push(lines[i]);
        i++;
      }
      if (paragraphLines.length > 0) {
        elements.push(
          <p key={elements.length}>
            {options.enhanced ? paragraphLines.map((paragraphLine, lineIndex) => (
              <React.Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {transformInline(paragraphLine)}
              </React.Fragment>
            )) : transformInline(paragraphLines.join(" "))}
          </p>
        );
      }

      while (i < lines.length && lines[i].trim() === "") i++;
    }

    return <>{elements}</>;
  }

  function transformInline(src: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let rest = src;

    const patterns: LightMarkdownInlinePattern[] = [
      ...inlinePatterns,
      { re: /\*\*(.+?)\*\*/, wrap: (m) => <strong>{transformInline(m[1])}</strong> },
      { re: /\*(.+?)\*/, wrap: (m) => <em>{transformInline(m[1])}</em> },
      { re: /`([^`]+?)`/, wrap: (m) => <code>{m[1]}</code> },
      {
        re: /\[(.+?)\]\((https?:[^\s)]+)\)/,
        wrap: (m) => (
          <a href={m[2]} target="_blank" rel="noreferrer">
            {m[1]}
          </a>
        ),
      },
    ];

    while (rest.length) {
      let bestMatch:
        | {
          idx: number;
          m: RegExpExecArray;
          wrap: (m: RegExpExecArray) => React.ReactNode;
        }
        | null = null;

      for (const p of patterns) {
        const m = p.re.exec(rest);
        if (!m) continue;
        const idx = m.index;
        if (!bestMatch || idx < bestMatch.idx) {
          bestMatch = { idx, m, wrap: p.wrap };
        }
      }

      if (!bestMatch) {
        parts.push(<span key={parts.length}>{esc(rest)}</span>);
        break;
      }

      if (bestMatch.idx > 0) {
        parts.push(
          <span key={parts.length}>{esc(rest.slice(0, bestMatch.idx))}</span>
        );
      }

      parts.push(<span key={parts.length}>{bestMatch.wrap(bestMatch.m)}</span>);
      rest = rest.slice(bestMatch.idx + bestMatch.m[0].length);
    }

    return <>{parts}</>;
  }

  function splitFencedBlocks(
    src: string,
    enhanced: boolean
  ): Array<{ type: "code" | "text"; content: string; language?: string }> {
    const result: Array<{ type: "code" | "text"; content: string; language?: string }> = [];
    const fence = enhanced ? /```([^\n`]*)\n?([\s\S]*?)```/g : /```([\s\S]*?)```/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = fence.exec(src)) !== null) {
      if (m.index > lastIndex) {
        result.push({ type: "text", content: src.slice(lastIndex, m.index) });
      }
      result.push(enhanced
        ? { type: "code", content: m[2].trimEnd(), language: m[1].trim() || undefined }
        : { type: "code", content: m[1].trimEnd() });
      lastIndex = m.index + m[0].length;
    }

    if (lastIndex < src.length) {
      result.push({ type: "text", content: src.slice(lastIndex) });
    }

    return result;
  }
}
