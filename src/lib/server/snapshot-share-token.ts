import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { z } from "zod";

import { getSnapshotShareConfig } from "@/lib/server/snapshot-share-config";

const TOKEN_VERSION = "v1";
const TOKEN_AAD = Buffer.from("massic:snapshot-share:v1", "utf8");
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
export const MAX_SNAPSHOT_SHARE_TOKEN_LENGTH = 1024;

const payloadSchema = z
  .object({
    businessId: z.string().uuid(),
  })
  .strict();

export type SnapshotSharePayload = z.infer<typeof payloadSchema>;

export class InvalidSnapshotShareTokenError extends Error {
  constructor() {
    super("Invalid snapshot share token");
    this.name = "InvalidSnapshotShareTokenError";
  }
}

function encodePart(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function decodePart(value: string, expectedLength?: number): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new InvalidSnapshotShareTokenError();
  }

  const decoded = Buffer.from(value, "base64url");
  if (expectedLength !== undefined && decoded.length !== expectedLength) {
    throw new InvalidSnapshotShareTokenError();
  }

  return decoded;
}

export function createSnapshotShareToken(
  payload: SnapshotSharePayload,
): string {
  const validatedPayload = payloadSchema.parse(payload);
  const { encryptionKey } = getSnapshotShareConfig();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv, {
    authTagLength: AUTH_TAG_BYTES,
  });
  cipher.setAAD(TOKEN_AAD);

  const plaintext = Buffer.from(JSON.stringify(validatedPayload), "utf8");
  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    encodePart(iv),
    encodePart(ciphertext),
    encodePart(authTag),
  ].join(".");
}

export function readSnapshotShareToken(token: string): SnapshotSharePayload {
  const normalizedToken = token.trim();
  if (
    normalizedToken.length === 0 ||
    normalizedToken.length > MAX_SNAPSHOT_SHARE_TOKEN_LENGTH
  ) {
    throw new InvalidSnapshotShareTokenError();
  }

  const parts = normalizedToken.split(".");
  if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) {
    throw new InvalidSnapshotShareTokenError();
  }

  try {
    const { encryptionKey } = getSnapshotShareConfig();
    const iv = decodePart(parts[1], IV_BYTES);
    const ciphertext = decodePart(parts[2]);
    const authTag = decodePart(parts[3], AUTH_TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, iv, {
      authTagLength: AUTH_TAG_BYTES,
    });
    decipher.setAAD(TOKEN_AAD);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    const parsedPayload: unknown = JSON.parse(plaintext.toString("utf8"));
    return payloadSchema.parse(parsedPayload);
  } catch (error) {
    if (error instanceof InvalidSnapshotShareTokenError) {
      throw error;
    }
    throw new InvalidSnapshotShareTokenError();
  }
}
