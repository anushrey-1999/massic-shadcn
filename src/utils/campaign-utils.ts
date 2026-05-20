const REVIEW_PLATFORMS: Record<string, string> = {
  "yelp.com": "Yelp",
  "google.com": "Google",
  "g.page": "Google",
  "maps.app.goo.gl": "Google",
  "googleusercontent.com": "Google",
  "facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "trustpilot.com": "Trustpilot",
  "bbb.org": "Better Business Bureau",
  "angieslist.com": "Angie's List",
  "homeadvisor.com": "HomeAdvisor",
  "tripadvisor.com": "TripAdvisor",
  "amazon.com": "Amazon",
  "glassdoor.com": "Glassdoor",
  "indeed.com": "Indeed",
  "apps.apple.com": "App Store",
  "play.google.com": "Google Play",
  "linkedin.com": "LinkedIn",
};

export function deriveCampaignPlatformFromUrl(reviewUrl: string): string {
  try {
    const url = new URL(reviewUrl);
    const host = url.hostname.toLowerCase();

    // Check for exact or partial matches in the platforms map
    for (const [platform, name] of Object.entries(REVIEW_PLATFORMS)) {
      if (host.includes(platform)) {
        return name;
      }
    }

    // Fallback: derive from hostname
    const hostNoWww = host.replace(/^www\./, "");
    const base = hostNoWww
      .split(".")
      .filter(Boolean)
      .slice(0, -1)
      .join(" ");

    const normalized = base || hostNoWww;
    const titleCased = normalized
      .replace(/[-_]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return titleCased || "Review Campaign";
  } catch (error) {
    return "Review Campaign";
  }
}

function formatCampaignDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month} ${day} ${year}`;
}

export function deriveCampaignNameFromUrl(reviewUrl: string, date = new Date()): string {
  return `${deriveCampaignPlatformFromUrl(reviewUrl)} ${formatCampaignDate(date)}`;
}
