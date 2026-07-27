"use client";

import * as React from "react";
import {
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  Globe2,
  Loader2,
  LockKeyhole,
  Mail,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  type BusinessEmailDomain,
  type BusinessEmailSender,
  useBusinessEmailSettings,
  type SendingMode,
} from "@/hooks/use-business-email-settings";

type Props = {
  businessId: string;
  businessName: string;
  businessWebsite?: string | null;
};

type SetupStep = {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
};

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function emailName(email: string, domain: string) {
  const suffix = `@${domain}`;
  if (email.toLowerCase().endsWith(suffix.toLowerCase())) return email.slice(0, -suffix.length);
  return email.split("@")[0] || "";
}

function normalizeDomainFromWebsite(value?: string | null) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  let candidate = raw.replace(/^sc-domain:/i, "").trim();

  if (/^https?:\/\//i.test(candidate)) {
    try {
      candidate = new URL(candidate).hostname || candidate;
    } catch {
      candidate = candidate.replace(/^https?:\/\//i, "");
    }
  } else {
    const hostLike = candidate.split(/[/?#]/)[0];
    candidate = hostLike;

    try {
      candidate = new URL(`https://${hostLike}`).hostname || hostLike;
    } catch {
      candidate = hostLike;
    }
  }

  return candidate
    .split(":")[0]
    .replace(/^www\./, "")
    .replace(/\.+$/, "");
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending_dns: "bg-amber-50 text-amber-700 border-amber-200",
    pending_verification: "bg-amber-50 text-amber-700 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<string, string> = {
    verified: "Verified",
    pending_dns: "Pending DNS",
    pending_verification: "Pending verification",
    failed: "Failed",
  };

  return (
    <Badge className={cn(classes[status] || "bg-slate-50 text-slate-700 border-slate-200")}>
      {labels[status] || status.replace(/_/g, " ")}
    </Badge>
  );
}

function ModeChoice({
  active,
  disabled,
  pending,
  icon,
  label,
  helper,
  tag,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  pending?: boolean;
  icon: React.ReactNode;
  label: string;
  helper: string;
  tag?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-busy={pending}
      className={cn(
        "flex min-h-[124px] w-full cursor-pointer flex-col justify-between rounded-lg border bg-white p-4 text-left transition",
        active ? "border-general-foreground shadow-sm" : "border-border hover:border-general-foreground/40",
        disabled && "cursor-not-allowed opacity-55"
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-general-foreground">
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-general-foreground">{label}</span>
            <span className="mt-1 block text-sm leading-5 text-muted-foreground">{helper}</span>
          </span>
        </span>
        {pending ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
        ) : active ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : null}
      </span>
      {tag ? (
        <Badge variant="outline" className="mt-3 w-fit">
          {pending ? "Saving..." : tag}
        </Badge>
      ) : null}
    </button>
  );
}

function SetupSteps({ steps }: { steps: SetupStep[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      {steps.map((step, index) => (
        <div
          key={step.key}
          className={cn(
            "flex min-h-[62px] items-center gap-3 rounded-lg border px-3 py-2",
            step.done && "border-emerald-200 bg-emerald-50",
            step.active && !step.done && "border-general-foreground bg-white shadow-sm",
            !step.active && !step.done && "bg-muted/30"
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              step.done ? "border-emerald-600 bg-emerald-600 text-white" : "bg-white text-muted-foreground"
            )}
          >
            {step.done ? <Check className="h-4 w-4" /> : index + 1}
          </span>
          <span className="text-sm font-medium text-general-foreground">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function dnsProviderHost(host: string, domain: string) {
  const normalizedHost = host.replace(/\.+$/, "");
  const normalizedDomain = domain.replace(/\.+$/, "");
  const domainSuffix = `.${normalizedDomain}`;

  if (normalizedHost === normalizedDomain) return "@";
  if (normalizedHost.endsWith(domainSuffix)) return normalizedHost.slice(0, -domainSuffix.length);
  return normalizedHost;
}

function DnsRecords({ domain }: { domain: BusinessEmailDomain }) {
  const [copiedFieldKey, setCopiedFieldKey] = React.useState<string | null>(null);
  const copyResetTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyResetTimeout.current) clearTimeout(copyResetTimeout.current);
    };
  }, []);

  const copy = async (fieldKey: string, value: string, label: "short host" | "full host" | "value") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedFieldKey(fieldKey);
      if (copyResetTimeout.current) clearTimeout(copyResetTimeout.current);
      copyResetTimeout.current = setTimeout(() => setCopiedFieldKey(null), 1800);
      toast.success(`DNS ${label} copied`);
    } catch {
      toast.error(`Could not copy DNS ${label}`);
    }
  };

  if (!domain.dnsRecords?.length) {
    return <p className="text-sm text-muted-foreground">DNS records will appear here after the domain is created.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Use <span className="font-medium">Short</span> if your provider adds .{domain.domain}; otherwise use{" "}
          <span className="font-medium">Full</span>.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[72px_minmax(0,1fr)_88px] gap-2 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground md:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)_88px]">
          <span>Type</span>
          <span>Host formats</span>
          <span className="hidden md:block">Value</span>
          <span className="sr-only">Value actions</span>
        </div>
        {domain.dnsRecords.map((record) => {
          const recordKey = `${record.key}-${record.host}`;
          const shortHostFieldKey = `${recordKey}-short-host`;
          const fullHostFieldKey = `${recordKey}-full-host`;
          const valueFieldKey = `${recordKey}-value`;
          const providerHost = dnsProviderHost(record.host, domain.domain);
          const hasShortHost = providerHost !== record.host;
          const shortHostCopied = copiedFieldKey === shortHostFieldKey;
          const fullHostCopied = copiedFieldKey === fullHostFieldKey;
          const valueCopied = copiedFieldKey === valueFieldKey;

          return (
            <div
              key={recordKey}
              className="grid grid-cols-[72px_minmax(0,1fr)_88px] items-center gap-2 border-t px-3 py-3 text-sm md:grid-cols-[72px_minmax(0,1fr)_minmax(0,1fr)_88px]"
            >
              <span className="font-medium">{record.type}</span>
              <span className="grid min-w-0 gap-1">
                {hasShortHost ? (
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="w-9 shrink-0 text-[11px] font-medium text-muted-foreground">Short</span>
                    <code className="min-w-0 flex-1 break-all text-xs text-general-foreground">{providerHost}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => copy(shortHostFieldKey, providerHost, "short host")}
                      aria-label={shortHostCopied ? "Short DNS host copied" : `Copy short DNS host ${providerHost}`}
                      title={shortHostCopied ? "Short host copied" : `Copy short host: ${providerHost}`}
                      className={cn(
                        "h-7 w-7 shrink-0 transition-all active:scale-[0.97]",
                        shortHostCopied && "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                      )}
                    >
                      {shortHostCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </span>
                ) : null}
                <span className="flex min-w-0 items-center gap-1">
                  <span className="w-9 shrink-0 text-[11px] font-medium text-muted-foreground">Full</span>
                  <code className="min-w-0 flex-1 break-all text-xs text-general-foreground">{record.host}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => copy(fullHostFieldKey, record.host, "full host")}
                    aria-label={fullHostCopied ? "Full DNS host copied" : `Copy full DNS host ${record.host}`}
                    title={fullHostCopied ? "Full host copied" : `Copy full host: ${record.host}`}
                    className={cn(
                      "h-7 w-7 shrink-0 transition-all active:scale-[0.97]",
                      fullHostCopied && "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                    )}
                  >
                    {fullHostCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </span>
              </span>
              <span className="hidden break-all text-muted-foreground md:block">{record.value}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copy(valueFieldKey, record.value, "value")}
                aria-label={valueCopied ? "DNS value copied" : `Copy DNS value for ${record.host}`}
                className={cn(
                  "w-full justify-center transition-all active:scale-[0.97]",
                  valueCopied && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                )}
              >
                {valueCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {valueCopied ? "Copied" : "Copy"}
              </Button>
              <span className="col-span-3 break-all text-xs text-muted-foreground md:hidden">{record.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function validationFailureReasons(domain: BusinessEmailDomain) {
  return Object.values(domain.validationResults?.validation_results || {})
    .filter((result) => result?.valid === false && result.reason)
    .map((result) => result.reason as string);
}

function SenderRow({
  sender,
  active,
  onResend,
  onDefault,
  resending,
  selecting,
  actionsDisabled,
}: {
  sender: BusinessEmailSender;
  active: boolean;
  onResend: () => void;
  onDefault: () => void;
  resending: boolean;
  selecting: boolean;
  actionsDisabled: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-3 py-3",
        active && "border-emerald-200 bg-emerald-50/60"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="break-all text-sm font-medium text-general-foreground">{sender.email}</p>
          <StatusBadge status={sender.status} />
          {active ? (
            <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">In use</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Reply-To: {sender.replyToEmail || sender.email}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {sender.status === "pending_verification" ? (
          <Button type="button" variant="outline" size="sm" onClick={onResend} disabled={actionsDisabled}>
            <RefreshCw className={cn("h-4 w-4", resending && "animate-spin")} />
            {resending ? "Sending" : "Resend"}
          </Button>
        ) : null}
        {!active && sender.status === "verified" ? (
          <Button type="button" variant="outline" size="sm" onClick={onDefault} disabled={actionsDisabled}>
            {selecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {selecting ? "Selecting" : "Use this sender"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function BusinessEmailSettingsPanel({ businessId, businessName, businessWebsite }: Props) {
  const {
    data,
    isLoading,
    isFetching,
    refetch,
    updateSettings,
    createDomain,
    validateDomain,
    deleteDomain,
    createSender,
    resendVerification,
    setDefaultReviewSender,
  } = useBusinessEmailSettings(businessId);

  const [replyTo, setReplyTo] = React.useState("");
  const [domain, setDomain] = React.useState("");
  const [senderEmail, setSenderEmail] = React.useState("");
  const [senderName, setSenderName] = React.useState("");
  const [senderReplyTo, setSenderReplyTo] = React.useState("");
  const [pendingModeToConfirm, setPendingModeToConfirm] = React.useState<SendingMode | null>(null);
  const lastSenderStatusRefreshAt = React.useRef(0);
  const senderStatusRefreshInFlight = React.useRef(false);
  const suggestedDomain = React.useMemo(() => normalizeDomainFromWebsite(businessWebsite), [businessWebsite]);
  const shouldWatchSenderVerification = Boolean(
    data?.settings.sendingMode === "custom_domain" &&
    data.domains.some((item) => item.status === "verified") &&
    data.senders.some((sender) => sender.status === "pending_verification")
  );
  const refreshSenderVerificationStatus = React.useCallback(async () => {
    if (senderStatusRefreshInFlight.current) return null;

    senderStatusRefreshInFlight.current = true;
    lastSenderStatusRefreshAt.current = Date.now();
    try {
      return await refetch();
    } finally {
      senderStatusRefreshInFlight.current = false;
    }
  }, [refetch]);

  React.useEffect(() => {
    setReplyTo(data?.settings.massicReplyToEmail || "");
  }, [data?.settings.massicReplyToEmail]);

  React.useEffect(() => {
    const customSetupVisible = data?.settings.sendingMode === "custom_domain" || pendingModeToConfirm === "custom_domain";
    if (!customSetupVisible || !suggestedDomain || domain || (data?.domains?.length || 0) > 0) return;
    setDomain(suggestedDomain);
  }, [data?.domains?.length, data?.settings.sendingMode, domain, pendingModeToConfirm, suggestedDomain]);

  React.useEffect(() => {
    if (!data?.domains?.length || senderEmail) return;
    const verifiedDomain = data.domains.find((item) => item.status === "verified");
    if (verifiedDomain) setSenderEmail(`hello@${verifiedDomain.domain}`);
  }, [data?.domains, senderEmail]);

  React.useEffect(() => {
    if (!shouldWatchSenderVerification) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastSenderStatusRefreshAt.current < 1500) return;
      void refreshSenderVerificationStatus();
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [refreshSenderVerificationStatus, shouldWatchSenderVerification]);

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mode = data.settings.sendingMode;
  const pendingMode = updateSettings.variables?.sendingMode;
  const isSavingMode = updateSettings.isPending && Boolean(pendingMode);
  const isSavingReplyTo = updateSettings.isPending && Object.prototype.hasOwnProperty.call(updateSettings.variables || {}, "massicReplyToEmail");
  const activeSender = data.senders.find((sender) => sender.id === data.settings.defaultReviewSenderId);
  const verifiedDomain = data.domains.find((item) => item.status === "verified");
  const senderEmailName = verifiedDomain ? emailName(senderEmail, verifiedDomain.domain) : "";
  const pendingDomain = data.domains.find((item) => ["pending_dns", "failed"].includes(item.status)) || data.domains[0];
  const pendingDomainFailed = pendingDomain?.status === "failed";
  const pendingDomainFailureReasons = pendingDomain ? validationFailureReasons(pendingDomain) : [];
  const pendingSenderIds = data.senders
    .filter((sender) => sender.status === "pending_verification")
    .map((sender) => sender.id);
  const hasPendingSender = pendingSenderIds.length > 0;
  const hasVerifiedSender = Boolean(activeSender?.status === "verified");
  const customReady = mode === "custom_domain" && hasVerifiedSender;
  const senderPreview =
    mode === "custom_domain" && activeSender
      ? `From: ${activeSender.email}`
      : `From: ${data.massicSender.fromName} <${data.massicSender.fromEmail}>`;
  const replyPreview =
    mode === "custom_domain" && activeSender
      ? `Reply-To: ${activeSender.replyToEmail || activeSender.email}`
      : `Reply-To: ${replyTo || "not set"}`;
  const steps: SetupStep[] = [
    { key: "mode", label: "Choose", done: true, active: false },
    { key: "domain", label: "Verify domain", done: Boolean(verifiedDomain), active: mode === "custom_domain" && !verifiedDomain },
    {
      key: "sender",
      label: "Verify email",
      done: hasVerifiedSender,
      active: mode === "custom_domain" && Boolean(verifiedDomain) && !hasVerifiedSender,
    },
    { key: "ready", label: "Ready", done: customReady, active: customReady },
  ];

  const setMode = (sendingMode: SendingMode) => {
    if (isSavingMode || sendingMode === mode) return;
    setPendingModeToConfirm(sendingMode);
  };

  const confirmModeSwitch = () => {
    if (!pendingModeToConfirm || isSavingMode) return;
    updateSettings.mutate(
      { sendingMode: pendingModeToConfirm },
      {
        onSuccess: () => setPendingModeToConfirm(null),
      }
    );
  };

  const saveReplyTo = () => {
    if (!isValidEmail(replyTo)) {
      toast.error("Enter a valid Reply-To email");
      return;
    }
    updateSettings.mutate({ massicReplyToEmail: replyTo.trim() || null });
  };

  const addSender = () => {
    if (!isValidEmail(senderEmail) || !senderEmail.trim()) {
      toast.error("Enter a valid sender email");
      return;
    }
    if (senderReplyTo.trim() && !isValidEmail(senderReplyTo)) {
      toast.error("Enter a valid Reply-To email");
      return;
    }
    createSender.mutate({
      email: senderEmail.trim(),
      fromName: senderName.trim() || businessName,
      replyToEmail: senderReplyTo.trim(),
    });
  };

  const checkEmailVerification = async () => {
    const result = await refreshSenderVerificationStatus();
    if (!result) return;
    if (result.isError) {
      toast.error("Could not check email verification");
      return;
    }

    const newlyVerified = result.data?.senders.some(
      (sender) => pendingSenderIds.includes(sender.id) && sender.status === "verified"
    );
    if (newlyVerified) {
      toast.success("Email verification confirmed");
    } else {
      toast.info("Email is still awaiting verification");
    }
  };

  return (
    <>
    <div className="h-full overflow-auto rounded-lg bg-white p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-general-foreground">Email sending</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick how review request emails should appear to customers.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            {isFetching ? "Refreshing" : "Refresh"}
          </Button>
        </div>

        <div className={cn("rounded-lg border px-4 py-3 text-sm", customReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "bg-muted/40 text-muted-foreground")}>
          <div className="font-medium text-general-foreground">
            {isSavingMode
              ? "Saving email option"
              : customReady
                ? "Business email is ready"
                : mode === "custom_domain"
                  ? "Finish business email setup"
                  : "Massic email is ready"}
          </div>
          <div className="mt-1 break-all">{senderPreview}</div>
          <div className="mt-1 break-all">{replyPreview}</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ModeChoice
            active={mode === "massic_default"}
            icon={<Mail className="h-4 w-4" />}
            label="Use Massic email"
            helper="Fastest option. Use this for Gmail, Outlook, Yahoo, or when the business does not want DNS setup."
            tag="Recommended"
            disabled={isSavingMode}
            pending={isSavingMode && pendingMode === "massic_default"}
            onClick={() => setMode("massic_default")}
          />
          <ModeChoice
            active={mode === "custom_domain"}
            icon={<Globe2 className="h-4 w-4" />}
            label="Use business domain"
            helper="Best branded option. The business adds DNS records, then verifies a sender address."
            tag={data.customSendersEnabled ? "DNS required" : "Not enabled"}
            disabled={!data.customSendersEnabled || isSavingMode}
            pending={isSavingMode && pendingMode === "custom_domain"}
            onClick={() => setMode("custom_domain")}
          />
        </div>

        {mode === "massic_default" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4" />
                Massic email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="break-all">
                  <span className="font-medium">Customer sees:</span> {data.massicSender.fromName} &lt;{data.massicSender.fromEmail}&gt;
                </div>
                <div className="mt-1 break-all">
                  <span className="font-medium">Replies go to:</span> {replyTo || "No reply inbox set"}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="massic-reply-to">Reply inbox</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="massic-reply-to"
                    value={replyTo}
                    onChange={(event) => setReplyTo(event.target.value)}
                    placeholder="business@gmail.com"
                  />
                  <Button type="button" onClick={saveReplyTo} disabled={isSavingReplyTo}>
                    {isSavingReplyTo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isSavingReplyTo ? "Saving" : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This can be Gmail or any normal inbox because it is only used for replies.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe2 className="h-4 w-4" />
                Business domain setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <SetupSteps steps={steps} />

              {!data.customSendersEnabled ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Custom domain sending is not enabled for this environment yet.
                </div>
              ) : null}

              {!verifiedDomain ? (
                <div className="space-y-4">
                  {!pendingDomain ? (
                    <div className="grid gap-2">
                      <Label htmlFor="email-domain">Business domain</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id="email-domain"
                          value={domain}
                          onChange={(event) => {
                            if (createDomain.isError) createDomain.reset();
                            setDomain(event.target.value);
                          }}
                          placeholder="business.com"
                          disabled={!data.customSendersEnabled}
                          aria-invalid={createDomain.isError}
                          aria-describedby={createDomain.isError ? "email-domain-error email-domain-helper" : "email-domain-helper"}
                        />
                        <Button
                          type="button"
                          disabled={!data.customSendersEnabled || createDomain.isPending || !domain.trim()}
                          onClick={() => createDomain.mutate(domain.trim())}
                        >
                          {createDomain.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {createDomain.isPending ? "Creating" : "Create DNS records"}
                        </Button>
                      </div>
                      {createDomain.isError ? (
                        <div
                          id="email-domain-error"
                          role="alert"
                          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                        >
                          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                          <p>{createDomain.error.message}</p>
                        </div>
                      ) : null}
                      <p id="email-domain-helper" className="text-xs text-muted-foreground">
                        Do not enter Gmail or Outlook here. Use the business website domain.
                      </p>
                    </div>
                  ) : null}

                  {pendingDomain ? (
                    <div
                      className={cn(
                        "space-y-3 rounded-lg border p-3",
                        pendingDomainFailed && "border-red-200 bg-red-50/40"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-all text-sm font-semibold">{pendingDomain.domain}</p>
                          <StatusBadge status={pendingDomain.status} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => validateDomain.mutate(pendingDomain.id)}
                            disabled={validateDomain.isPending}
                          >
                            <RefreshCw className={cn("h-4 w-4", validateDomain.isPending && "animate-spin")} />
                            {validateDomain.isPending ? "Checking" : "Check DNS"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDomain.mutate(pendingDomain.id)}
                            disabled={deleteDomain.isPending}
                            aria-label="Remove domain"
                          >
                            {deleteDomain.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <p className={cn("text-sm text-muted-foreground", pendingDomainFailed && "text-red-700")}>
                        {pendingDomainFailed
                          ? "SendGrid could not verify these DNS records. Fix the missing or mismatched records, then check DNS again."
                          : "DNS records are already created for this domain. Add any missing records at your DNS provider, then check DNS again."}
                      </p>
                      {pendingDomainFailureReasons.length > 0 ? (
                        <ul className="space-y-1 text-xs text-red-700">
                          {pendingDomainFailureReasons.map((reason) => (
                            <li key={reason}>• {reason}</li>
                          ))}
                        </ul>
                      ) : null}
                      <DnsRecords domain={pendingDomain} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="break-all text-sm font-semibold text-general-foreground">{verifiedDomain.domain}</p>
                        <StatusBadge status="verified" />
                      </div>
                      <p className="mt-1 text-xs text-emerald-800">Domain DNS is verified.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => validateDomain.mutate(verifiedDomain.id)}
                      disabled={validateDomain.isPending}
                    >
                      <RefreshCw className={cn("h-4 w-4", validateDomain.isPending && "animate-spin")} />
                      {validateDomain.isPending ? "Checking" : "Recheck"}
                    </Button>
                  </div>

                  <Separator />

                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-general-foreground">Sender details</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Customers see the From email and name.</p>
                      </div>
                      {hasPendingSender ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void checkEmailVerification()}
                          disabled={isFetching}
                        >
                          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                          {isFetching ? "Checking" : "Check verification"}
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="sender-email" className="flex items-center justify-between gap-2">
                          <span>From email</span>
                          <span className="text-xs font-normal text-muted-foreground">Name editable</span>
                        </Label>
                        <div className="flex h-10 overflow-hidden rounded-md border border-input bg-white shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                          <Input
                            id="sender-email"
                            value={senderEmailName}
                            onChange={(event) => setSenderEmail(`${event.target.value}@${verifiedDomain.domain}`)}
                            placeholder="hello"
                            className="h-full !h-full min-w-[80px] rounded-none border-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                          />
                          <span
                            className="flex max-w-[58%] shrink-0 items-center gap-1.5 border-l bg-muted/60 px-3 text-sm text-muted-foreground"
                            title={`Verified domain: ${verifiedDomain.domain}`}
                          >
                            <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">@{verifiedDomain.domain}</span>
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="sender-name">From name</Label>
                        <Input
                          id="sender-name"
                          value={senderName}
                          onChange={(event) => setSenderName(event.target.value)}
                          placeholder={businessName || "Business name"}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="sender-reply-to">
                          Reply-to email <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                          id="sender-reply-to"
                          type="email"
                          value={senderReplyTo}
                          onChange={(event) => setSenderReplyTo(event.target.value)}
                          placeholder={`replies@${verifiedDomain.domain}`}
                        />
                      </div>
                    </div>
                    <div>
                      <Button type="button" disabled={createSender.isPending || !senderEmailName.trim()} onClick={addSender}>
                        {createSender.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {createSender.isPending ? "Sending" : "Send verification email"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {data.senders.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No sender address added yet.
                        </p>
                      ) : (
                        data.senders.map((sender) => (
                          <SenderRow
                            key={sender.id}
                            sender={sender}
                            active={sender.id === data.settings.defaultReviewSenderId && sender.status === "verified"}
                            resending={resendVerification.isPending && resendVerification.variables === sender.id}
                            selecting={setDefaultReviewSender.isPending && setDefaultReviewSender.variables === sender.id}
                            actionsDisabled={resendVerification.isPending || setDefaultReviewSender.isPending}
                            onResend={() => resendVerification.mutate(sender.id)}
                            onDefault={() => setDefaultReviewSender.mutate(sender.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          Review opt-outs recorded for this business: {data.reviewSuppressionsCount}.
        </div>
      </div>
    </div>
    <Dialog open={Boolean(pendingModeToConfirm)} onOpenChange={(open) => !open && !isSavingMode && setPendingModeToConfirm(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {pendingModeToConfirm === "custom_domain" ? "Switch to business domain?" : "Switch to Massic email?"}
          </DialogTitle>
          <DialogDescription>
            {pendingModeToConfirm === "custom_domain"
              ? "Review emails will stop using the Massic sender after a verified business sender is ready. Until setup is complete, campaign emails may be blocked."
              : "Review emails will use the Massic sender right away. Replies can still go to the business inbox you set."}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {pendingModeToConfirm === "custom_domain"
            ? "You will need to add DNS records and verify a sender email."
            : "No DNS setup is needed for Massic email."}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setPendingModeToConfirm(null)} disabled={isSavingMode}>
            Cancel
          </Button>
          <Button type="button" onClick={confirmModeSwitch} disabled={isSavingMode}>
            {isSavingMode ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSavingMode ? "Switching" : "Confirm switch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function BusinessEmailSenderStatusBanner({ businessId, onEdit }: { businessId: string; onEdit: () => void }) {
  const { data, isLoading } = useBusinessEmailSettings(businessId);

  if (isLoading || !data) return null;

  const activeSender = data.senders.find((sender) => sender.id === data.settings.defaultReviewSenderId);
  const customReady = data.settings.sendingMode === "custom_domain" && activeSender?.status === "verified";

  if (data.settings.sendingMode === "custom_domain" && !customReady) {
    return (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <CircleAlert className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-950">Business email setup incomplete</p>
            <p className="mt-0.5 text-xs text-amber-800">Choose a verified sender before sending review campaigns.</p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit} className="bg-white">
          Finish setup
        </Button>
      </div>
    );
  }

  if (customReady && activeSender) {
    return (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-emerald-950">Business email active</p>
              <Badge className="border-emerald-200 bg-white text-emerald-700">In use</Badge>
            </div>
            <p className="mt-0.5 break-all text-sm text-emerald-900">
              Review campaigns will send from <span className="font-medium">{activeSender.email}</span>
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit} className="bg-white">
          <Pencil className="h-4 w-4" />
          Edit configuration
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-white text-muted-foreground">
          <Mail className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-general-foreground">Massic email active</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Review campaigns send via Massic
            {data.settings.massicReplyToEmail ? `; replies go to ${data.settings.massicReplyToEmail}` : ""}.
          </p>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onEdit} className="bg-white">
        <Pencil className="h-4 w-4" />
        Edit configuration
      </Button>
    </div>
  );
}
