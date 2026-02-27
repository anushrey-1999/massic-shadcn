import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { useCallback, useState } from "react";
import Cookies from "js-cookie";
import { decodeJwt, isTokenExpired } from "@/utils/jwt";
import { useAuthStore } from "@/store/auth-store";
import { useSessionStore } from "@/store/session-store";

export type ApiPlatform = "node" | "python" | "dotnet";
// Refresh only when close to expiry (standard SaaS behavior)
const REFRESH_WINDOW_SECONDS = 60 * 10 * 60; // 10 minutes
const REFRESH_COOLDOWN_MS = 60 * 1000; // at most once per minute

const DEFAULT_TIMEOUT_MS: Record<ApiPlatform, number> = {
  node: 120000,
  dotnet: 120000,
  python: 300000,
};

let refreshPromise: Promise<string | null> | null = null;
let lastRefreshAttemptAtMs = 0;

async function refreshNodeAccessToken(currentToken: string): Promise<string | null> {
  const baseURL = getBaseURLByPlatform("node");

  try {
    const response = await axios.post(
      `${baseURL}/auth/refresh-token`,
      { type: "REFRESH_TOKEN" },
      {
        headers: {
          "Content-Type": "application/json",
          Token: currentToken,
        },
        timeout: 30000,
      }
    );

    const data: any = response.data;
    const nextToken = data?.data?.token;
    if (!data?.success || !nextToken) {
      return null;
    }

    const { token, ...userData } = data.data;
    useAuthStore.getState().setAuth(token, userData);
    return token;
  } catch {
    return null;
  }
}

function getBaseURLByPlatform(platform: ApiPlatform): string {
  switch (platform) {
    case "node":
      return process.env.NEXT_PUBLIC_NODE_API_URL || "https://seedmain.seedinternaldev.xyz/api/1";
      // return 'http://localhost:4922/api/1'

    case "python":
      return process.env.NEXT_PUBLIC_PYTHON_API_URL || "https://infer.seedinternaldev.xyz/v1";

    case "dotnet":
      return process.env.NEXT_PUBLIC_DOTNET_API_URL || "https://seedcore.seedinternaldev.xyz/api";

    default:
      return "";
  }
}

function createAxiosInstance(platform: ApiPlatform): AxiosInstance {
  const baseURL = getBaseURLByPlatform(platform);

  const instance = axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT_MS[platform] ?? 30000,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
  });

  instance.interceptors.request.use(
    async (config) => {
      let token = Cookies.get("token");

      if (token && isTokenExpired(token)) {
        // Token is expired
        useAuthStore.getState().logout();

        if (typeof window !== "undefined") {
          const currentPath = `${window.location.pathname}${window.location.search || ""}`;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }

        return Promise.reject(new Error("Token expired"));
      }

      // Proactively refresh token before it expires (rolling session) to avoid sudden logout.
      // Skip refreshing on the refresh endpoint itself to avoid loops.
      if (platform === "node" && token && !String(config.url || "").includes("/refresh-token")) {
        const decoded = decodeJwt(token);
        const exp = decoded?.exp;
        if (typeof exp === "number") {
          const now = Math.floor(Date.now() / 1000);
          const secondsLeft = exp - now;

          if (secondsLeft > 0 && secondsLeft <= REFRESH_WINDOW_SECONDS) {
            const nowMs = Date.now();

            // Throttle refresh attempts to avoid loops when refresh endpoint is down.
            if (nowMs - lastRefreshAttemptAtMs < REFRESH_COOLDOWN_MS) {
              // Keep using existing token.
            } else {
              lastRefreshAttemptAtMs = nowMs;

              if (!refreshPromise) {
                refreshPromise = refreshNodeAccessToken(token).finally(() => {
                  refreshPromise = null;
                });
              }

              const refreshedToken = await refreshPromise;
              // If refresh fails but the token is still valid, do NOT force logout.
              // Let the request proceed and only logout on actual expiry/401.
              if (refreshedToken) {
                token = refreshedToken;
              }
            }
          }
        }
      }

      if (token && config.headers) {
        if (platform === "dotnet") {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          config.headers.Token = token;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );


  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response) {
        const url = error.config?.url || "";
        const status = error.response.status;

        // Handle 401 Unauthorized - show session expired dialog (only for node API)
        if (status === 401 && platform === "node") {
          useSessionStore.getState().setShowSessionExpiredDialog(true);
          Cookies.remove("token");
          useAuthStore.getState().logout();
        }

        // Don't log 404 errors for endpoints that have fallbacks (like timezones)
        const silent404Endpoints = ["/timezones"];
        const shouldSuppress404 = status === 404 && silent404Endpoints.some(endpoint => url.includes(endpoint));

        if (!shouldSuppress404) {
          console.log(`API Error [${platform}]:`, {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            url: error.config?.url,
          });
        }
      } else if (error.request) {
        // Network error - request was made but no response received
        // This typically indicates: CORS issue, network connectivity, server down, or timeout
        const errorInfo: Record<string, any> = {};

        // Core error information
        if (error.message) {
          errorInfo.message = error.message;
        }

        // Request configuration
        if (error.config) {
          const fullUrl = error.config.baseURL
            ? `${error.config.baseURL}${error.config.url || ''}`
            : error.config.url;
          errorInfo.fullUrl = fullUrl;
          errorInfo.method = error.config.method || 'GET';
          errorInfo.baseURL = error.config.baseURL;
          errorInfo.timeout = error.config.timeout;
        }

        // Request status (if available)
        if (error.request.status) {
          errorInfo.requestStatus = error.request.status;
        }

        // Detect common root causes
        const rootCause: string[] = [];
        if (error.message?.toLowerCase().includes('network error') ||
          error.message?.toLowerCase().includes('failed to fetch')) {
          rootCause.push('Network connectivity issue');
        }
        if (error.message?.toLowerCase().includes('cors') ||
          error.code === 'ERR_NETWORK') {
          rootCause.push('CORS (Cross-Origin) issue - API server may not allow requests from this domain');
        }
        if (error.message?.toLowerCase().includes('timeout') ||
          error.code === 'ECONNABORTED') {
          rootCause.push('Request timeout - server took too long to respond');
        }
        if (error.code === 'ERR_INTERNET_DISCONNECTED') {
          rootCause.push('No internet connection');
        }

        if (rootCause.length > 0) {
          errorInfo.possibleRootCauses = rootCause;
        }

        // Log with diagnostic information
        console.log(`API Request Error [${platform}]:`, {
          ...errorInfo,
          code: error.code,
          note: 'Request was sent but no response received. Check network tab for details.',
        });
      } else {
        console.log(`API Error [${platform}]:`, error.message);
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

async function request<T>(
  url: string,
  platform: ApiPlatform,
  options?: AxiosRequestConfig
): Promise<T> {
  const instance = createAxiosInstance(platform);
  const response = await instance.request<T>({
    url,
    ...options,
  });
  return response.data;
}

export const api = {
  get: <T = any>(url: string, platform: ApiPlatform, config?: AxiosRequestConfig) =>
    request<T>(url, platform, { ...config, method: "GET" }),

  post: <T = any>(url: string, platform: ApiPlatform, body?: any, config?: AxiosRequestConfig) =>
    request<T>(url, platform, { ...config, method: "POST", data: body }),

  put: <T = any>(url: string, platform: ApiPlatform, body?: any, config?: AxiosRequestConfig) =>
    request<T>(url, platform, { ...config, method: "PUT", data: body }),

  patch: <T = any>(url: string, platform: ApiPlatform, body?: any, config?: AxiosRequestConfig) =>
    request<T>(url, platform, { ...config, method: "PATCH", data: body }),

  delete: <T = any>(url: string, platform: ApiPlatform, config?: AxiosRequestConfig) =>
    request<T>(url, platform, { ...config, method: "DELETE" }),
};

export interface UseApiOptions {
  platform: ApiPlatform;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface UseApiReturn<T = any> {
  data: T | null;
  loading: boolean;
  error: AxiosError | null;
  execute: (endpoint: string, config?: AxiosRequestConfig) => Promise<T>;
  reset: () => void;
}

export function useApi<T = any>(options: UseApiOptions): UseApiReturn<T> {
  const { platform, headers: defaultHeaders, timeout } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const axiosInstance = useCallback(() => {
    const instance = createAxiosInstance(platform);
    if (timeout) {
      instance.defaults.timeout = timeout;
    }
    return instance;
  }, [platform, timeout]);

  const execute = useCallback(
    async (endpoint: string, config?: AxiosRequestConfig): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        const instance = axiosInstance();

        const headers = {
          ...defaultHeaders,
          ...config?.headers,
        };

        const response = await instance.request<T>({
          url: endpoint,
          headers,
          ...config,
        });

        setData(response.data);
        setLoading(false);
        return response.data;
      } catch (err) {
        const axiosError = err as AxiosError;
        setError(axiosError);
        setLoading(false);
        throw axiosError;
      }
    },
    [platform, defaultHeaders, axiosInstance]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}
