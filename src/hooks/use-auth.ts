import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./use-api";
import { useAuthStore } from "@/store/auth-store";

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
}

export interface GoogleLoginCredentials {
  token: string;
}

interface ApiLoginResponse {
  success: boolean;
  message: string;
  data: {
    token?: string;
    id?: string;
    email?: string;
    username?: string;
    userName?: string;
    uniqueId?: string;
    roleid?: number;
    rolename?: string;
    userNotFound?: boolean;
    googleUserDetails?: {
      email: string;
      firstName?: string;
      lastName?: string;
    };
    [key: string]: any;
  };
}

interface LoginResponse {
  token: string;
  user: {
    id?: string;
    email?: string;
    username?: string;
    userName?: string;
    uniqueId?: string;
    roleid?: number;
    rolename?: string;
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

      // The API returns user data directly in response.data (not response.data.user)
      const { token, ...userData } = response.data;

      return {
        token,
        user: userData,
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

interface GoogleLoginResponse {
  token: string;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  };
  userNotFound?: boolean;
  googleUserDetails?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export function useGoogleLogin() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation<GoogleLoginResponse, Error, GoogleLoginCredentials>({
    mutationFn: async (data: GoogleLoginCredentials) => {
      const response = await api.post<ApiLoginResponse>("/google-login", "node", {
        token: data.token,
      });

      if (!response.success) {
        if (response.data?.userNotFound) {
          const error = new Error("User not found");
          (error as any).userNotFound = true;
          (error as any).googleUserDetails = response.data.googleUserDetails;
          throw error;
        }
        const error = new Error(response.message || "Google login failed");
        (error as any).response = { data: response };
        throw error;
      }

      if (!response.data?.token) {
        throw new Error("Token not found in response");
      }

      // Extract token and user data the same way as useLogin
      const { token, ...userData } = response.data;

      return {
        token,
        user: userData,
      };
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export interface SignupCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgName: string;
  website: string;
  userType: "AGENCY" | "BUSINESS";
  signupMethod: "EMAIL" | "GOOGLE";
  googleToken?: string;
}

interface ApiSignupResponse {
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
    [key: string]: any;
  };
}

interface SignupResponse {
  token: string;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  };
}

export function useSignup() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation<SignupResponse, Error, SignupCredentials>({
    mutationFn: async (data: SignupCredentials) => {
      const response = await api.post<ApiSignupResponse>(
        "/signup-with-type",
        "node",
        data
      );

      if (!response.success) {
        const error = new Error(response.message || "Signup failed");
        (error as any).response = { data: response };
        throw error;
      }

      if (!response.data?.token) {
        throw new Error("Token not found in response");
      }

      return {
        token: response.data.token,
        user: response.data.user || response.data,
      };
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
