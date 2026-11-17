import type {
  BusinessConnections,
  GoogleIntegration,
} from "@/hooks/use-business-connections";

export interface GoogleSourceConfig {
  label: string;
  /** What the source adds, phrased to follow "Connect {label} to see". */
  unlocks: string;
  connectedFlag: keyof BusinessConnections;
}

export const GOOGLE_SOURCES: Record<GoogleIntegration, GoogleSourceConfig> = {
  gsc: {
    label: "Search Console",
    unlocks: "the searches that show your site and bring clicks",
    connectedFlag: "isGscConnected",
  },
  ga4: {
    label: "Google Analytics",
    unlocks: "website visits, traffic sources and goals",
    connectedFlag: "isGa4Connected",
  },
  gbp: {
    label: "Business Profile",
    unlocks: "calls, directions and views from Google Maps",
    connectedFlag: "isGbpConnected",
  },
};

export const GOOGLE_SOURCE_ORDER: readonly GoogleIntegration[] = [
  "gsc",
  "ga4",
  "gbp",
];

export function isGoogleSourceConnected(
  connections: BusinessConnections,
  source: GoogleIntegration,
): boolean {
  return connections[GOOGLE_SOURCES[source].connectedFlag];
}
