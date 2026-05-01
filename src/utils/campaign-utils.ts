const REVIEW_PLATFORMS: Record<string, string> = {
  "yelp.com": "Yelp",
  "google.com": "Google Reviews",
  "g.page": "Google Reviews",
  "maps.app.goo.gl": "Google Reviews",
  "googleusercontent.com": "Google Reviews",
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

export function deriveCampaignNameFromUrl(reviewUrl: string): string {
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
