"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ADMIN_UNAUTHORIZED_EVENT } from "../api/admin-client";
import { getAdminSession } from "../api/admin-api";
import { useAdminAuthStore } from "./admin-auth-store";

export function AdminAuthBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const hydrate = useAdminAuthStore((state) => state.hydrate);
  const clearAdminAuth = useAdminAuthStore((state) => state.clear);
  const setUser = useAdminAuthStore((state) => state.setUser);
  const token = useAdminAuthStore((state) => state.token);
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated);
  const isLogin = pathname === "/admin/login";
  const session = useQuery({
    queryKey: ["admin", "session", token],
    queryFn: getAdminSession,
    enabled: hydrated && isAuthenticated && Boolean(token),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.removeQueries({ queryKey: ["admin"] });
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [queryClient]);

  useEffect(() => {
    const user = session.data?.data.user;
    if (user) setUser(user);
  }, [session.data, setUser]);

  useEffect(() => {
    if (isLogin && session.isSuccess && session.data.data.user)
      router.replace("/admin");
    if (hydrated && !isLogin && !isAuthenticated)
      router.replace("/admin/login");
  }, [
    hydrated,
    isAuthenticated,
    isLogin,
    router,
    session.data,
    session.isSuccess,
  ]);

  if (isLogin) {
    if (
      !hydrated ||
      (isAuthenticated &&
        (session.isLoading || session.isPending || session.isSuccess))
    ) {
      return (
        <div
          className="admin-page-surface flex min-h-screen items-center justify-center"
          role="status"
        >
          <div className="flex items-center gap-3 text-sm text-general-muted-foreground">
            <Loader2 className="size-4 animate-spin" />{" "}
            {session.isSuccess
              ? "Opening admin dashboard…"
              : "Checking existing admin session…"}
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }
  if (!hydrated || !isAuthenticated || session.isLoading || session.isPending) {
    return (
      <div
        className="admin-page-surface flex min-h-screen items-center justify-center"
        role="status"
      >
        <div className="flex items-center gap-3 text-sm text-general-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Verifying admin access…
        </div>
      </div>
    );
  }
  if (session.isError || !session.data?.data.user) {
    return (
      <div className="admin-page-surface flex min-h-screen items-center justify-center p-4">
        <div className="admin-panel admin-page-enter max-w-sm rounded-lg border p-6 text-center">
          <AlertTriangle className="mx-auto size-6 text-destructive" />
          <p className="mt-3 text-sm">Admin access could not be verified.</p>
          <p className="mt-1 text-xs text-general-muted-foreground">
            Check the connection and retry, or sign in again with an authorized
            account.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => session.refetch()}>
              Retry
            </Button>
            <Button
              onClick={() => {
                clearAdminAuth();
                queryClient.removeQueries({ queryKey: ["admin"] });
                router.replace("/admin/login");
              }}
            >
              Sign in again
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
