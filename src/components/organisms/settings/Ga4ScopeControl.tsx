"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Database,
  Loader2,
  RefreshCw,
  Settings2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  isGa4ScopeReplacementActive,
  isGa4ScopeReplacementPending,
  type Ga4IngestionStatus,
  useGa4Scope,
} from "@/hooks/use-ga4-scope";
import { cn } from "@/lib/utils";

type ScopeMode = "property" | "path";
type DialogStep = "edit" | "confirm";

interface Ga4ScopeControlProps {
  businessUniqueId?: string;
  website: string;
  enabled: boolean;
  readOnly?: boolean;
  defaultOpen?: boolean;
  pendingPropertySelected?: boolean;
  initialScope?: string;
  onInitialScopeChange?: (value: string) => void;
}

function getDomain(website: string): string {
  const value = website.replace(/^sc-domain:/i, "").trim();
  if (!value) return "your domain";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
    return url.host || value;
  } catch {
    return value.replace(/^\/+|\/+$/g, "") || "your domain";
  }
}

function validatePath(value: string): string | null {
  const path = value.trim();
  if (!path) return "Enter the landing-page path to include.";
  if (!path.startsWith("/") || path.startsWith("//")) {
    return "Use a path beginning with /, for example /services.";
  }
  if (path.includes("?") || path.includes("#")) {
    return "Enter only the page path, without query parameters or a fragment.";
  }
  if (/\s/.test(path)) {
    return "Page paths cannot contain spaces.";
  }
  if (path.length > 2048) {
    return "The page path must be 2,048 characters or fewer.";
  }
  return null;
}

function normalizePath(value: string): string {
  const trimmed = value.trim().replace(/\/{2,}/g, "/");
  return trimmed.length > 1 ? trimmed.replace(/\/+$/g, "") : trimmed;
}

function formatStage(stage: string | null | undefined): string {
  if (!stage) return "Preparing Analytics data";
  return stage
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scopeLabel(path: string | null | undefined, domain: string): string {
  return path ? `${domain}${path}` : `Whole property · ${domain}`;
}

export function Ga4ScopeControl({
  businessUniqueId,
  website,
  enabled,
  readOnly = false,
  defaultOpen = false,
  pendingPropertySelected = false,
  initialScope = "",
  onInitialScopeChange,
}: Ga4ScopeControlProps) {
  const domain = useMemo(() => getDomain(website), [website]);
  const controlId = useMemo(
    () => (businessUniqueId || domain).replace(/[^a-zA-Z0-9_-]/g, "-"),
    [businessUniqueId, domain]
  );
  const isInitialSetup =
    !enabled && pendingPropertySelected && Boolean(onInitialScopeChange);
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    updateScope,
    isSaving,
    saveError,
    resetSaveError,
  } = useGa4Scope(businessUniqueId, { enabled: enabled && Boolean(businessUniqueId) });
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("edit");
  const [mode, setMode] = useState<ScopeMode>("property");
  const [path, setPath] = useState("");
  const [pathError, setPathError] = useState<string | null>(null);
  const openedFromLinkRef = useRef(false);

  const status = data?.status ?? null;
  const replacementPending = isGa4ScopeReplacementPending(data);
  const isImporting =
    isGa4ScopeReplacementActive(data) ||
    (replacementPending && status !== "failed");
  const displayStatus: Ga4IngestionStatus =
    replacementPending && status === "completed" ? "queued" : status;
  const proposedScope = mode === "path" ? normalizePath(path) : null;
  const desiredScope = data?.desiredPagePathScope ?? null;
  const currentScope = data?.currentPagePathScope ?? null;
  const savedScope = isInitialSetup
    ? initialScope.trim()
      ? normalizePath(initialScope)
      : null
    : desiredScope;
  const scopeStateLabel = savedScope
    ? `Page-path scoped · ${savedScope}`
    : "Whole-property scope";
  const hasChanged = proposedScope !== savedScope;

  useEffect(() => {
    if (
      !defaultOpen ||
      (!enabled && !isInitialSetup) ||
      openedFromLinkRef.current
    ) return;
    openedFromLinkRef.current = true;
    setOpen(true);
  }, [defaultOpen, enabled, isInitialSetup]);

  useEffect(() => {
    if (!open || step !== "edit") return;
    if (enabled && !data) return;
    const scope = isInitialSetup
      ? initialScope.trim()
        ? normalizePath(initialScope)
        : null
      : data?.desiredPagePathScope ?? null;
    setMode(scope ? "path" : "property");
    setPath(scope ?? "");
    setPathError(null);
  }, [data, enabled, initialScope, isInitialSetup, open, step]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSaving) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setStep("edit");
      setPathError(null);
      resetSaveError();
    }
  };

  const reviewChange = () => {
    resetSaveError();
    if (mode === "path") {
      const validationError = validatePath(path);
      setPathError(validationError);
      if (validationError) return;
    }
    setPathError(null);
    if (!hasChanged) {
      setOpen(false);
      return;
    }
    if (isInitialSetup && onInitialScopeChange) {
      onInitialScopeChange(proposedScope ?? "");
      setOpen(false);
      return;
    }
    setStep("confirm");
  };

  const submitChange = async () => {
    if (!businessUniqueId || readOnly || isSaving) return;
    try {
      await updateScope({
        businessUniqueId,
        pagePathScope: proposedScope,
      });
      toast.success("GA4 data scope update queued", {
        description: "Analytics will be available after the new scope finishes importing.",
      });
      setOpen(false);
      setStep("edit");
    } catch {
      // The mutation error is shown in the confirmation step.
    }
  };

  const retryImport = async () => {
    if (!businessUniqueId || readOnly || isSaving) return;
    try {
      await updateScope({
        businessUniqueId,
        pagePathScope: desiredScope,
      });
      toast.success("GA4 import queued again");
      setOpen(false);
    } catch {
      // The mutation error is shown inline.
    }
  };

  if ((!enabled || !businessUniqueId) && !isInitialSetup) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "size-8 shrink-0 rounded-md",
          savedScope
            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "border-border bg-general-secondary text-muted-foreground"
        )}
        onClick={() => setOpen(true)}
        aria-label={`${readOnly ? "View" : "Configure"} GA4 data scope for ${domain}. ${scopeStateLabel}`}
        title={`${readOnly ? "View" : "Configure"} GA4 data scope · ${scopeStateLabel}`}
      >
        {isLoading || (isFetching && !data) || isImporting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : displayStatus === "failed" || error ? (
          <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
        ) : (
          <Settings2 className="size-4" aria-hidden="true" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px]" aria-busy={isSaving}>
          {step === "edit" ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-medium">GA4 data scope</DialogTitle>
                <DialogDescription>
                  {isInitialSetup
                    ? `Choose the Analytics scope to use when ${domain} is connected.`
                    : `Choose which Analytics landing-page data Massic imports for ${domain}.`}
                </DialogDescription>
              </DialogHeader>

              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="absolute left-4 top-3.5 size-4" aria-hidden="true" />
                  <div className="pl-6">
                    <AlertTitle>Scope settings could not be loaded</AlertTitle>
                    <AlertDescription className="mt-1">
                      {error.message}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-3 h-7"
                        onClick={() => void refetch()}
                      >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        Retry
                      </Button>
                    </AlertDescription>
                  </div>
                </Alert>
              ) : null}

              {isImporting ? (
                <Alert variant="info">
                  <Loader2 className="absolute left-4 top-3.5 size-4 animate-spin" aria-hidden="true" />
                  <div className="pl-6">
                    <AlertTitle>{formatStage(data?.stage)}</AlertTitle>
                    <AlertDescription className="mt-1">
                      The scope cannot be changed until this import finishes.
                    </AlertDescription>
                    {data?.progress !== null && data?.progress !== undefined ? (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs">
                          <span>Import progress</span>
                          <span>{Math.round(data.progress)}%</span>
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-general-border"
                          role="progressbar"
                          aria-label="GA4 import progress"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={data.progress}
                        >
                          <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{ width: `${data.progress}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Alert>
              ) : null}

              {status === "failed" ? (
                <Alert variant="destructive">
                  <AlertCircle className="absolute left-4 top-3.5 size-4" aria-hidden="true" />
                  <div className="pl-6">
                    <AlertTitle>Analytics import failed</AlertTitle>
                    <AlertDescription className="mt-1">
                      {data?.error || "The scoped Analytics data could not be imported."}
                    </AlertDescription>
                    {!readOnly ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => void retryImport()}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <RefreshCw className="size-4" aria-hidden="true" />
                        )}
                        Retry import
                      </Button>
                    ) : null}
                  </div>
                </Alert>
              ) : null}

              <RadioGroup
                value={mode}
                onValueChange={(value) => {
                  setMode(value as ScopeMode);
                  setPathError(null);
                }}
                disabled={readOnly || isImporting || isLoading}
                aria-label="GA4 data scope"
                className="gap-3"
              >
                <Label
                  htmlFor={`ga4-property-${controlId}`}
                  className={cn(
                    "items-start gap-3 rounded-lg border p-4 leading-5",
                    mode === "property" && "border-primary bg-muted/40",
                    !readOnly && !isImporting && "cursor-pointer"
                  )}
                >
                  <RadioGroupItem
                    id={`ga4-property-${controlId}`}
                    value="property"
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium">Whole GA4 property</span>
                    <span className="block font-normal text-muted-foreground">
                      Import Analytics data for every landing-page path on {domain}.
                    </span>
                  </span>
                </Label>

                <Label
                  htmlFor={`ga4-path-${controlId}`}
                  className={cn(
                    "items-start gap-3 rounded-lg border p-4 leading-5",
                    mode === "path" && "border-primary bg-muted/40",
                    !readOnly && !isImporting && "cursor-pointer"
                  )}
                >
                  <RadioGroupItem
                    id={`ga4-path-${controlId}`}
                    value="path"
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Limit by landing-page path</span>
                    <span className="block font-normal text-muted-foreground">
                      Import only landing pages within one path.
                    </span>
                  </span>
                </Label>
              </RadioGroup>
              <p className="text-xs leading-5 text-muted-foreground">
                GA4 applies this scope to each session&apos;s first landing page.
                Events later in a matching session may occur on other pages.
              </p>

              {mode === "path" ? (
                <div className="space-y-2">
                  <Label htmlFor={`ga4-scope-path-${controlId}`}>Landing-page path</Label>
                  <div className="flex min-w-0 items-center rounded-lg border border-input bg-background shadow-xs focus-within:ring-2 focus-within:ring-ring">
                    <span className="max-w-[55%] truncate border-r px-3 text-sm text-muted-foreground">
                      {domain}
                    </span>
                    <Input
                      id={`ga4-scope-path-${controlId}`}
                      value={path}
                      onChange={(event) => {
                        setPath(event.target.value);
                        if (pathError) setPathError(validatePath(event.target.value));
                      }}
                      onBlur={() => setPathError(validatePath(path))}
                      placeholder="/landing-page"
                      className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0"
                      disabled={readOnly || isImporting}
                      aria-invalid={Boolean(pathError)}
                      aria-describedby={
                        pathError
                          ? `ga4-scope-path-error-${controlId}`
                          : `ga4-scope-path-help-${controlId}`
                      }
                    />
                  </div>
                  {pathError ? (
                    <p
                      id={`ga4-scope-path-error-${controlId}`}
                      className="text-xs text-destructive"
                    >
                      {pathError}
                    </p>
                  ) : (
                    <p
                      id={`ga4-scope-path-help-${controlId}`}
                      className="text-xs text-muted-foreground"
                    >
                      Start with /. Do not include the domain, query parameters, or a fragment.
                    </p>
                  )}
                </div>
              ) : null}

              {isInitialSetup ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  This scope will be applied when you save the GA4 property.
                </div>
              ) : (
              <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Current imported scope</p>
                  <p className="mt-1 truncate text-sm" title={scopeLabel(currentScope, domain)}>
                    {scopeLabel(currentScope, domain)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Proposed scope</p>
                  <p className="mt-1 truncate text-sm" title={scopeLabel(proposedScope, domain)}>
                    {scopeLabel(proposedScope, domain)}
                  </p>
                </div>
              </div>
              )}

              {readOnly ? (
                <Alert>
                  <AlertTitle>View only</AlertTitle>
                  <AlertDescription>
                    You do not have permission to change this business&apos;s GA4 data scope.
                  </AlertDescription>
                </Alert>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSaving}
                >
                  Close
                </Button>
                {!readOnly ? (
                  <Button
                    type="button"
                    onClick={reviewChange}
                    disabled={
                      (!isInitialSetup && isLoading) ||
                      isImporting ||
                      Boolean(error)
                    }
                  >
                    {hasChanged
                      ? isInitialSetup
                        ? "Apply scope"
                        : "Review change"
                      : "Done"}
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-medium">Confirm GA4 scope change</DialogTitle>
                <DialogDescription>
                  Review the impact before Massic replaces the Analytics dataset.
                </DialogDescription>
              </DialogHeader>

              <Alert variant="warning">
                <TriangleAlert className="absolute left-4 top-3.5 size-4" aria-hidden="true" />
                <div className="pl-6">
                  <AlertTitle>This starts a full Analytics reimport</AlertTitle>
                  <AlertDescription className="mt-2">
                    <ul className="list-disc space-y-1 pl-4">
                      <li>Existing imported GA4 data will be deleted and reimported for up to 16 months.</li>
                      <li>Analytics will be temporarily unavailable until the import finishes.</li>
                      <li>Google Search Console data is unaffected.</li>
                      <li>Previously generated reports are preserved.</li>
                    </ul>
                  </AlertDescription>
                </div>
              </Alert>

              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Database className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Change</p>
                    <p className="mt-1 break-words text-sm">
                      {scopeLabel(currentScope, domain)}
                      <span className="mx-2 text-muted-foreground" aria-hidden="true">→</span>
                      {scopeLabel(proposedScope, domain)}
                    </p>
                  </div>
                </div>
              </div>

              {saveError ? (
                <Alert variant="destructive">
                  <AlertCircle className="absolute left-4 top-3.5 size-4" aria-hidden="true" />
                  <div className="pl-6">
                    <AlertTitle>Scope change was not saved</AlertTitle>
                    <AlertDescription className="mt-1">{saveError.message}</AlertDescription>
                  </div>
                </Alert>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetSaveError();
                    setStep("edit");
                  }}
                  disabled={isSaving}
                >
                  Back
                </Button>
                <Button type="button" onClick={() => void submitChange()} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Queuing reimport…
                    </>
                  ) : (
                    "Confirm and reimport"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
