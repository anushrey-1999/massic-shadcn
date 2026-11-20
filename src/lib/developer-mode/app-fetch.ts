import { beginRequestCapture } from "./request-capture";

export function appFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = input instanceof Request ? input : undefined;
  let capture: ReturnType<typeof beginRequestCapture> = null;
  // Diagnostics are best effort and must never change the caller’s request.
  try {
    capture = beginRequestCapture(
      () => request?.url ?? String(input),
      init?.method ?? request?.method ?? "GET",
    );
  } catch {}

  const result = fetch(input, init);
  if (!capture) return result;
  const record = capture;
  return result.then(
    (response) => {
      try {
        if (
          record.response({
            status: response.status,
            contentType: response.headers.get("content-type") ?? "",
            contentLength: response.headers.get("content-length"),
            finalUrl: response.url,
          })
        ) {
          void record.readFetchBody(response).catch(() => {});
        }
      } catch {}
      return response;
    },
    (error) => {
      try {
        const signal =
          init?.signal === undefined ? request?.signal : init.signal;
        record.fail(
          Boolean(signal?.aborted) ||
            (error instanceof Error && error.name === "AbortError"),
        );
      } catch {}
      throw error;
    },
  );
}
