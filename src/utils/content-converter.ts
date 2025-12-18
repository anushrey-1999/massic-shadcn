import { marked } from "marked";
import TurndownService from "turndown";

marked.setOptions({
  breaks: true,
  gfm: true,
});

const turndownService = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
  linkReferenceStyle: "full",
});

turndownService.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement: (content: string) => `~~${content}~~`,
});

turndownService.addRule("underline", {
  filter: "u",
  replacement: (content: string) => `<u>${content}</u>`,
});

const htmlTagRegex = /<[^>]+>/;

function isHtmlContent(content: string): boolean {
  return !!content && htmlTagRegex.test(content);
}

function isMarkdownContent(content: string): boolean {
  if (!content) return false;

  const markdownPatterns = [
    /^#{1,6}\s+/m,
    /\*\*.*?\*\*/,
    /\*.*?\*/,
    /\[.*?\]\(.*?\)/,
    /^\s*[-*+]\s+/m,
    /^\s*\d+\.\s+/m,
    /```/,
    /`.*?`/,
  ];

  return markdownPatterns.some((pattern) => pattern.test(content));
}

export const ContentConverter = {
  markdownToHtml(markdown: string): string {
    if (!markdown || typeof markdown !== "string") return "";

    try {
      return marked.parse(markdown) as string;
    } catch {
      return markdown;
    }
  },

  htmlToMarkdown(html: string): string {
    if (!html || typeof html !== "string") return "";

    try {
      return turndownService.turndown(html);
    } catch {
      return html;
    }
  },

  normalizeForDisplay(content: string): string {
    if (!content || typeof content !== "string") return "";
    if (isHtmlContent(content)) return content;
    if (isMarkdownContent(content)) return ContentConverter.markdownToHtml(content);
    return `<p>${content}</p>`;
  },

  prepareForApi(content: string): string {
    if (!content || typeof content !== "string") return "";
    if (isHtmlContent(content)) return ContentConverter.htmlToMarkdown(content);
    return content;
  },
};
