import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { beginRequestCapture } from "./request-capture";
import { MAX_BODY_BYTES, prepareJson } from "./request-privacy";

// Prefers the raw XHR text so the preview reflects the server response even if the
// caller mutates the parsed data before the deferred read runs.
function readBody(response: AxiosResponse) {
  const { responseType } = response.config;
  if (responseType && responseType !== "json" && responseType !== "text")
    return { omission: "Response is not readable JSON" };
  const request: unknown = response.request;
  const raw =
    typeof XMLHttpRequest !== "undefined" &&
    request instanceof XMLHttpRequest &&
    (request.responseType === "" || request.responseType === "text")
      ? request.responseText
      : typeof response.data === "string"
        ? response.data
        : undefined;
  if (raw === undefined) return prepareJson(response.data);
  if (
    raw.length > MAX_BODY_BYTES ||
    new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES
  )
    return { omission: "Response exceeds 1 MiB" };
  return raw ? prepareJson(JSON.parse(raw)) : { omission: "No response body" };
}

export function observeAxiosRequests(instance: AxiosInstance) {
  const pending = new WeakMap<
    InternalAxiosRequestConfig,
    NonNullable<ReturnType<typeof beginRequestCapture>>
  >();

  instance.interceptors.request.use(
    (config) => {
      // Only Axios should invoke a caller's custom serializer.
      if (config.params && config.paramsSerializer) return config;
      try {
        const capture = beginRequestCapture(
          () => instance.getUri(config),
          config.method ?? "GET",
        );
        if (capture) pending.set(config, capture);
      } catch {}
      return config;
    },
    undefined,
    { synchronous: true },
  );

  function record(response: AxiosResponse) {
    let capture: ReturnType<typeof pending.get>;
    try {
      capture = pending.get(response.config);
      if (
        !capture?.response({
          status: response.status,
          contentType: String(response.headers["content-type"] ?? ""),
          contentLength: String(response.headers["content-length"] ?? ""),
          finalUrl: response.request?.responseURL,
        })
      )
        return;
    } catch {
      return;
    }
    const body = capture;
    // Interceptors run before the caller sees the response, so body work waits a task.
    setTimeout(() => {
      try {
        body.setBody(readBody(response));
      } catch {
        try {
          body.setBody({ omission: "Response could not be read" });
        } catch {}
      }
    }, 0);
  }

  instance.interceptors.response.use(
    (response) => {
      record(response);
      return response;
    },
    (error) => {
      try {
        if (error?.response) record(error.response);
        else if (error?.config)
          pending.get(error.config)?.fail(axios.isCancel(error));
      } catch {}
      return Promise.reject(error);
    },
  );
}

// Used for direct calls with their own headers, including signed uploads.
export const appAxios = axios.create();
observeAxiosRequests(appAxios);
