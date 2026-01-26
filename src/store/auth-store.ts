import { create } from "zustand";
import Cookies from "js-cookie";
import { decodeJwt } from "@/utils/jwt";

const TOKEN_KEY = "token";
const USER_KEY = "user";

interface User {
  id?: string;
  email?: string;
  username?: string;
  uniqueId?: string;
  UniqueId?: string;
  roleid?: number;
  rolename?: string;
  isTeamMember?: boolean;
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user?: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  setAuth: (token: string, user?: User) => {
    const decoded = decodeJwt(token);
    const expires = decoded?.exp ? new Date(decoded.exp * 1000) : undefined;

    Cookies.set(TOKEN_KEY, token, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      ...(expires ? { expires } : {}),
    });
    if (user) {
      Cookies.set(USER_KEY, JSON.stringify(user), {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        ...(expires ? { expires } : {}),
      });
    }
    set({
      token,
      user: user || null,
      isAuthenticated: true,
    });
  },
  logout: () => {
    Cookies.remove(TOKEN_KEY, { path: "/" });
    Cookies.remove(USER_KEY, { path: "/" });
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },
  hydrate: () => {
    const token = Cookies.get(TOKEN_KEY);
    const userStr = Cookies.get(USER_KEY);
    let user: User | null = null;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        user = null;
      }
    }
    set({
      token: token || null,
      user,
      isAuthenticated: !!token,
    });
  },
}));

