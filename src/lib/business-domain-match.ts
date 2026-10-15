import type { BusinessProfile } from "@/store/business-store";
import type { ExistingBusinessSummary } from "@/lib/business-conflict";

/** Same hostname identity as Main's domainMatch.util; do not collapse subdomains. */
export function businessDomain(rawValue: string | null | undefined): string {
  const candidate = String(rawValue ?? "")
    .trim()
    .toLowerCase()
    .replace(/^(?:sc-domain|sc):\s*/i, "")
    .trim();
  if (!candidate) return "";
  let host: string;
  try {
    host = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(candidate)
        ? candidate
        : `https://${candidate}`,
    ).hostname;
  } catch {
    host = candidate
      .replace(/^[a-z][a-z\d+.-]*:\/\//i, "")
      .split(/[/?#]/)[0]
      .split(":")[0];
  }
  return host
    .trim()
    .replace(/^www\./, "")
    .replace(/\.+$/, "");
}

type Candidate = BusinessProfile & {
  IsPitch?: boolean;
  UpdatedDateTime?: string;
};

export function findBusinessDuplicate(
  website: string,
  candidates: Candidate[],
): ExistingBusinessSummary | null {
  const domain = businessDomain(website);
  if (!domain) return null;
  const matches = candidates.filter(
    (business) => businessDomain(business.Website) === domain,
  );
  const timestamp = (business: Candidate) => {
    const value = new Date(
      business.UpdatedDateTime || business.CreatedDateTime || 0,
    ).getTime();
    return Number.isFinite(value) ? value : 0;
  };
  matches.sort(
    (a, b) =>
      Number(a.IsPitch === true) - Number(b.IsPitch === true) ||
      Number(b.IsActive === true) - Number(a.IsActive === true) ||
      timestamp(b) - timestamp(a) ||
      a.UniqueId.localeCompare(b.UniqueId),
  );
  const match = matches[0];
  return match
    ? {
        UniqueId: match.UniqueId,
        Name: match.Name || null,
        Website: match.Website || null,
        IsPitch: match.IsPitch === true,
        IsActive: match.IsActive !== false,
        LinkedAuthId: match.LinkedAuthId ?? null,
      }
    : null;
}
