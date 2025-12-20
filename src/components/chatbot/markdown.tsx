import React from "react";

export function renderLightMarkdown(text: string): React.ReactNode {
  const esc = (s: string) =>
    s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

  const blocks = splitFencedBlocks(text);

  return (
    <>
      {blocks.map((block, idx) => (
        <div key={idx}>
          {block.type === "code" ? (
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

    while (i < lines.length) {
      const line = lines[i];

      if (/^\s*([-*_]){3,}\s*$/.test(line)) {
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

      if (/^\s*[-*+]\s+/.test(line)) {
        const items: React.ReactNode[] = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          const itemText = lines[i].replace(/^\s*[-*+]\s+/, "");
          items.push(<li key={items.length}>{transformInline(itemText)}</li>);
          i++;
        }
        elements.push(<ul key={elements.length}>{items}</ul>);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items: React.ReactNode[] = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          const itemText = lines[i].replace(/^\s*\d+\.\s+/, "");
          items.push(<li key={items.length}>{transformInline(itemText)}</li>);
          i++;
        }
        elements.push(<ol key={elements.length}>{items}</ol>);
        continue;
      }

      const paragraphLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "") {
        paragraphLines.push(lines[i]);
        i++;
      }
      if (paragraphLines.length > 0) {
        elements.push(
          <p key={elements.length}>{transformInline(paragraphLines.join(" "))}</p>
        );
      }

      while (i < lines.length && lines[i].trim() === "") i++;
    }

    return <>{elements}</>;
  }

  function transformInline(src: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let rest = src;

    const patterns: Array<{
      re: RegExp;
      wrap: (m: RegExpExecArray) => React.ReactNode;
    }> = [
        { re: /\*\*(.+?)\*\*/, wrap: (m) => <strong>{m[1]}</strong> },
        { re: /\*(.+?)\*/, wrap: (m) => <em>{m[1]}</em> },
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
    src: string
  ): Array<{ type: "code" | "text"; content: string }> {
    const result: Array<{ type: "code" | "text"; content: string }> = [];
    const fence = /```([\s\S]*?)```/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = fence.exec(src)) !== null) {
      if (m.index > lastIndex) {
        result.push({ type: "text", content: src.slice(lastIndex, m.index) });
      }
      result.push({ type: "code", content: m[1].trimEnd() });
      lastIndex = m.index + m[0].length;
    }

    if (lastIndex < src.length) {
      result.push({ type: "text", content: src.slice(lastIndex) });
    }

    return result;
  }
}
