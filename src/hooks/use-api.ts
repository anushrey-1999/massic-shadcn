import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { useCallback, useState } from "react";
import Cookies from "js-cookie";
import { isTokenExpired } from "@/utils/jwt";
import { useAuthStore } from "@/store/auth-store";

export type ApiPlatform = "node" | "python" | "dotnet";
console.log(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, ')')

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
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  instance.interceptors.request.use(
    (config) => {
      const token = Cookies.get("token");

      if (token && isTokenExpired(token)) {
        // Token is expired
        useAuthStore.getState().logout();

        if (typeof window !== "undefined") {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }

        return Promise.reject(new Error("Token expired"));
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
        console.error(`API Error [${platform}]:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
        });
      } else if (error.request) {
        console.error(`API Request Error [${platform}]:`, error.request);
      } else {
        console.error(`API Error [${platform}]:`, error.message);
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
