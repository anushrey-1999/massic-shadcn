"use client";

import React from "react";
import { ChevronDown, Download, ExternalLink, Globe, Link2, PlugZap, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  useConnectWordpress,
  useDisconnectWordpress,
  useStartWordpressOauthLink,
  useWordpressConnection,
} from "@/hooks/use-wordpress-connector";

interface WebChannelsTabProps {
  businessId: string;
  defaultSiteUrl?: string | null;
  /** When true, the Channels tab is active. Used to refetch connection when user returns to this tab. */
  isActive?: boolean;
  /** When false, hides the "Channels" header and description (e.g. when embedded in Settings as "Integrations"). */
  showHeader?: boolean;
}

interface ConnectFormState {
  siteUrl: string;
  siteId: string;
  pairingCode: string;
  clientSecret: string;
}

const initialManualFormState: ConnectFormState = {
  siteUrl: "",
  siteId: "",
  pairingCode: "",
  clientSecret: "",
};

const WORDPRESS_PLUGIN_ZIP_PATH = "/downloads/massic-wp-connector-1.0.0.zip";

function normalizeSiteUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getSiteHostLabel(siteUrl?: string | null) {
  if (!siteUrl) return "";

  try {
    return new URL(normalizeSiteUrlInput(siteUrl)).host;
  } catch {
    return siteUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  }
}

// Official WordPress W mark from WordPress.org CDN (https://wordpress.org/about/logos/)
const WORDPRESS_LOGO_URL = "https://s.w.org/style/images/about/WordPress-logotype-wmark.png";

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  WordPress: (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#21759b]/10 p-1.5" aria-hidden>
      <img
        src={WORDPRESS_LOGO_URL}
        alt=""
        className="size-full object-contain"
        width={40}
        height={40}
        loading="lazy"
      />
    </div>
  ),
  Webflow: (
    <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
      <Globe className="size-5" />
    </div>
  ),
  Shopify: (
    <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
      <Globe className="size-5" />
    </div>
  ),
};

function ComingSoonChannelCard({ name }: { name: string }) {
  return (
    <Card className="overflow-hidden border-general-border bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {CHANNEL_ICONS[name]}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-medium text-general-foreground">{name}</CardTitle>
              <Badge variant="outline" className="font-normal text-general-muted-foreground">
                Coming soon
              </Badge>
            </div>
            <CardDescription className="mt-1 text-sm">
              Integration with {name} will be available in a future update.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

export function WebChannelsTab({ businessId, defaultSiteUrl, isActive = true, showHeader = true }: WebChannelsTabProps) {
  const [isRecommendedModalOpen, setIsRecommendedModalOpen] = React.useState(false);
  const [isHowToModalOpen, setIsHowToModalOpen] = React.useState(false);
  const [isManualOpen, setIsManualOpen] = React.useState(false);
  const [recommendedSiteUrl, setRecommendedSiteUrl] = React.useState(defaultSiteUrl || "");
  const [manualForm, setManualForm] = React.useState<ConnectFormState>({
    ...initialManualFormState,
    siteUrl: defaultSiteUrl || "",
  });

  const { data, isLoading, refetch } = useWordpressConnection(businessId);
  const prevActiveRef = React.useRef(false);
  React.useEffect(() => {
    const becameActive = isActive && !prevActiveRef.current;
    prevActiveRef.current = isActive;
    if (becameActive) {
      refetch();
    }
  }, [isActive, refetch]);

  React.useEffect(() => {
    if (!isActive) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [isActive, refetch]);

  const connectMutation = useConnectWordpress();
  const disconnectMutation = useDisconnectWordpress(businessId);
  const oauthStartLinkMutation = useStartWordpressOauthLink();

  const connected = Boolean(data?.connected && data?.connection);
  const connection = data?.connection || null;
  const connectedSiteHost = React.useMemo(() => getSiteHostLabel(connection?.siteUrl), [connection?.siteUrl]);

  React.useEffect(() => {
    if (!recommendedSiteUrl && defaultSiteUrl) {
      setRecommendedSiteUrl(defaultSiteUrl);
    }
  }, [defaultSiteUrl, recommendedSiteUrl]);

  const onManualChange = (key: keyof ConnectFormState, value: string) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitRecommended = async () => {
    const siteUrl = normalizeSiteUrlInput(recommendedSiteUrl);
    if (!siteUrl) return;

    setIsRecommendedModalOpen(false);

    const response = await oauthStartLinkMutation.mutateAsync({
      businessId,
      siteUrl,
    });

    const connectUrl = response?.data?.connectUrl;
    if (!connectUrl) {
      return;
    }

    const popup = window.open(connectUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      toast.error("Popup blocked", {
        description: "Please allow popups for this site and try again.",
      });
      return;
    }

    toast.success("WordPress admin opened", {
      description: "Click 'Connect to Massic (Recommended)' in your plugin page.",
    });
  };

  const submitManualConnect = async () => {
    await connectMutation.mutateAsync({
      businessId,
      siteUrl: normalizeSiteUrlInput(manualForm.siteUrl),
      siteId: manualForm.siteId.trim(),
      pairingCode: manualForm.pairingCode.trim(),
      clientSecret: manualForm.clientSecret.trim(),
    });

    setManualForm((prev) => ({
      ...initialManualFormState,
      siteUrl: prev.siteUrl || defaultSiteUrl || "",
    }));
  };

  const submitDisconnect = async () => {
    if (!connection?.connectionId) return;
    await disconnectMutation.mutateAsync({ connectionId: connection.connectionId });
  };

  const handleOpenWordpressAdmin = () => {
    if (!connection?.siteUrl) return;

    let adminUrl = "";
    try {
      const parsed = new URL(normalizeSiteUrlInput(connection.siteUrl));
      const basePath = parsed.pathname.replace(/\/+$/, "");
      adminUrl = `${parsed.origin}${basePath}/wp-admin`;
    } catch {
      toast.error("Invalid WordPress site URL");
      return;
    }

    const popup = window.open(adminUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      toast.error("Popup blocked", {
        description: "Please allow popups for this site and try again, or copy the URL to open in a new tab.",
      });
    }
  };

  const canSubmitManual =
    manualForm.siteUrl.trim() &&
    manualForm.siteId.trim() &&
    manualForm.pairingCode.trim() &&
    manualForm.clientSecret.trim();

  return (
    <div className="flex h-full flex-col gap-6 overflow-auto px-1">
      {showHeader && (
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlugZap className="size-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-general-foreground">Channels</h1>
              <p className="text-sm text-general-muted-foreground">
                Connect your sites to publish and manage content from Massic.
              </p>
            </div>
          </div>
        </header>
      )}

      <div className="space-y-4">
        {/* WordPress channel */}
        <Card className="overflow-hidden border-general-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                {CHANNEL_ICONS.WordPress}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base font-medium text-general-foreground">WordPress</CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-normal",
                        connected
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "text-general-muted-foreground"
                      )}
                    >
                      {connected ? "Connected" : isLoading ? "Checking…" : "Not connected"}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    Publish drafts and pages directly from Massic to your WordPress site.
                  </CardDescription>
                  {connected && connection && (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-general-border bg-muted/30 px-3 py-2">
                      <Globe className="size-4 shrink-0 text-general-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-general-foreground">
                          {connectedSiteHost || "Connected site"}
                        </p>
                        <p className="truncate text-xs text-general-muted-foreground">{connection.siteUrl}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-start">
                {connected ? (
                  <>
                    <Button size="sm" onClick={handleOpenWordpressAdmin} className="sm:min-w-[180px]">
                      <ExternalLink className="mr-2 size-4" />
                      Open WordPress Admin
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="outline" className="size-9 shrink-0">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setIsHowToModalOpen(true)}>
                          How to connect
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={submitDisconnect}
                          disabled={disconnectMutation.isPending}
                        >
                          {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={() => setIsRecommendedModalOpen(true)} className="sm:min-w-[160px]">
                      <Link2 className="mr-2 size-4" />
                      Connect WordPress
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-general-muted-foreground"
                      onClick={() => setIsHowToModalOpen(true)}
                    >
                      How to connect
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          {!connected && (
            <CardContent className="border-t border-general-border pt-4">
              <Collapsible open={isManualOpen} onOpenChange={setIsManualOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="h-auto px-0 text-xs text-general-muted-foreground hover:text-general-foreground">
                    Manual setup (Advanced)
                    <ChevronDown className={cn("ml-1 size-4 transition-transform", isManualOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="wp-manual-site-url">Site URL</Label>
                      <Input
                        id="wp-manual-site-url"
                        placeholder="https://example.com"
                        value={manualForm.siteUrl}
                        onChange={(e) => onManualChange("siteUrl", e.target.value)}
                        disabled={connectMutation.isPending}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wp-manual-site-id">Site ID</Label>
                      <Input
                        id="wp-manual-site-id"
                        placeholder="site_123"
                        value={manualForm.siteId}
                        onChange={(e) => onManualChange("siteId", e.target.value)}
                        disabled={connectMutation.isPending}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wp-manual-pairing-code">Pairing Code</Label>
                      <Input
                        id="wp-manual-pairing-code"
                        placeholder="Paste pairing code"
                        value={manualForm.pairingCode}
                        onChange={(e) => onManualChange("pairingCode", e.target.value)}
                        disabled={connectMutation.isPending}
                      />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="wp-manual-client-secret">Client Secret</Label>
                      <Input
                        id="wp-manual-client-secret"
                        type="password"
                        placeholder="Paste client secret"
                        value={manualForm.clientSecret}
                        onChange={(e) => onManualChange("clientSecret", e.target.value)}
                        disabled={connectMutation.isPending}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        onClick={submitManualConnect}
                        disabled={!canSubmitManual || connectMutation.isPending}
                      >
                        {connectMutation.isPending ? "Connecting…" : "Connect manually"}
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          )}
        </Card>

        <Separator className="bg-general-border" />

        <ComingSoonChannelCard name="Webflow" />
        <ComingSoonChannelCard name="Shopify" />
      </div>

      <Dialog open={isRecommendedModalOpen} onOpenChange={setIsRecommendedModalOpen}>
        <DialogContent className="sm:max-w-[560px]" showCloseButton={!oauthStartLinkMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Connect WordPress (Recommended)</DialogTitle>
            <DialogDescription>
              Enter your WordPress site URL. We will open your WP admin plugin page where you can connect in one click.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="wp-recommended-site-url">Site URL</Label>
              <Input
                id="wp-recommended-site-url"
                placeholder="https://example.com"
                value={recommendedSiteUrl}
                onChange={(e) => setRecommendedSiteUrl(e.target.value)}
                disabled={oauthStartLinkMutation.isPending}
              />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              After opening WordPress admin, click <strong>Connect to Massic (Recommended)</strong> in the plugin page.
            </div>
            <div className="flex justify-start">
              <Button
                variant="link"
                className="h-auto px-0 text-xs"
                onClick={() => setIsHowToModalOpen(true)}
              >
                Need setup steps? View install guide
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRecommendedModalOpen(false)}
              disabled={oauthStartLinkMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitRecommended}
              disabled={!recommendedSiteUrl.trim() || oauthStartLinkMutation.isPending}
            >
              {oauthStartLinkMutation.isPending ? "Opening..." : "Open WordPress Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHowToModalOpen} onOpenChange={setIsHowToModalOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>How to connect WordPress</DialogTitle>
            <DialogDescription>
              Follow these steps to install the plugin and complete one-click connection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1 text-sm text-general-foreground">
            <ol className="list-decimal space-y-3 pl-5">
              <li>
                Download the plugin zip file.
              </li>
              <li>
                In WordPress admin, go to <strong>Plugins</strong> {">"} <strong>Add New</strong> {">"}{" "}
                <strong>Upload Plugin</strong>, choose the zip, then install and activate.
              </li>
              <li>
                In WordPress admin, open <strong>Settings</strong> {">"} <strong>Massic Connector</strong>.
              </li>
              <li>
                In this app, click <strong>Connect WordPress (Recommended)</strong>, enter your site URL, and open WP Admin.
              </li>
              <li>
                Back in the WordPress connector page, click <strong>Connect to Massic (Recommended)</strong> and approve.
              </li>
            </ol>

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Manual fallback is available under <strong>Manual setup (Advanced)</strong> if popup-based connect is blocked.
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsHowToModalOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <a href={WORDPRESS_PLUGIN_ZIP_PATH} download>
                <Download className="mr-1 size-4" />
                Download Plugin Zip
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
