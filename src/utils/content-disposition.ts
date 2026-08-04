const INVALID_FILENAME_CHARACTERS = /[\u0000-\u001f\u007f/\\:*?"<>|]/g;

function sanitizeFilenameBase(title: string): string {
  return title
    .trim()
    .replace(INVALID_FILENAME_CHARACTERS, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "");
}

function encodeRfc5987Value(value: string): string {
  return encodeURIComponent(value).replace(/[\u0027()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function buildPdfContentDisposition(title: string): string {
  const filenameBase = sanitizeFilenameBase(title) || "document";
  const utf8Filename = `${filenameBase}.pdf`;
  const asciiFilenameBase =
    sanitizeFilenameBase(filenameBase.normalize("NFKD").replace(/[^\x20-\x7e]/g, "")) ||
    "document";

  return `attachment; filename="${asciiFilenameBase}.pdf"; filename*=UTF-8''${encodeRfc5987Value(utf8Filename)}`;
}
