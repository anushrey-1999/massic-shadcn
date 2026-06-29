"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { PlatformIcon, SiteFavicon } from "@/components/organisms/WebChannels/platform-icon";
import { useAuthStore } from "@/store/auth-store";
import { useBusinessProfiles } from "@/hooks/use-business-profiles";
import type { BusinessProfile } from "@/store/business-store";
import {
  useApproveWordpressOauth,
  useWordpressOauthSession,
} from "@/hooks/use-wordpress-connector";
import { normalizeDomainForFavicon } from "@/utils/utils";
import { cn } from "@/lib/utils";

function ConnectShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mt-14 w-full max-w-xl px-4">
      <Card className="gap-0 rounded-xl p-6">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-0">
          <PlatformIcon platform="wordpress" />
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg font-semibold text-general-foreground">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
        </CardHeader>
        {children ? <CardContent className="p-0">{children}</CardContent> : null}
      </Card>
    </div>
  );
}

function domainsMatch(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

function getProfileLabel(profile: BusinessProfile) {
  return profile.DisplayName || profile.Name || profile.UniqueId;
}

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
  const [showSelector, setShowSelector] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const siteUrl = sessionQuery.data?.siteUrl;
  const sessionBusinessId = sessionQuery.data?.businessId;
  const siteHost = React.useMemo(() => normalizeDomainForFavicon(siteUrl ?? undefined), [siteUrl]);

  const matchedProfile = React.useMemo(() => {
    if (!siteHost) return null;
    const matches = profiles.filter((profile) =>
      domainsMatch(normalizeDomainForFavicon(profile.Website ?? undefined), siteHost)
    );
    return matches.length === 1 ? matches[0] : null;
  }, [profiles, siteHost]);

  const autoMatched = Boolean(sessionBusinessId || matchedProfile);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    if (isAuthenticated || hasTokenCookie) return;

    const currentPath = typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/wordpress/connect";

    router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }, [mounted, hasTokenCookie, isAuthenticated, router]);

  React.useEffect(() => {
    if (sessionBusinessId) {
      setSelectedBusinessId(String(sessionBusinessId));
      return;
    }

    if (matchedProfile) {
      setSelectedBusinessId(String(matchedProfile.UniqueId));
    }
  }, [matchedProfile, sessionBusinessId]);

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

  if (!mounted) {
    return (
      <ConnectShell title="Connect WordPress" description="Loading your connect request…" />
    );
  }

  if (!sessionId) {
    return (
      <ConnectShell
        title="Missing connect session"
        description="Start the connection from your WordPress plugin page."
      />
    );
  }

  if (sessionQuery.isLoading || sidebarDataLoading) {
    return (
      <ConnectShell title="Connect WordPress" description="Loading your connect request…" />
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <ConnectShell
        title="Connect request unavailable"
        description={
          (sessionQuery.error as Error)?.message ||
          "This WordPress connect session is invalid or expired."
        }
      />
    );
  }

  const selectedProfile = profiles.find((profile) => profile.UniqueId === selectedBusinessId) || null;
  const showDropdown = !autoMatched || showSelector;

  return (
    <ConnectShell
      title="Authorize WordPress Connection"
      description="Approve this site to publish content from Massic."
    >
      <div className="mt-5 flex items-center gap-3 rounded-lg border border-general-border bg-general-primary-foreground/50 px-3 py-2.5">
        <SiteFavicon siteUrl={siteUrl} />
        <div className="min-w-0">
          <p className="text-xs text-general-muted-foreground">Connecting site</p>
          <p className="truncate text-sm font-medium text-general-foreground">
            {siteHost || siteUrl}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-general-foreground">Business</p>

        {!showDropdown && selectedProfile ? (
          <div className="flex items-center gap-3 rounded-lg border border-general-border bg-background px-3 py-2.5">
            <SiteFavicon siteUrl={selectedProfile.Website} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-general-foreground">
                {getProfileLabel(selectedProfile)}
              </p>
              <p className="truncate text-xs text-general-muted-foreground">
                Matched to {siteHost}
              </p>
            </div>
            <Button
              variant="link"
              className="h-auto shrink-0 px-0 text-xs"
              onClick={() => setShowSelector(true)}
            >
              Change
            </Button>
          </div>
        ) : (
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
                {selectedProfile ? getProfileLabel(selectedProfile) : "Select business"}
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
                      const label = getProfileLabel(profile);
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
                          <SiteFavicon siteUrl={profile.Website} className="size-6" />
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
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Button
          onClick={handleApprove}
          disabled={!selectedBusinessId || approveMutation.isPending}
        >
          {approveMutation.isPending ? "Approving…" : "Approve Connection"}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={approveMutation.isPending}>
          Cancel
        </Button>
      </div>
    </ConnectShell>
  );
}

export default function WordpressConnectPage() {
  return (
    <Suspense
      fallback={
        <ConnectShell title="Connect WordPress" description="Loading…" />
      }
    >
      <WordpressConnectContent />
    </Suspense>
  );
}
