"use client";

import Cookies from "js-cookie";
import { create } from "zustand";
import { decodeJwt } from "@/utils/jwt";
import type { AdminSessionUser } from "../types";

export const ADMIN_TOKEN_COOKIE = "admin_token";
const ADMIN_COOKIE_PATH = "/admin";

interface AdminAuthState {
  token: string | null;
  user: AdminSessionUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user?: AdminSessionUser | null) => void;
  setUser: (user: AdminSessionUser) => void;
  clear: () => void;
  hydrate: () => void;
}

function adminCookieOptions(token?: string) {
  const expiresAt = token ? decodeJwt(token)?.exp : undefined;
  const isLocalHttp =
    typeof window !== "undefined" &&
    window.location.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  return {
    path: ADMIN_COOKIE_PATH,
    sameSite: "lax" as const,
    secure: !isLocalHttp,
    ...(expiresAt ? { expires: new Date(expiresAt * 1000) } : {}),
  };
}

export const useAdminAuthStore = create<AdminAuthState>()((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  setAuth: (token, user) => {
    Cookies.set(ADMIN_TOKEN_COOKIE, token, adminCookieOptions(token));
    set((state) => ({
      token,
      user: user === undefined ? state.user : user,
      isAuthenticated: true,
    }));
  },
  setUser: (user) => set({ user }),
  clear: () => {
    Cookies.remove(ADMIN_TOKEN_COOKIE, { path: ADMIN_COOKIE_PATH });
    set({ token: null, user: null, isAuthenticated: false });
  },
  hydrate: () => {
    const token = Cookies.get(ADMIN_TOKEN_COOKIE) || null;
    set({ token, user: null, isAuthenticated: Boolean(token) });
  },
}));
