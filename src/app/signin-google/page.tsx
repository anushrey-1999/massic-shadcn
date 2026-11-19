"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle } from "lucide-react";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { api } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

type CallbackStatus = "loading" | "success" | "error";

function getSafeReturnPath(state: string | null) {
  if (!state) return "/settings";
  try {
    const parsed = JSON.parse(window.atob(state)) as { returnTo?: string };
    return parsed.returnTo?.startsWith("/") ? parsed.returnTo : "/settings";
  } catch {
    return "/settings";
  }
}

interface StoreAuthPayload {
  UserUniqueId: string;
  AuthCode: string;
  RedirectUri: string;
  Name: string;
  Email: string;
  WebSite: string;
}

interface RefreshTokenResponse {
  success: boolean;
  data?: {
    token: string;
    [key: string]: any;
  };
  message?: string;
}

function GoogleCallbackContent() {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processingRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setAuth } = useAuthStore();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      // If we are already processing or succeeded or failed, don't do anything
      if (processingRef.current || status === "success" || status === "error") return;

      const code = searchParams.get("code");
      const returnTo = getSafeReturnPath(searchParams.get("state"));

      if (!code) {
        setStatus("error");
        setErrorMessage("Authorization code not found");
        toast.error("Authorization code not found");
        return;
      }

      // Vital check: If we don't have a user in the store yet...
      if (!user) {
        // ...but we HAVE a token in cookies, it means we are just waiting for hydration.
        // So we strictly RETURN here and wait for the store to update (triggering useEffect again).
        const token = Cookies.get("token");
        if (token) {
          // Just wait.
          return;
        }

        // If no user AND no token, then we really are not authenticated.
        setStatus("error");
        setErrorMessage("User not authenticated. Please log in first.");
        toast.error("User not authenticated");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      // Currently processing...
      processingRef.current = true;

      try {
        const userUniqueId = user.uniqueId || user.UniqueId || user.id;
        const redirectUri = `${window.location.origin}/signin-google`;

        const payload: StoreAuthPayload = {
          UserUniqueId: userUniqueId || "",
          AuthCode: code,
          RedirectUri: redirectUri,
          Name: user.name || user.username || "Agency",
          Email: user.email || "",
          WebSite: user.website || "",
        };

        const response = await api.post<{ success: boolean; message?: string }>(
          "/agency/store-auth",
          "node",
          payload
        );

        if (!response.success) {
          throw new Error(response.message || "Failed to connect Google account");
        }

        // Refresh token to get updated user data with new agency details
        const refreshResponse = await api.post<RefreshTokenResponse>(
          "/auth/refresh-token",
          "node",
          { type: "REFRESH_TOKEN" }
        );

        if (refreshResponse.success && refreshResponse.data?.token) {
          setAuth(refreshResponse.data.token, refreshResponse.data);
        }

        setStatus("success");
        toast.success("Google account connected successfully!");

        setTimeout(() => {
          router.replace(returnTo);
        }, 800);

      } catch (error: any) {
        console.error("Error in Google callback:", error);
        setStatus("error");
        setErrorMessage(error.message || "Failed to connect Google account");
        toast.error(error.message || "Failed to connect Google account");
        // Reset processing so they can try again if it was a transient error? 
        // Or keep it true? Usually for auth callbacks, a refresh is cleaner.
        // We'll leave it true to prevent automatic retries that might span constantly.
      }
    };

    handleGoogleCallback();
  }, [searchParams, user, router, setAuth, status]);

  return (
    <div className="max-w-md w-full mx-auto p-8 text-center">
      {status === "loading" && (
        <>
          <MassicAmoebaLoader
            size={52}
            label="Connecting your Google account"
            className="mx-auto mb-6"
          />
          <h1 className="mb-2 text-xl font-medium">
            Connecting your Google account...
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            Please wait while we securely link your Google account to your workspace.
          </p>
          <p className="text-muted-foreground text-xs italic">
            Please do not close this window or navigate away.
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-6" />
          <h1 className="mb-2 text-xl font-medium">
            Connection Successful!
          </h1>
          <p className="text-muted-foreground text-sm">
            Taking you back...
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-6" />
          <h1 className="mb-2 text-xl font-medium text-destructive">
            Connection Failed
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            {errorMessage}
          </p>
          <button
            onClick={() =>
              router.replace(getSafeReturnPath(searchParams.get("state")))
            }
            className="text-primary underline text-sm hover:no-underline"
          >
            Go back
          </button>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-md w-full mx-auto p-8 text-center">
      <MassicAmoebaLoader
        size={52}
        label="Loading Google connection"
        className="mx-auto mb-6"
      />
      <h1 className="mb-2 text-xl font-medium">Loading...</h1>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Suspense fallback={<LoadingFallback />}>
        <GoogleCallbackContent />
      </Suspense>
    </div>
  );
}
