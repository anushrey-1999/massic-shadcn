"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { getAdminSession } from "../api/admin-api";

export function AdminAuthBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const hydrate = useAuthStore((state) => state.hydrate);
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
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
    if (isLogin && session.isSuccess && session.data.data.user)
      router.replace("/admin");
    if (hydrated && !isLogin && !isAuthenticated)
      router.replace("/admin/login");
    if (!isLogin && session.isError) router.replace("/admin/login");
  }, [
    hydrated,
    isAuthenticated,
    isLogin,
    router,
    session.data,
    session.isError,
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
          <Button
            className="mt-4"
            onClick={() => router.replace("/admin/login")}
          >
            Return to sign in
          </Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
