import "server-only";

import { getSnapshotShareConfig } from "@/lib/server/snapshot-share-config";
import {
  normalizeWebsiteSnapshotReport,
  type WebsiteSnapshotReport,
} from "@/utils/website-snapshot-report";

const MAX_PROFILE_RESPONSE_BYTES = 1 * 1024 * 1024;
const MAX_REPORT_STATUS_BYTES = 1 * 1024 * 1024;
const MAX_REPORT_BYTES = 5 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_PUBLIC_VALUE_DEPTH = 24;
const MAX_PUBLIC_ARRAY_LENGTH = 5_000;

const PRIVATE_REPORT_KEYS = new Set([
  "business_id",
  "businessid",
  "download_url",
  "job_id",
  "jobid",
  "output_path",
  "pitch_id",
  "pitchid",
]);

type UnknownRecord = Record<string, unknown>;

export class SnapshotAccessDeniedError extends Error {
  constructor() {
    super("Snapshot access denied");
    this.name = "SnapshotAccessDeniedError";
  }
}

export class SnapshotNotAvailableError extends Error {
  constructor() {
    super("Snapshot not available");
    this.name = "SnapshotNotAvailableError";
  }
}

export class SnapshotUpstreamError extends Error {
  constructor() {
    super("Snapshot service unavailable");
    this.name = "SnapshotUpstreamError";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJsonResponse(
  response: Response,
  maxBytes: number,
): Promise<unknown> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new SnapshotUpstreamError();
  }

  if (!response.body) {
    throw new SnapshotUpstreamError();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new SnapshotUpstreamError();
    }
    chunks.push(value);
  }

  const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  try {
    return JSON.parse(body.toString("utf8")) as unknown;
  } catch {
    throw new SnapshotUpstreamError();
  }
}

async function fetchJson(
  url: URL,
  options: RequestInit,
  maxBytes: number,
): Promise<{ payload: unknown; status: number }> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new SnapshotUpstreamError();
  }

  if (!response.ok) {
    return { payload: null, status: response.status };
  }

  return {
    payload: await readJsonResponse(response, maxBytes),
    status: response.status,
  };
}

function parseProfiles(payload: unknown): UnknownRecord[] | null {
  if (!isRecord(payload) || payload.err === true) return null;

  const rawProfiles = payload.data;
  if (typeof rawProfiles === "string") {
    try {
      const parsed: unknown = JSON.parse(rawProfiles);
      return Array.isArray(parsed) ? parsed.filter(isRecord) : null;
    } catch {
      return null;
    }
  }

  return Array.isArray(rawProfiles) ? rawProfiles.filter(isRecord) : null;
}

function profileBusinessId(profile: UnknownRecord): string {
  const value =
    profile.UniqueId ??
    profile.uniqueId ??
    profile.business_id ??
    profile.businessId;
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedReportAssetUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;

  const { reportAssetHosts } = getSnapshotShareConfig();
  const hostname = url.hostname.toLowerCase();
  if (
    hostname.endsWith(".amazonaws.com") ||
    hostname === "amazonaws.com"
  ) {
    return true;
  }

  for (const allowedHost of reportAssetHosts) {
    if (
      hostname === allowedHost ||
      hostname.endsWith(`.${allowedHost}`)
    ) {
      return true;
    }
  }

  return false;
}

function publicValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_PUBLIC_VALUE_DEPTH) return null;

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_PUBLIC_ARRAY_LENGTH)
      .map((item) => publicValue(item, depth + 1));
  }

  if (!isRecord(value)) return value;

  const result: UnknownRecord = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.replace(/[-_]/g, "").toLowerCase();
    if (PRIVATE_REPORT_KEYS.has(key.toLowerCase())) continue;
    if (PRIVATE_REPORT_KEYS.has(normalizedKey)) continue;
    if (key === "run" && depth <= 2) continue;
    result[key] = publicValue(nestedValue, depth + 1);
  }
  return result;
}

export function sanitizePublicSnapshotReport(
  report: WebsiteSnapshotReport,
): WebsiteSnapshotReport {
  const sanitized = publicValue(report);
  const normalized = normalizeWebsiteSnapshotReport(sanitized);
  if (!normalized) {
    throw new SnapshotUpstreamError();
  }
  return normalized;
}

export async function assertBusinessSnapshotAccess(
  businessId: string,
  sessionToken: string,
): Promise<void> {
  const { nodeApiUrl } = getSnapshotShareConfig();
  const fetchProfiles = async (isPitch: boolean) => {
    const url = new URL(
      `${nodeApiUrl}/profile/get-user-business-profiles/`,
    );
    url.searchParams.set("isPitch", String(isPitch));
    return fetchJson(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Token: sessionToken,
        },
      },
      MAX_PROFILE_RESPONSE_BYTES,
    );
  };

  const responses = await Promise.all([
    fetchProfiles(false),
    fetchProfiles(true),
  ]);

  if (
    responses.some(({ status }) =>
      status === 401 || status === 403
    )
  ) {
    throw new SnapshotAccessDeniedError();
  }
  if (
    responses.some(
      ({ status }) => status < 200 || status >= 300,
    )
  ) {
    throw new SnapshotUpstreamError();
  }

  const hasAccess = responses.some(({ payload }) =>
    (parseProfiles(payload) || []).some(
      (profile) =>
        profileBusinessId(profile).toLowerCase() ===
        businessId.toLowerCase(),
    ),
  );
  if (!hasAccess) {
    throw new SnapshotAccessDeniedError();
  }
}

export async function getLatestPublicSnapshot(
  businessId: string,
): Promise<WebsiteSnapshotReport> {
  const { inferApiUrl } = getSnapshotShareConfig();
  const statusUrl = new URL(`${inferApiUrl}/reports/website-snapshot`);
  statusUrl.searchParams.set("business_id", businessId);

  const { payload, status } = await fetchJson(
    statusUrl,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
    MAX_REPORT_STATUS_BYTES,
  );

  if (status === 404) throw new SnapshotNotAvailableError();
  if (status < 200 || status >= 300) throw new SnapshotUpstreamError();

  const directReport = normalizeWebsiteSnapshotReport(payload);
  if (directReport) return sanitizePublicSnapshotReport(directReport);

  if (!isRecord(payload) || String(payload.status || "").toLowerCase() !== "success") {
    throw new SnapshotNotAvailableError();
  }

  const outputData = payload.output_data;
  const downloadUrlValue =
    isRecord(outputData) && typeof outputData.download_url === "string"
      ? outputData.download_url
      : "";
  if (!downloadUrlValue) throw new SnapshotNotAvailableError();

  let downloadUrl: URL;
  try {
    downloadUrl = new URL(downloadUrlValue);
  } catch {
    throw new SnapshotUpstreamError();
  }
  if (!isAllowedReportAssetUrl(downloadUrl)) {
    throw new SnapshotUpstreamError();
  }

  const reportResponse = await fetchJson(
    downloadUrl,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
    MAX_REPORT_BYTES,
  );
  if (reportResponse.status < 200 || reportResponse.status >= 300) {
    throw new SnapshotUpstreamError();
  }

  const report = normalizeWebsiteSnapshotReport(reportResponse.payload);
  if (!report) throw new SnapshotUpstreamError();
  return sanitizePublicSnapshotReport(report);
}
