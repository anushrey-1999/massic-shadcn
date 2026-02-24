"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthStore } from "@/store/auth-store";
import { useBusinessProfiles } from "@/hooks/use-business-profiles";
import {
  useApproveWordpressOauth,
  useWordpressOauthSession,
} from "@/hooks/use-wordpress-connector";
import { cn } from "@/lib/utils";

function WordpressConnectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const hasTokenCookie = React.useMemo(() => {
    if (typeof document === "undefined") return false;
    return document.cookie.split(";").some((part) => part.trim().startsWith("token="));
  }, []);

  const sessionId = searchParams.get("sessionId");
  const effectiveSessionId = sessionId && (isAuthenticated || hasTokenCookie) ? sessionId : null;
  const sessionQuery = useWordpressOauthSession(effectiveSessionId);
  const approveMutation = useApproveWordpressOauth();
  const { profiles, sidebarDataLoading } = useBusinessProfiles();

  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string>("");
  const [businessSelectOpen, setBusinessSelectOpen] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated || hasTokenCookie) return;

    const currentPath = typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/wordpress/connect";

    router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }, [hasTokenCookie, isAuthenticated, router]);

  React.useEffect(() => {
    const sessionBusinessId = sessionQuery.data?.businessId;
    if (sessionBusinessId) {
      setSelectedBusinessId(String(sessionBusinessId));
      return;
    }

    if (!selectedBusinessId && profiles.length > 0) {
      setSelectedBusinessId(String(profiles[0].UniqueId));
    }
  }, [profiles, selectedBusinessId, sessionQuery.data?.businessId]);

  const handleApprove = async () => {
    if (!sessionId || !selectedBusinessId) return;

    const response = await approveMutation.mutateAsync({
      sessionId,
      businessId: selectedBusinessId,
    });

    const redirectUrl = response?.data?.redirectUrl;
    if (redirectUrl) {
      window.location.assign(redirectUrl);
    }
  };

  const handleCancel = () => {
    const returnUrl = sessionQuery.data?.returnUrl;
    if (returnUrl) {
      window.location.assign(returnUrl);
      return;
    }

    router.replace("/");
  };

  if (!sessionId) {
    return (
      <div className="mx-auto mt-20 max-w-xl rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Missing connect session</h1>
        <p className="mt-2 text-sm text-muted-foreground">Start connect from the WordPress plugin page.</p>
      </div>
    );
  }

  if (sessionQuery.isLoading || sidebarDataLoading) {
    return (
      <div className="mx-auto mt-20 max-w-xl rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading WordPress connect request...</p>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="mx-auto mt-20 max-w-xl rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Connect request unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(sessionQuery.error as Error)?.message || "The WordPress connect session is invalid or expired."}
        </p>
      </div>
    );
  }

  const session = sessionQuery.data;

  return (
    <div className="mx-auto mt-14 max-w-2xl rounded-lg border bg-card p-6">
      <h1 className="text-xl font-semibold text-general-foreground">Authorize WordPress Connection</h1>
      <p className="mt-1 text-sm text-general-muted-foreground">
        Approve this WordPress site to connect with a business in Massic.
      </p>

      <div className="mt-4 space-y-2 rounded-md border bg-background p-4 text-sm">
        <p><span className="font-medium">Site URL:</span> {session.siteUrl}</p>
        <p><span className="font-medium">Site ID:</span> {session.siteId}</p>
        <p><span className="font-medium">Session Expires At:</span> {new Date(session.expiresAt).toLocaleString()}</p>
      </div>

      <div className="mt-4">
        <label htmlFor="business-select" className="mb-2 block text-sm font-medium text-general-foreground">
          Select Business
        </label>
        <Popover open={businessSelectOpen} onOpenChange={setBusinessSelectOpen}>
          <PopoverTrigger asChild>
            <Button
              id="business-select"
              variant="outline"
              role="combobox"
              aria-expanded={businessSelectOpen}
              aria-label="Select business"
              className={cn(
                "w-full justify-between font-normal",
                !selectedBusinessId && "text-general-muted-foreground"
              )}
            >
              {selectedBusinessId
                ? profiles.find((p) => p.UniqueId === selectedBusinessId)?.DisplayName ||
                  profiles.find((p) => p.UniqueId === selectedBusinessId)?.Name ||
                  "Select business"
                : "Select business"}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search business..." className="h-9" />
              <CommandList className="max-h-[280px]">
                <CommandEmpty>
                  {profiles.length === 0 ? "No businesses available" : "No business found."}
                </CommandEmpty>
                <CommandGroup>
                  {profiles.map((profile) => {
                    const label = profile.DisplayName || profile.Name || profile.UniqueId;
                    const isSelected = selectedBusinessId === profile.UniqueId;
                    return (
                      <CommandItem
                        key={profile.UniqueId}
                        value={label}
                        onSelect={() => {
                          setSelectedBusinessId(profile.UniqueId);
                          setBusinessSelectOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <span className="flex-1 truncate">{label}</span>
                        <Check className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Button
          onClick={handleApprove}
          disabled={!selectedBusinessId || approveMutation.isPending}
        >
          {approveMutation.isPending ? "Approving..." : "Approve Connection"}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={approveMutation.isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function WordpressConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto mt-20 max-w-xl rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <WordpressConnectContent />
    </Suspense>
  );
}
