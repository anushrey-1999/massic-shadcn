export function cleanEscapedContent(content: string): string {
  if (!content || typeof content !== "string") return "";

  try {
    if (content.startsWith('"\\"\\"') && content.endsWith('\\"\\""')) {
      const firstParse = JSON.parse(content);
      const secondParse = JSON.parse(firstParse);
      if (typeof secondParse === "string") return stripLeadingOutlineFence(secondParse);
    }
  } catch {
    // ignore
  }

  try {
    if (content.startsWith('"') && content.endsWith('"')) {
      const parsed = JSON.parse(content);
      if (typeof parsed === "string") return stripLeadingOutlineFence(parsed);
    }
  } catch {
    // ignore
  }

  const cleaned = content
    .replace(/\\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\\*/g, "*")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\"/g, '"')
    .replace(/\\\'/g, "'")
    .replace(/\\#/g, "#")
    .replace(/\\\\/g, "\\")
    .replace(/^#{1,6}\s*H[1-6]:\s*/gm, (match) => {
      const level = match.match(/#/g)?.length || 1;
      return "#".repeat(level) + " ";
    })
    .replace(/^(H[1-6]:\s*)/gm, "")
    .replace(/PAGE_CONTENT/gi, "")
    .replace(/^\d+\.\s*$/gm, "");

  return stripLeadingOutlineFence(cleaned);
}

function stripLeadingOutlineFence(content: string): string {
  const value = content.trim();
  const fullFenceMatch = value.match(/^```(?:markdown|md)?[ \t]*\n([\s\S]*?)\n```$/i);

  if (fullFenceMatch) return fullFenceMatch[1].trim();
  if (!/^```(?:markdown|md)?[ \t]*(?:\n|$)/i.test(value)) return content;

  return value
    .replace(/^```(?:markdown|md)?[ \t]*\n?/i, "")
    .replace(/\n```[ \t]*\n+(?=\*\*Meta Title:\*\*|Meta Title:)/i, "\n\n")
    .trim();
}
