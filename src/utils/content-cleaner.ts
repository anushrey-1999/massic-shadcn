export function cleanEscapedContent(content: string): string {
  if (!content) return content;

  try {
    if (content.startsWith('"\\"\\"') && content.endsWith('\\"\\""')) {
      const firstParse = JSON.parse(content);
      const secondParse = JSON.parse(firstParse);
      if (typeof secondParse === "string") return secondParse;
    }
  } catch {
    // ignore
  }

  try {
    if (content.startsWith('"') && content.endsWith('"')) {
      const parsed = JSON.parse(content);
      if (typeof parsed === "string") return parsed;
    }
  } catch {
    // ignore
  }

  return content
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
}
