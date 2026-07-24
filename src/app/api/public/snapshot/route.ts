import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getSnapshotShareConfig,
  isAllowedSnapshotRequestOrigin,
} from "@/lib/server/snapshot-share-config";
import {
  getLatestPublicSnapshot,
  SnapshotNotAvailableError,
} from "@/lib/server/snapshot-report-gateway";
import {
  InvalidSnapshotShareTokenError,
  MAX_SNAPSHOT_SHARE_TOKEN_LENGTH,
  readSnapshotShareToken,
} from "@/lib/server/snapshot-share-token";
import type { WebsiteSnapshotReport } from "@/utils/website-snapshot-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 2048;

const requestSchema = z
  .object({
    token: z.string().min(1).max(MAX_SNAPSHOT_SHARE_TOKEN_LENGTH),
  })
  .strict();

function jsonResponse(
  body: { error: string } | { report: WebsiteSnapshotReport },
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readRequestBody(request: NextRequest): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BYTES
  ) {
    throw new InvalidSnapshotShareTokenError();
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new InvalidSnapshotShareTokenError();
  }

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
    throw new InvalidSnapshotShareTokenError();
  }
  return JSON.parse(body) as unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    getSnapshotShareConfig();
    if (
      !isAllowedSnapshotRequestOrigin(
        request.headers.get("origin"),
        request.url,
      )
    ) {
      return jsonResponse({ error: "This snapshot is not available." }, 403);
    }
  } catch {
    return jsonResponse(
      { error: "The snapshot service is temporarily unavailable." },
      503,
    );
  }

  try {
    const requestBody = requestSchema.parse(await readRequestBody(request));
    const payload = readSnapshotShareToken(requestBody.token);
    const report = await getLatestPublicSnapshot(payload.businessId);
    return jsonResponse({ report }, 200);
  } catch (error) {
    if (
      error instanceof InvalidSnapshotShareTokenError ||
      error instanceof SnapshotNotAvailableError ||
      error instanceof z.ZodError
    ) {
      return jsonResponse({ error: "This snapshot is not available." }, 404);
    }

    return jsonResponse(
      { error: "The snapshot service is temporarily unavailable." },
      503,
    );
  }
}
