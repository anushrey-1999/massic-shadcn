"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminGoogleLogin } from "../api/admin-api";
import { useAdminAuthStore } from "./admin-auth-store";

export function AdminLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAdminAuthStore((state) => state.setAuth);
  const [message, setMessage] = useState<string | null>(null);
  const login = useMutation({
    mutationFn: (credential: string) => adminGoogleLogin(credential),
    onSuccess: (response) => {
      if (!response.success || !response.data?.token) {
        setMessage(
          response.message || "Admin sign-in did not return a valid session.",
        );
        return;
      }
      queryClient.removeQueries({ queryKey: ["admin", "session"] });
      setAuth(response.data.token, null);
      toast.success("Admin access confirmed");
      router.replace("/admin");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) =>
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Admin sign-in failed.",
      ),
  });

  const handleSuccess = (response: CredentialResponse) => {
    if (!response.credential) {
      setMessage("Google did not return a credential. Please try again.");
      return;
    }
    setMessage(null);
    login.mutate(response.credential);
  };

  const hasClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  return (
    <main className="admin-page-surface relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute -left-24 top-1/4 size-72 rounded-full bg-general-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-1/4 size-64 rounded-full bg-general-primary-gradient-to/15 blur-3xl"
        aria-hidden="true"
      />
      <section
        className="admin-panel admin-page-enter relative w-full max-w-[420px] rounded-lg border p-6 sm:p-8"
        aria-labelledby="admin-login-title"
      >
        <div className="mb-6 flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-general-primary/10 to-general-primary-gradient-to/20 text-general-primary shadow-xs">
          <ShieldCheck className="size-5" strokeWidth={1.5} />
        </div>
        <h1
          id="admin-login-title"
          className="text-[18px] font-medium text-general-foreground"
        >
          Massic admin
        </h1>
        <p className="mt-2 text-sm leading-5 text-general-muted-foreground">
          Sign in with a Google account that has been granted super-admin
          access.
        </p>

        <div className="mt-6 min-h-10">
          {login.isPending ? (
            <div
              className="flex h-10 items-center justify-center gap-2 rounded-md border border-general-primary/15 bg-general-primary/5 text-sm text-general-muted-foreground"
              role="status"
            >
              <Loader2 className="size-4 animate-spin" /> Checking access…
            </div>
          ) : hasClientId ? (
            <div className="flex min-h-10 justify-center">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() =>
                  setMessage(
                    "Google sign-in was cancelled or failed. Please try again.",
                  )
                }
              />
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Google sign-in is not configured for this environment.
            </div>
          )}
        </div>

        {message && (
          <div
            className="mt-4 flex gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        <p className="mt-6 border-t border-general-border pt-4 text-xs leading-5 text-general-muted-foreground">
          Access is read-only and revalidated for every admin request. Contact a
          backend operator if access has not been granted.
        </p>
      </section>
    </main>
  );
}
