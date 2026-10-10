"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { BarChart3, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { api } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AuthorizationRequest = {
  clientName: string;
  clientId: string;
  scopes: string[];
  resource: string;
  expiresAt: string;
};

function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return "This authorization request could not be loaded.";
  const payload = error.response?.data as { message?: string; error_description?: string } | undefined;
  return payload?.message || payload?.error_description || "This authorization request is invalid or expired.";
}

function AuthorizeMcpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestValue = searchParams.get("request") || "";
  const { hydrate, isAuthenticated, token, user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  const returnPath = useMemo(
    () => `/mcp/authorize?request=${encodeURIComponent(requestValue)}`,
    [requestValue]
  );

  useEffect(() => {
    if (!hydrated || !requestValue) return;
    if (!token && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(returnPath)}`);
    }
  }, [hydrated, isAuthenticated, requestValue, returnPath, router, token]);

  const requestQuery = useQuery({
    queryKey: ["mcp-oauth-authorization-request", requestValue],
    queryFn: () =>
      api.get<{ request: AuthorizationRequest }>(
        `/mcp/oauth/authorization-requests/${encodeURIComponent(requestValue)}`,
        "node",
        { suppressUnauthorizedSession: true }
      ),
    enabled: Boolean(requestValue && token),
    retry: false,
  });

  const consentMutation = useMutation({
    mutationFn: (approved: boolean) =>
      api.post<{ redirectUrl: string }>("/mcp/oauth/consent", "node", {
        request: requestValue,
        approved,
      }),
    onSuccess: ({ redirectUrl }) => {
      window.location.assign(redirectUrl);
    },
  });

  if (!requestValue) {
    return (
      <AuthorizationShell>
        <ErrorState message="The authorization link is incomplete." />
      </AuthorizationShell>
    );
  }

  if (!hydrated || !token || requestQuery.isLoading) {
    return (
      <AuthorizationShell>
        <div className="flex min-h-52 items-center justify-center" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin text-general-muted-foreground" />
          <span className="sr-only">Loading authorization request</span>
        </div>
      </AuthorizationShell>
    );
  }

  if (requestQuery.isError || !requestQuery.data?.request) {
    return (
      <AuthorizationShell>
        <ErrorState message={errorMessage(requestQuery.error)} />
      </AuthorizationShell>
    );
  }

  const request = requestQuery.data.request;
  const workspace = user?.organzationName || user?.username || user?.email || "your Massic workspace";

  return (
    <AuthorizationShell>
      <CardHeader className="space-y-4 border-b border-general-border px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-general-secondary">
            <ShieldCheck className="h-5 w-5 text-general-foreground" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg font-medium text-general-foreground">
              Connect {request.clientName} to Massic?
            </CardTitle>
            <p className="mt-1 text-sm text-general-muted-foreground">
              Signed in as {user?.email || "a Massic user"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-6 py-5">
        <div>
          <p className="text-sm font-medium text-general-foreground">This connection can</p>
          <div className="mt-3 flex gap-3 rounded-lg border border-general-border bg-general-secondary/50 p-4">
            <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-general-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm text-general-foreground">Read analytics for {workspace}</p>
              <p className="mt-1 text-sm text-general-muted-foreground">
                Includes stored GSC and GA4 metrics for businesses this Massic account can access,
                for periods up to 16 months.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Requested permissions">
          <Badge variant="secondary" className="gap-1.5">
            <Check className="h-3 w-3" aria-hidden="true" />
            Read only
          </Badge>
          <Badge variant="secondary">Account scoped</Badge>
          <Badge variant="secondary">Revocable</Badge>
        </div>

        <p className="text-xs leading-5 text-general-muted-foreground">
          The AI client will never receive your Massic password. You can disconnect it later by
          revoking its access in Massic. This permission cannot edit Massic data or Google connections.
        </p>

        {consentMutation.isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
            {errorMessage(consentMutation.error)}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={consentMutation.isPending}
            onClick={() => consentMutation.mutate(false)}
          >
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Deny
          </Button>
          <Button
            type="button"
            disabled={consentMutation.isPending}
            onClick={() => consentMutation.mutate(true)}
          >
            {consentMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {consentMutation.isPending ? "Connecting" : "Allow and connect"}
          </Button>
        </div>
      </CardContent>
    </AuthorizationShell>
  );
}

function AuthorizationShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-general-primary-foreground p-4 sm:p-8">
      <Card className="w-full max-w-xl overflow-hidden rounded-lg border border-general-border bg-white shadow-xs">
        {children}
      </Card>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="space-y-3 px-6 py-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
        <X className="h-5 w-5 text-destructive" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-medium text-general-foreground">Unable to connect</h1>
      <p className="text-sm text-general-muted-foreground">{message}</p>
    </div>
  );
}

export default function McpAuthorizePage() {
  return (
    <Suspense
      fallback={
        <AuthorizationShell>
          <div className="flex min-h-52 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-general-muted-foreground" />
          </div>
        </AuthorizationShell>
      }
    >
      <AuthorizeMcpClient />
    </Suspense>
  );
}
