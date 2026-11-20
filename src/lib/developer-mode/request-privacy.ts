export const MAX_BODY_BYTES = 1024 * 1024;

export type RequestBackend = "main" | "infer";

export interface RequestApiTarget {
  base: URL;
  backend: RequestBackend | null;
  exact?: boolean;
}

const REDACTED = "[redacted]";
const PRIVATE_KEY =
  /authorization|cookie|token|password|passwd|passphrase|secret|api.?key|credential|private.?key|signature|csrf|xsrf|auth.?code|pairing.?code|card.?number|cvc|cvv|account.?number|routing.?number|presign|signed.?url|session.?id|session.?key|^session$|^sesid$|^otp$|^ssn$/i;
const PRIVATE_ROUTE =
  /^(?:admin|auth|oauth|sso|login|logout|register|signup|sign-in|sign-up|verify|reset-password|refresh-token|credentials?|tokens?|secrets?|api-keys?|access-request|snapshot-shares|r)$/i;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const PROVIDER_SECRET =
  /\b(?:(?:sk|rk)_(?:live|test)_[\w-]+|whsec_[\w-]+|sk-(?:proj-|ant-)?[\w-]{16,}|SG\.[\w-]+\.[\w-]+|ya29\.[\w.-]+|(?:github_pat_|gh[opsu]_)[\w-]+|xox[baprs]-[\w-]+|AKIA[0-9A-Z]{16})\b/g;
const SECRET_QUERY_NAME =
  /^(?:x-amz-.+|x-goog-.+|sig|signature|token|access_token|key|api_key|code|state|session|policy|key-pair-id|awsaccesskeyid|googleaccessid|credential|instanceid|signedinstance)$/i;
const SECRET_QUERY =
  /[?&](?:x-amz-[^=&]+|x-goog-[^=&]+|sig|signature|token|access_token|key|api_key|code|state|session|policy|key-pair-id|awsaccesskeyid|googleaccessid|credential|instanceid|signedinstance)=[^&\s]+/i;
const INLINE_SECRET =
  /((?:access[-_ ]?token|refresh[-_ ]?token|api[-_ ]?key|secret|password|token|credential)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;&}"']+)/gi;
const SAFE_QUERY_KEYS = [
  "business_id",
  "businessId",
  "page",
  "page_size",
  "pageSize",
  "limit",
  "offset",
];
const SAFE_QUERY_VALUE =
  /^(?:\d{1,10}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/i;

function hasSecretQuery(url: URL) {
  return Array.from(url.searchParams.keys()).some(
    (key) => SECRET_QUERY_NAME.test(key) || PRIVATE_KEY.test(key),
  );
}

function matchApiTarget(url: URL, targets: readonly RequestApiTarget[]) {
  if (url.username || url.password) return null;

  const path = url.pathname.replace(/\/+$/, "");
  let longestMatch = -1;
  const backends = new Set<RequestBackend>();
  for (const target of targets) {
    if (url.origin !== target.base.origin) continue;
    const prefix = target.base.pathname.replace(/\/+$/, "");
    if (path !== prefix && (target.exact || !path.startsWith(prefix + "/")))
      continue;
    if (prefix.length > longestMatch) {
      longestMatch = prefix.length;
      backends.clear();
    }
    if (prefix.length === longestMatch && target.backend)
      backends.add(target.backend);
  }
  return longestMatch >= 0
    ? { backend: backends.size === 1 ? [...backends][0] : null }
    : null;
}

export function describeRequest(
  url: URL,
  targets: readonly RequestApiTarget[],
) {
  const match = matchApiTarget(url, targets);
  if (!match) {
    return {
      backend: null,
      label: url.origin + "/…",
      omission: "External destination",
    };
  }

  const { backend } = match;
  const segments = url.pathname.split("/");
  for (let index = 1; index < segments.length; index++) {
    let segment: string;
    try {
      segment = decodeURIComponent(segments[index]);
    } catch {
      return {
        backend,
        label: url.origin + "/…",
        omission: "Sensitive endpoint",
      };
    }
    if (PRIVATE_ROUTE.test(segment)) {
      return {
        backend,
        label: url.origin + segments.slice(0, index + 1).join("/") + "/…",
        omission: "Sensitive endpoint",
      };
    }
    if (
      PRIVATE_KEY.test(segment) ||
      /[/?#\\\s]/.test(segment) ||
      redactString(segment) !== segment ||
      segment.length > 100
    ) {
      const prefix = segments.slice(0, index).join("/");
      return {
        backend,
        label: url.origin + prefix + "/…",
        omission: "Sensitive endpoint",
      };
    }
  }
  if (hasSecretQuery(url)) {
    return {
      backend,
      label: url.origin + url.pathname,
      omission: "Sensitive endpoint",
    };
  }

  const safeQuery = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (SAFE_QUERY_KEYS.includes(key) && SAFE_QUERY_VALUE.test(value))
      safeQuery.append(key, value);
  }
  return {
    backend,
    label:
      (url.origin === window.location.origin ? "" : url.origin) +
      url.pathname +
      (safeQuery.size ? "?" + safeQuery.toString() : ""),
    omission: null,
  };
}

export function responseOmission(
  contentType: string,
  contentLength: string | null,
) {
  const mime = contentType.split(";")[0].trim().toLowerCase();
  if (
    mime === "text/event-stream" ||
    mime.includes("ndjson") ||
    mime === "application/json-seq"
  ) {
    return "Streaming response";
  }
  if (mime !== "application/json" && !mime.endsWith("+json"))
    return "Response is not JSON";
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES)
    return "Response exceeds 1 MiB";
  return null;
}

function redactString(value: string) {
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value)) return REDACTED;
  if (SECRET_QUERY.test(value)) return REDACTED;
  return value
    .replace(JWT, REDACTED)
    .replace(PROVIDER_SECRET, REDACTED)
    .replace(INLINE_SECRET, "$1" + REDACTED)
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.~-]+/gi, REDACTED)
    .replace(/https?:\/\/[^\s"'<>\\]+/gi, (match) => {
      try {
        const url = new URL(match);
        return url.username || url.password || hasSecretQuery(url)
          ? REDACTED
          : match;
      } catch {
        return REDACTED;
      }
    });
}

export function prepareJson(
  value: unknown,
): { json: string; bytes: number } | { omission: string } {
  let remaining = MAX_BODY_BYTES;
  function spend(characters: number) {
    remaining -= characters;
    if (remaining < 0) throw new RangeError();
  }

  function sanitize(input: unknown, depth: number): unknown {
    if (depth > 64) throw new RangeError();
    spend(4);
    if (typeof input === "string") {
      spend(input.length);
      // Some API envelopes contain JSON encoded as a string.
      if (/^\s*[[{]/.test(input)) {
        let nested: unknown;
        try {
          nested = JSON.parse(input);
        } catch {
          return redactString(input);
        }
        return JSON.stringify(sanitize(nested, depth + 1));
      }
      return redactString(input);
    }
    if (Array.isArray(input)) {
      if (input.length > remaining / 4) throw new RangeError();
      return input.map((item) => sanitize(item, depth + 1));
    }
    if (input && typeof input === "object") {
      const copy: Record<string, unknown> = Object.create(null);
      for (const key in input) {
        if (!Object.hasOwn(input, key)) continue;
        spend(key.length + 4);
        copy[redactString(key)] = PRIVATE_KEY.test(key)
          ? REDACTED
          : sanitize((input as Record<string, unknown>)[key], depth + 1);
      }
      return copy;
    }
    return input;
  }

  try {
    // Compact JSON bounds memory even for deeply nested payloads. The drawer
    // formats only the response currently being viewed.
    const json = JSON.stringify(sanitize(value, 0));
    if (json === undefined) return { omission: "No response body" };
    const bytes = new TextEncoder().encode(json).byteLength;
    return bytes <= MAX_BODY_BYTES
      ? { json, bytes }
      : { omission: "Response exceeds 1 MiB" };
  } catch (error) {
    return {
      omission:
        error instanceof RangeError
          ? "Response exceeds preview limits"
          : "Response could not be read",
    };
  }
}
