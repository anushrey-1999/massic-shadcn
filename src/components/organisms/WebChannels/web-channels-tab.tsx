"use client";

import React from "react";
import { Globe, Link2, PlugZap } from "lucide-react";
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
import {
  useConnectWordpress,
  useDisconnectWordpress,
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

const initialFormState: ConnectFormState = {
  siteUrl: "",
  siteId: "",
  pairingCode: "",
  clientSecret: "",
};

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
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<ConnectFormState>({
    ...initialFormState,
    siteUrl: defaultSiteUrl || "",
  });

  const { data, isLoading } = useWordpressConnection(businessId);
  const connectMutation = useConnectWordpress();
  const disconnectMutation = useDisconnectWordpress(businessId);

  const connected = Boolean(data?.connected && data?.connection);
  const connection = data?.connection || null;

  React.useEffect(() => {
    if (isModalOpen) {
      setForm((prev) => ({
        ...prev,
        siteUrl: prev.siteUrl || defaultSiteUrl || "",
      }));
    }
  }, [defaultSiteUrl, isModalOpen]);

  const onChange = (key: keyof ConnectFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitConnect = async () => {
    await connectMutation.mutateAsync({
      businessId,
      siteUrl: form.siteUrl.trim(),
      siteId: form.siteId.trim(),
      pairingCode: form.pairingCode.trim(),
      clientSecret: form.clientSecret.trim(),
    });

    setIsModalOpen(false);
    setForm((prev) => ({
      ...initialFormState,
      siteUrl: prev.siteUrl || defaultSiteUrl || "",
    }));
  };

  const submitDisconnect = async () => {
    if (!connection?.connectionId) return;
    await disconnectMutation.mutateAsync({ connectionId: connection.connectionId });
  };

  const canSubmit =
    form.siteUrl.trim() &&
    form.siteId.trim() &&
    form.pairingCode.trim() &&
    form.clientSecret.trim();

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
                  Connect your WordPress site to publish and preview content.
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
                  <Button size="sm" onClick={() => setIsModalOpen(true)}>
                    <Link2 className="mr-1 size-4" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </div>

          <EmptyProviderCard name="Webflow" />
          <EmptyProviderCard name="Shopify" />
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[560px]" showCloseButton={!connectMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Connect WordPress</DialogTitle>
            <DialogDescription>
              Enter your WordPress connector details from the plugin settings page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="wp-site-url">Site URL</Label>
              <Input
                id="wp-site-url"
                placeholder="https://example.com"
                value={form.siteUrl}
                onChange={(e) => onChange("siteUrl", e.target.value)}
                disabled={connectMutation.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wp-site-id">Site ID</Label>
              <Input
                id="wp-site-id"
                placeholder="site_123"
                value={form.siteId}
                onChange={(e) => onChange("siteId", e.target.value)}
                disabled={connectMutation.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wp-pairing-code">Pairing Code</Label>
              <Input
                id="wp-pairing-code"
                placeholder="Paste pairing code"
                value={form.pairingCode}
                onChange={(e) => onChange("pairingCode", e.target.value)}
                disabled={connectMutation.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wp-client-secret">Client Secret</Label>
              <Input
                id="wp-client-secret"
                type="password"
                placeholder="Paste client secret"
                value={form.clientSecret}
                onChange={(e) => onChange("clientSecret", e.target.value)}
                disabled={connectMutation.isPending}
                autoComplete="new-password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={connectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitConnect}
              disabled={!canSubmit || connectMutation.isPending}
            >
              {connectMutation.isPending ? "Connecting..." : "Connect WordPress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
