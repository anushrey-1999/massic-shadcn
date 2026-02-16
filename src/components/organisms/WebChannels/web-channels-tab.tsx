"use client";

import React from "react";
import { ChevronDown, Link2, PlugZap } from "lucide-react";
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

function normalizeSiteUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function EmptyProviderCard({ name }: { name: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-general-foreground">{name}</p>
          <p className="text-xs text-general-muted-foreground">Coming soon</p>
        </div>
        <Button size="sm" variant="outline" disabled>
          Not Available
        </Button>
      </div>
    </div>
  );
}

export function WebChannelsTab({ businessId, defaultSiteUrl }: WebChannelsTabProps) {
  const [isRecommendedModalOpen, setIsRecommendedModalOpen] = React.useState(false);
  const [isManualOpen, setIsManualOpen] = React.useState(false);
  const [recommendedSiteUrl, setRecommendedSiteUrl] = React.useState(defaultSiteUrl || "");
  const [manualForm, setManualForm] = React.useState<ConnectFormState>({
    ...initialManualFormState,
    siteUrl: defaultSiteUrl || "",
  });

  const { data, isLoading } = useWordpressConnection(businessId);
  const connectMutation = useConnectWordpress();
  const disconnectMutation = useDisconnectWordpress(businessId);
  const oauthStartLinkMutation = useStartWordpressOauthLink();

  const connected = Boolean(data?.connected && data?.connection);
  const connection = data?.connection || null;

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
      window.location.assign(connectUrl);
      return;
    }

    toast.success("WordPress admin opened", {
      description: "Click 'Connect to Massic (Recommended)' in your plugin page.",
    });

    setIsRecommendedModalOpen(false);
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

  const canSubmitManual =
    manualForm.siteUrl.trim() &&
    manualForm.siteId.trim() &&
    manualForm.pairingCode.trim() &&
    manualForm.clientSecret.trim();

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
          <PlugZap className="size-4 text-general-muted-foreground" />
          <h3 className="text-sm font-semibold text-general-foreground">Channels</h3>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-general-foreground">WordPress</p>
                <p className="text-xs text-general-muted-foreground">
                  One-click connect is recommended. Manual pairing is available under advanced setup.
                </p>
                {connected && connection && (
                  <div className="pt-2 text-xs text-general-muted-foreground">
                    <p>
                      <span className="font-medium text-general-foreground">Site URL:</span> {connection.siteUrl}
                    </p>
                    <p>
                      <span className="font-medium text-general-foreground">Site ID:</span> {connection.siteId}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[11px] font-medium",
                    connected
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-600"
                  )}
                >
                  {connected ? "Connected" : isLoading ? "Checking..." : "Not Connected"}
                </span>

                {connected ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={submitDisconnect}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setIsRecommendedModalOpen(true)}>
                    <Link2 className="mr-1 size-4" />
                    Connect WordPress (Recommended)
                  </Button>
                )}
              </div>
            </div>

            {!connected && (
              <div className="mt-4 border-t pt-4">
                <Collapsible open={isManualOpen} onOpenChange={setIsManualOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="h-auto px-0 text-xs text-muted-foreground">
                      Manual setup (Advanced)
                      <ChevronDown className={cn("ml-1 size-4 transition-transform", isManualOpen && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
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
                      <div className="grid gap-2">
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

                      <div>
                        <Button
                          onClick={submitManualConnect}
                          disabled={!canSubmitManual || connectMutation.isPending}
                        >
                          {connectMutation.isPending ? "Connecting..." : "Connect Manually"}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>

          <EmptyProviderCard name="Webflow" />
          <EmptyProviderCard name="Shopify" />
        </div>
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
    </div>
  );
}
