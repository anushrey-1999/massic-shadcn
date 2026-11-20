import { createStore } from "zustand/vanilla";
import {
  describeRequest,
  prepareJson,
  responseOmission,
  MAX_BODY_BYTES,
  type RequestApiTarget,
  type RequestBackend,
} from "./request-privacy";

const MAX_ENTRIES = 100;
const MAX_RETAINED_BYTES = 10 * MAX_BODY_BYTES;
const MAX_CONCURRENT_READS = 8;
const MAX_QUERY_PARAMS = 200;
const MAX_QUERY_VALUE_LENGTH = 4000;

type Outcome = "pending" | "response" | "network-error" | "cancelled";
type Body = ReturnType<typeof prepareJson>;

export interface CapturedRequest {
  id: number;
  method: string;
  backend: RequestBackend | null;
  url: string;
  startedAt: number;
  durationMs?: number;
  status?: number;
  outcome: Outcome;
  body?: Body;
  /** Query parameters exactly as sent, in order; absent for sensitive endpoints. */
  query?: [string, string][];
}

export interface RequestCaptureAuthorization {
  /** Identifies the session and business; history survives only while it is unchanged. */
  key: string;
  isCurrent: () => boolean;
  apiTargets: readonly RequestApiTarget[];
  businessId: string | null;
}

interface CapturedResponse {
  status: number;
  contentType: string;
  contentLength: string | null;
  finalUrl?: string;
}

export const requestCaptureStore = createStore<{ entries: CapturedRequest[] }>(
  () => ({ entries: [] }),
);

let authorization: RequestCaptureAuthorization | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;
const bodyReaders = new Map<number, () => void>();

export function clearCapturedRequests() {
  bodyReaders.forEach((cancel) => cancel());
  bodyReaders.clear();
  requestCaptureStore.setState({ entries: [] });
}

export function setRequestCapture(next: RequestCaptureAuthorization | null) {
  clearTimeout(releaseTimer);
  if (authorization === next) return;
  const sameScope = authorization?.key === next?.key;
  authorization = next;
  if (!sameScope) clearCapturedRequests();
}

// Deferred so a StrictMode remount, or a provider re-claiming the same scope, keeps
// the history instead of wiping it between cleanup and the next effect.
export function releaseRequestCapture(key: string) {
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    if (authorization?.key === key) setRequestCapture(null);
  }, 0);
}

function replaceEntry(id: number, update: Partial<CapturedRequest>) {
  const entries = requestCaptureStore.getState().entries;
  if (!entries.some((entry) => entry.id === id)) return;

  let retainedBytes = 0;
  const next = entries.map((previous) => {
    const entry = previous.id === id ? { ...previous, ...update } : previous;
    if (!entry.body || !("bytes" in entry.body)) return entry;
    if (retainedBytes + entry.body.bytes > MAX_RETAINED_BYTES) {
      return {
        ...entry,
        body: { omission: "Response expired from the tab’s history" },
      };
    }
    retainedBytes += entry.body.bytes;
    return entry;
  });
  requestCaptureStore.setState({ entries: next });
}

function targetsCurrentBusiness(url: URL, businessId: string | null) {
  if (!businessId) return true;
  const isProfile = /\/profile\/get-business-profile\/?$/i.test(url.pathname);
  const ids = [];
  for (const [key, value] of url.searchParams) {
    if (
      /^(?:business_?id|business_?unique_?id)$/i.test(key) ||
      (isProfile && key.toLowerCase() === "uniqueid")
    )
      ids.push(value);
  }
  const pathId = /\/business(?:es)?\/([a-f\d-]{36})(?:\/|$)/i.exec(
    url.pathname,
  )?.[1];
  if (pathId) ids.push(pathId);
  return ids.every((id) => id.toLowerCase() === businessId.toLowerCase());
}

export function beginRequestCapture(
  getUrl: () => string,
  method: string,
) {
  const active = authorization;
  if (!active || typeof window === "undefined" || !active.isCurrent())
    return null;

  let url: URL;
  try {
    url = new URL(getUrl(), window.location.href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!targetsCurrentBusiness(url, active.businessId)) return null;
  const scope = active;
  const description = describeRequest(url, active.apiTargets);
  const query = description.omission
    ? undefined
    : Array.from(url.searchParams)
        .slice(0, MAX_QUERY_PARAMS)
        .map(([key, value]): [string, string] => [
          key,
          value.slice(0, MAX_QUERY_VALUE_LENGTH),
        ]);
  const start = performance.now();
  const id = ++sequence;
  const entries = requestCaptureStore.getState().entries;
  const evicted = entries[MAX_ENTRIES - 1];
  if (evicted) bodyReaders.get(evicted.id)?.();
  requestCaptureStore.setState({
    entries: [
      {
        id,
        method: /^[a-z]{1,20}$/i.test(method) ? method.toUpperCase() : "HTTP",
        backend: description.backend,
        url: description.label.slice(0, 1024),
        startedAt: Date.now(),
        outcome: "pending",
        query,
      },
      ...entries.slice(0, MAX_ENTRIES - 1),
    ],
  });

  function isCurrent() {
    return (
      authorization?.key === scope.key &&
      scope.isCurrent() &&
      requestCaptureStore.getState().entries.some((entry) => entry.id === id)
    );
  }

  function setBody(body: Body) {
    if (isCurrent()) replaceEntry(id, { body });
  }

  function response(details: CapturedResponse) {
    if (!isCurrent()) return false;

    let omission = description.omission;
    if (!omission && details.finalUrl) {
      try {
        const finalUrl = new URL(details.finalUrl, window.location.origin);
        omission = targetsCurrentBusiness(finalUrl, scope.businessId)
          ? describeRequest(finalUrl, scope.apiTargets).omission
          : "Response belongs to another business";
      } catch {
        omission = "Response URL could not be verified";
      }
    }
    const reason =
      omission ??
      (details.status === 204 ||
      details.status === 205 ||
      method.toUpperCase() === "HEAD"
        ? "No response body"
        : responseOmission(details.contentType, details.contentLength));
    replaceEntry(id, {
      outcome: "response",
      status: details.status,
      durationMs: performance.now() - start,
      body: reason ? { omission: reason } : undefined,
    });
    return reason === null;
  }

  function fail(cancelled: boolean) {
    if (isCurrent())
      replaceEntry(id, {
        outcome: cancelled ? "cancelled" : "network-error",
        durationMs: performance.now() - start,
      });
  }

  async function readFetchBody(original: Response) {
    if (!isCurrent()) return;
    if (bodyReaders.size >= MAX_CONCURRENT_READS) {
      setBody({ omission: "Too many responses were being read at once" });
      return;
    }

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      reader = original.clone().body?.getReader();
      if (!reader) {
        setBody({ omission: "No response body" });
        return;
      }
      const bodyReader = reader;
      bodyReaders.set(id, () => {
        void bodyReader.cancel().catch(() => {});
      });
      const decoder = new TextDecoder();
      let length = 0;
      let text = "";
      while (isCurrent()) {
        const chunk = await reader.read();
        if (!isCurrent()) return;
        if (chunk.done) {
          text += decoder.decode();
          setBody(
            text
              ? prepareJson(JSON.parse(text))
              : { omission: "No response body" },
          );
          return;
        }
        length += chunk.value.byteLength;
        if (length > MAX_BODY_BYTES) {
          setBody({ omission: "Response exceeds 1 MiB" });
          return;
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
    } catch {
      setBody({ omission: "Response could not be read" });
    } finally {
      bodyReaders.delete(id);
      if (reader) void reader.cancel().catch(() => {});
    }
  }

  return { response, fail, setBody, readFetchBody };
}
