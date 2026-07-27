import "server-only";

const LOCAL_APP_ORIGIN = "http://localhost:3000";
const LOCAL_NODE_API_URL = "https://seedmain.seedinternaldev.xyz/api/1";
const LOCAL_INFER_API_URL = "https://infer.seedinternaldev.xyz/v2";

export type SnapshotShareConfig = {
  allowedAppOrigins: ReadonlySet<string>;
  appOrigin: string;
  encryptionKey: Buffer;
  inferApiUrl: string;
  nodeApiUrl: string;
  reportAssetHosts: ReadonlySet<string>;
};

let cachedConfig: SnapshotShareConfig | null = null;

function parseUrl(name: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error(`${name} must use HTTPS`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must not include credentials, query, or fragment`);
  }

  return url.toString().replace(/\/+$/, "");
}

function parseOrigin(name: string, value: string): string {
  const normalizedUrl = parseUrl(name, value);
  const url = new URL(normalizedUrl);
  if (url.pathname !== "/") {
    throw new Error(`${name} must contain only an origin`);
  }
  return url.origin;
}

function requiredValue(
  name: string,
  value: string | undefined,
  developmentFallback?: string,
): string {
  const normalized = value?.trim();
  if (normalized) return normalized;

  if (process.env.NODE_ENV !== "production" && developmentFallback) {
    return developmentFallback;
  }

  throw new Error(`${name} is required`);
}

function parseEncryptionKey(value: string): Buffer {
  if (
    value.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new Error("SNAPSHOT_SHARE_KEY must be base64 encoded");
  }

  let key: Buffer;
  try {
    key = Buffer.from(value, "base64");
  } catch {
    throw new Error("SNAPSHOT_SHARE_KEY must be base64 encoded");
  }

  if (key.length !== 32) {
    throw new Error("SNAPSHOT_SHARE_KEY must decode to exactly 32 bytes");
  }

  return key;
}

function parseAssetHosts(value: string | undefined): ReadonlySet<string> {
  const configuredHosts = String(value || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configuredHosts);
}

function getAllowedAppOrigins(appOrigin: string): ReadonlySet<string> {
  const origins = new Set([appOrigin]);
  const appUrl = new URL(appOrigin);

  if (appUrl.hostname.startsWith("www.")) {
    appUrl.hostname = appUrl.hostname.slice(4);
    origins.add(appUrl.origin);
  }

  return origins;
}

export function getSnapshotShareConfig(): SnapshotShareConfig {
  if (cachedConfig) return cachedConfig;

  const keyValue = requiredValue(
    "SNAPSHOT_SHARE_KEY",
    process.env.SNAPSHOT_SHARE_KEY,
  );
  const appOrigin = parseOrigin(
    "APP_ORIGIN",
    requiredValue("APP_ORIGIN", process.env.APP_ORIGIN, LOCAL_APP_ORIGIN),
  );
  const nodeApiUrl = parseUrl(
    "NODE_API_URL",
    requiredValue(
      "NODE_API_URL",
      process.env.NODE_API_URL,
      process.env.NEXT_PUBLIC_NODE_API_URL || LOCAL_NODE_API_URL,
    ),
  );
  const inferApiUrl = parseUrl(
    "INFER_API_URL",
    requiredValue(
      "INFER_API_URL",
      process.env.INFER_API_URL,
      process.env.NEXT_PUBLIC_PYTHON_API_URL || LOCAL_INFER_API_URL,
    ),
  );

  cachedConfig = Object.freeze({
    allowedAppOrigins: getAllowedAppOrigins(appOrigin),
    appOrigin,
    encryptionKey: parseEncryptionKey(keyValue),
    inferApiUrl,
    nodeApiUrl,
    reportAssetHosts: parseAssetHosts(process.env.SNAPSHOT_REPORT_ASSET_HOSTS),
  });

  return cachedConfig;
}

export function isAllowedSnapshotRequestOrigin(
  originHeader: string | null,
): boolean {
  if (!originHeader) return false;

  try {
    const origin = new URL(originHeader);
    if (origin.origin !== originHeader) return false;

    const { allowedAppOrigins } = getSnapshotShareConfig();
    return allowedAppOrigins.has(origin.origin);
  } catch {
    return false;
  }
}
