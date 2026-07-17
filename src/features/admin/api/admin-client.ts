"use client";

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import Cookies from "js-cookie";
import { getBaseURLByPlatform } from "@/hooks/use-api";
import { shouldRefreshSession } from "@/lib/session-refresh";
import { isTokenExpired } from "@/utils/jwt";
import {
  ADMIN_TOKEN_COOKIE,
  useAdminAuthStore,
} from "../auth/admin-auth-store";

export const ADMIN_UNAUTHORIZED_EVENT = "massic:admin-session-unauthorized";

export interface AdminRequestConfig extends AxiosRequestConfig {
  skipAdminAuth?: boolean;
}

interface AdminTokenEnvelope {
  success: boolean;
  data?: { token?: string; user?: unknown };
}

const REFRESH_COOLDOWN_MS = 60 * 1000;
let refreshPromise: Promise<string | null> | null = null;
let lastRefreshAttemptAt = 0;

function notifyAdminUnauthorized() {
  useAdminAuthStore.getState().clear();
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT));
  if (window.location.pathname !== "/admin/login") {
    const redirect = `${window.location.pathname}${window.location.search}`;
    window.location.assign(
      `/admin/login?redirect=${encodeURIComponent(redirect)}`,
    );
  }
}

async function refreshAdminToken(currentToken: string) {
  try {
    const response = await axios.post<AdminTokenEnvelope>(
      `${getBaseURLByPlatform("node")}/admin/auth/refresh`,
      {},
      {
        headers: { "Content-Type": "application/json", Token: currentToken },
        timeout: 30_000,
      },
    );
    const nextToken = response.data?.data?.token;
    if (!response.data?.success || !nextToken) return null;

    useAdminAuthStore.getState().setAuth(nextToken);
    return nextToken;
  } catch {
    return null;
  }
}

function createAdminAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: getBaseURLByPlatform("node"),
    timeout: 120_000,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  instance.interceptors.request.use(async (config) => {
    if ((config as AdminRequestConfig).skipAdminAuth) return config;

    let token = Cookies.get(ADMIN_TOKEN_COOKIE);
    if (token && isTokenExpired(token)) {
      notifyAdminUnauthorized();
      return Promise.reject(new Error("Admin token expired"));
    }

    if (
      token &&
      !String(config.url || "").includes("/admin/auth/refresh") &&
      shouldRefreshSession(token)
    ) {
      const now = Date.now();
      if (refreshPromise) {
        token = (await refreshPromise) || token;
      } else if (now - lastRefreshAttemptAt >= REFRESH_COOLDOWN_MS) {
        lastRefreshAttemptAt = now;
        refreshPromise = refreshAdminToken(token).finally(() => {
          refreshPromise = null;
        });
        token = (await refreshPromise) || token;
      }
    }

    if (token && config.headers) config.headers.Token = token;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (
        (error.response?.status === 401 || error.response?.status === 403) &&
        !(error.config as AdminRequestConfig | undefined)?.skipAdminAuth
      ) {
        notifyAdminUnauthorized();
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

async function request<T>(url: string, options: AdminRequestConfig) {
  const response = await createAdminAxiosInstance().request<T>({
    url,
    ...options,
  });
  return response.data;
}

export const adminClient = {
  get: <T>(url: string, config: AdminRequestConfig = {}) =>
    request<T>(url, { ...config, method: "GET" }),
  post: <T>(url: string, body?: unknown, config: AdminRequestConfig = {}) =>
    request<T>(url, { ...config, method: "POST", data: body }),
  download: <T = Blob>(
    url: string,
    config: AdminRequestConfig = {},
  ): Promise<AxiosResponse<T>> =>
    createAdminAxiosInstance().request<T>({
      url,
      ...config,
      method: "GET",
      responseType: "blob",
    }),
};
