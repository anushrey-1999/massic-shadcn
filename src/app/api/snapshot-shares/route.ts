import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getSnapshotShareConfig,
  isAllowedSnapshotRequestOrigin,
} from "@/lib/server/snapshot-share-config";
import {
  assertBusinessSnapshotAccess,
  SnapshotAccessDeniedError,
} from "@/lib/server/snapshot-report-gateway";
import { createSnapshotShareToken } from "@/lib/server/snapshot-share-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 1024;
const MAX_SESSION_TOKEN_LENGTH = 8192;

const requestSchema = z
  .object({
    businessId: z.string().uuid(),
  })
  .strict();

function jsonResponse(
  body: { error: string } | { sharePath: string },
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

async function readRequestBody(request: NextRequest): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_REQUEST_BYTES
  ) {
    throw new Error("Request too large");
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new Error("Invalid content type");
  }

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
    throw new Error("Request too large");
  }
  return JSON.parse(body) as unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    getSnapshotShareConfig();
  } catch {
    return jsonResponse({ error: "Sharing is unavailable." }, 503);
  }

  if (
    !isAllowedSnapshotRequestOrigin(
      request.headers.get("origin"),
      request.url,
    )
  ) {
    return jsonResponse({ error: "Request not allowed." }, 403);
  }

  const sessionToken = request.cookies.get("token")?.value?.trim() || "";
  if (
    sessionToken.length === 0 ||
    sessionToken.length > MAX_SESSION_TOKEN_LENGTH
  ) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  let requestBody: z.infer<typeof requestSchema>;
  try {
    requestBody = requestSchema.parse(await readRequestBody(request));
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  try {
    await assertBusinessSnapshotAccess(
      requestBody.businessId,
      sessionToken,
    );
    const token = createSnapshotShareToken({
      businessId: requestBody.businessId,
    });

    return jsonResponse({ sharePath: `/snapshot#${token}` }, 201);
  } catch (error) {
    if (error instanceof SnapshotAccessDeniedError) {
      return jsonResponse({ error: "Snapshot not available." }, 403);
    }
    return jsonResponse({ error: "Sharing is unavailable." }, 503);
  }
}
