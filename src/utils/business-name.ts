const COMMON_SECOND_LEVEL_DOMAINS = new Set([
  "ac",
  "co",
  "com",
  "edu",
  "gov",
  "net",
  "org",
]);

export function deriveBusinessNameFromWebsite(website: string): string {
  const input = website.trim();
  if (!input) return "Business";

  try {
    const url = new URL(
      /^[a-z][a-z\d+\-.]*:\/\//i.test(input) ? input : `https://${input}`
    );
    const labels = url.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .split(".")
      .filter(Boolean);

    let nameIndex = Math.max(0, labels.length - 2);
    if (
      labels.length >= 3 &&
      labels.at(-1)?.length === 2 &&
      COMMON_SECOND_LEVEL_DOMAINS.has(labels.at(-2) ?? "")
    ) {
      nameIndex = labels.length - 3;
    }

    const label = labels[nameIndex] ?? labels[0] ?? "";
    const words = label
      .replace(/[-_]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();

    if (!words) return "Business";
    return words.replace(/\b\w/g, (character) => character.toUpperCase());
  } catch {
    return "Business";
  }
}
