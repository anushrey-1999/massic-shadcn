import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user?: User) => void;
  logout: () => void;
}

// arguments should always be an object

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token: string, user?: User) => {
        // Store token in localStorage (for API interceptor)
        if (typeof window !== "undefined") {
          localStorage.setItem("token", token);
        }
        set({
          token,
          user: user || null,
          isAuthenticated: true,
        });
      },
      logout: () => {
        // Remove token from localStorage
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-storage",
      // Only persist token and user, not isAuthenticated (derived from token)
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      // Set isAuthenticated when store is rehydrated from storage
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          state.isAuthenticated = true;
          // Ensure token is in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("token", state.token);
          }
        }
      },
    }
  )
);

