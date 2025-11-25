import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./use-api";
import { useAuthStore } from "@/store/auth-store";

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
}

interface ApiLoginResponse {
  success: boolean;
  message: string;
  data: {
    token?: string;
    user?: {
      id?: string;
      email?: string;
      username?: string;
      [key: string]: any;
    };
    userNotFound?: boolean;
    [key: string]: any;
  };
}

interface LoginResponse {
  token: string;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  };
}

export function useLogin() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: async (data: LoginCredentials) => {
      // arguments should always be an object - IMP 
      const response = await api.post<ApiLoginResponse>("/login", "node", data);
      
      // Check if the API returned success: false
      if (!response.success) {
        // Throw an error with the message from the API
        const error = new Error(response.message || "Login failed");
        // Attach the response to the error for potential use in error handling
        (error as any).response = { data: response };
        throw error;
      }
      
      // Extract token and user from the data field
      if (!response.data?.token) {
        throw new Error("Token not found in response");
      }
      
      return {
        token: response.data.token,
        user: response.data.user,
      };
    },
    onSuccess: (data) => {
      // Save token and user data to auth store
      setAuth(data.token, data.user);
      // Invalidate auth-related queries
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

interface ApiLogoutResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export function useLogout() {
  const qc = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      try {
        const response = await api.post<ApiLogoutResponse>("/logout", "node");
        
        // For logout, we don't need to throw errors even if success is false
        // We'll still clear local state regardless of API response
        // Common case: API returns success: false with "No Token Found" - this is fine for logout
        if (!response.success) {
          // Silently handle "No Token Found" or other auth errors - these are expected during logout
          if (response.message?.includes("No Token Found") || response.message?.includes("UnAuthorized")) {
            // This is expected - token might already be cleared or expired
          } else {
            console.warn("Logout API returned success: false", response.message);
          }
        }
        
        return response;
      } catch (error: any) {
        // If the API returns an HTTP error (401, 403, etc.), that's also fine for logout
        // We'll still clear local state. Don't re-throw the error.
        const errorMessage = error?.response?.data?.message || error?.message;
        if (errorMessage?.includes("No Token Found") || errorMessage?.includes("UnAuthorized")) {
          // Expected during logout - token might already be cleared
        } else {
          console.warn("Logout API error (will still clear local state):", errorMessage);
        }
        // Return a mock success response so onSuccess is called
        return { success: true, message: "Local logout completed" };
      }
    },
    onSuccess: () => {
      // Always clear auth data from store, regardless of API response
      logout();
      // Invalidate all auth-related queries
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: () => {
      // Fallback: Even if everything fails, clear local auth state
      logout();
      // Invalidate all auth-related queries
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
