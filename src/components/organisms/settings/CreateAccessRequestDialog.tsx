"use client";

import React, { useState, useMemo } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check } from "lucide-react";
import { useAgencyInfo } from "@/hooks/use-agency-settings";
import { useGoogleAccounts } from "@/hooks/use-google-accounts";
import { useCreateAccessRequest, useShareAccessRequest } from "@/hooks/use-access-requests";
import { useFetchBusinesses, type FetchBusinessesResponse } from "@/hooks/use-linked-businesses";
import { PRODUCT_CONFIG, ALL_PRODUCTS } from "@/config/access-request";
import { ProductIcon } from "@/components/organisms/access-request/ProductIcon";
import { MultiEmailInput } from "@/components/molecules/MultiEmailInput";
import type { Product, AccessRequest } from "@/types/access-request";
import { isValidWebsiteUrl as isWebsiteUrlFormatValid } from "@/utils/utils";
import { findExistingAccess, type ExistingAccessMatch } from "@/utils/existing-access-match";

interface CreateAccessRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedBusinessesData?: FetchBusinessesResponse;
}

type AccessRequestFormValues = {
  websiteUrl: string;
};

function getWebsiteUrlError(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Website URL is required.";
  }

  return isWebsiteUrlFormatValid(trimmed)
    ? undefined
    : "Enter a valid website URL.";
}

export function CreateAccessRequestDialog({
  open,
  onOpenChange,
  linkedBusinessesData,
}: CreateAccessRequestDialogProps) {
 const { agencyDetails } = useAgencyInfo();
 const { connectGoogleAccount } = useGoogleAccounts();
 const createMutation = useCreateAccessRequest();
 const shareMutation = useShareAccessRequest(null);
 const { data: fetchedBusinessesData } = useFetchBusinesses();
 const businessesData = linkedBusinessesData ?? fetchedBusinessesData;
  const form = useForm({
    defaultValues: {
      websiteUrl: "",
    } satisfies AccessRequestFormValues,
  });

  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [roles, setRoles] = useState<Partial<Record<Product, string>>>({});
 const [expiresInDays, setExpiresInDays] = useState(30);
 const [createdRequest, setCreatedRequest] = useState<AccessRequest | null>(null);
 const [linkCopied, setLinkCopied] = useState(false);
 const [shareEmails, setShareEmails] = useState<string[]>([]);
 const [existingAccessMatches, setExistingAccessMatches] = useState<ExistingAccessMatch[] | null>(null);

  const linkedAccounts = useMemo(() => {
    if (
      Array.isArray(agencyDetails) &&
      agencyDetails.length > 0 &&
      agencyDetails[0]?.AuthId
    ) {
      return agencyDetails.map((a: any) => ({
        email: a.DisplayName || a.email || "",
        AuthId: a.AuthId,
      }));
    }
    return [];
  }, [agencyDetails]);

  const websiteUrl = useStore(
    form.store,
    (state: any) => state.values.websiteUrl
  ) as string;
  const trimmedWebsiteUrl = websiteUrl.trim();
  const websiteUrlError = getWebsiteUrlError(websiteUrl);

  function toggleProduct(product: Product) {
    setSelectedProducts((prev) => {
      if (prev.includes(product)) {
        const next = prev.filter((p) => p !== product);
        const newRoles = { ...roles };
        delete newRoles[product];
        setRoles(newRoles);
        return next;
      }
      setRoles((r) => ({ ...r, [product]: PRODUCT_CONFIG[product].defaultRole }));
      return [...prev, product];
    });
  }

  function resetForm() {
    setSelectedEmail("");
    form.reset();
    setSelectedProducts([]);
    setRoles({});
 setExpiresInDays(30);
 setCreatedRequest(null);
 setLinkCopied(false);
 setShareEmails([]);
 setExistingAccessMatches(null);
 }

  function handleClose(isOpen: boolean) {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  }

  async function handleSubmit() {
    if (!selectedEmail) {
      toast.error("Please select a Google account");
      return;
    }

    const currentWebsiteUrl = form.state.values.websiteUrl;
    const currentWebsiteUrlError = getWebsiteUrlError(currentWebsiteUrl);
    form.setFieldMeta("websiteUrl", (prev: any) => ({
      ...prev,
      isTouched: true,
      isValid: !currentWebsiteUrlError,
      errors: currentWebsiteUrlError
        ? [{ message: currentWebsiteUrlError }]
        : [],
      errorMap: currentWebsiteUrlError
        ? { onChange: [{ message: currentWebsiteUrlError }] }
        : {},
      hasValidationErrors: Boolean(currentWebsiteUrlError),
    }));

    if (currentWebsiteUrlError) {
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    const matches = findExistingAccess(currentWebsiteUrl.trim(), businessesData, selectedProducts);
    if (matches.length > 0) {
      setExistingAccessMatches(matches);
      return;
    }

    await performCreate();
  }

  async function performCreate() {
    try {
      const result = await createMutation.mutateAsync({
        agencyEmail: selectedEmail,
        websiteUrl: trimmedWebsiteUrl,
        products: selectedProducts,
        roles,
        expiresInDays,
      });
 setCreatedRequest(result);
 if (shareEmails.length > 0) {
 await shareMutation.mutateAsync({ requestId: result.id, emails: shareEmails });
 toast.success("Access request created and shared successfully");
 } else {
 toast.success("Access request created successfully");
 }
  } catch (err: any) {
    toast.error(err?.message || "Failed to create request");
  }
}

  function copyLink() {
    if (!createdRequest) return;
    const url =
      createdRequest.requestUrl ||
      `${window.location.origin}/google-access/r/${createdRequest.token}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setLinkCopied(false), 2000);
  }

 const isSubmitting = createMutation.isPending || shareMutation.isPending;

  if (existingAccessMatches) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>You may already have access</DialogTitle>
            <DialogDescription>
              One or more linked Google accounts can already access {trimmedWebsiteUrl}. Here&apos;s
              exactly what was found.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] space-y-5 overflow-y-auto pr-1">
            {existingAccessMatches.map((match) => (
              <div key={match.product} className="space-y-2">
                <div className="flex items-center gap-2">
                  <ProductIcon product={match.product} size={18} />
                  <span className="text-sm font-medium">{PRODUCT_CONFIG[match.product].label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {match.details.length} {match.details.length === 1 ? "match" : "matches"}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {match.details.map((detail, index) => (
                    <div
                      key={`${match.product}-${detail.name}-${index}`}
                      className="rounded-lg border border-general-border px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{detail.name}</p>
                          {detail.subLabel && (
                            <p className="truncate text-xs text-general-muted-foreground">
                              {detail.subLabel}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-general-muted-foreground">
                          {detail.emailId ? `via ${detail.emailId}` : "already linked"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExistingAccessMatches(null)}>
              Go back
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={async () => {
                setExistingAccessMatches(null);
                await performCreate();
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create request anyway"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (createdRequest) {
    const requestUrl =
      createdRequest.requestUrl ||
      `${window.location.origin}/google-access/r/${createdRequest.token}`;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Access Request Created</DialogTitle>
            <DialogDescription>
              Share this link with your client. They can use it to grant access
              to the selected Google products.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {createdRequest.products.map((p) => (
                <Badge key={p} variant="outline" className="text-xs">
                  {PRODUCT_CONFIG[p]?.shortLabel || p.toUpperCase()}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={requestUrl}
                className="text-xs font-mono bg-muted"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={copyLink}
                className="shrink-0"
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-general-muted-foreground">
              This link expires on{" "}
              {new Date(createdRequest.expiresAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Google Access</DialogTitle>
          <DialogDescription>
            Generate an access request link to send to your client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Agency Email Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              <span className="text-destructive mr-0.5">*</span>
              Agency Email
            </Label>
            {linkedAccounts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-general-border p-4 text-center">
                <p className="text-sm text-general-muted-foreground mb-3">
                  Link a Google account first to create access requests.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={connectGoogleAccount}
                >
                  Connect Google Account
                </Button>
              </div>
            ) : (
              <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a linked Google account" />
                </SelectTrigger>
                <SelectContent>
                  {linkedAccounts.map((account) => (
                    <SelectItem key={account.AuthId} value={account.email}>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-general-primary/10 flex items-center justify-center text-[10px] font-semibold text-general-primary">
                          {account.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-mono text-sm">{account.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

{/* Website URL */}
          <form.Field
            name="websiteUrl"
            validators={{
              onChange: ({ value }) => {
                const error = getWebsiteUrlError(value);
                return error ? { message: error } : undefined;
              },
            }}
          >
            {(field) => {
              const showError =
                (field.state.meta.isTouched || Boolean(field.state.value)) &&
                !field.state.meta.isValid &&
                field.state.meta.errors?.length > 0;

              return (
                <Field data-invalid={showError}>
                  <FieldLabel htmlFor={field.name} className="gap-0">
                    <span className="text-destructive mr-0.5">*</span>
                    Website URL
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="text"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="example.com"
                    autoComplete="url"
                    aria-invalid={showError}
                  />
                  {showError && (
                    <FieldError
                      className="text-xs mt-0.5"
                      errors={field.state.meta.errors}
                    />
                  )}
                </Field>
              );
            }}
          </form.Field>

          {/* Products Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Products</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {ALL_PRODUCTS.map((product) => {
                const config = PRODUCT_CONFIG[product];
                const isSelected = selectedProducts.includes(product);
                return (
                  <div
                    key={product}
                    className={`rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "border-general-primary bg-general-primary/5"
                        : "border-general-border hover:border-general-border-three"
                    }`}
                    onClick={() => toggleProduct(product)}
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        className="cursor-pointer"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleProduct(product)}
                      />
                      <ProductIcon product={product} size={18} />
                      <span className="text-sm font-medium flex-1 min-w-0 truncate">
                        {config.label}
                      </span>
                      {!config.automated && config.showManualBadge !== false && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-orange-200 text-orange-600 bg-orange-50 shrink-0"
                        >
                          Manual
                        </Badge>
                      )}
                      <Select
                        value={roles[product] || config.defaultRole}
                        onValueChange={(val) =>
                          setRoles((r) => ({ ...r, [product]: val }))
                        }
                        disabled={!isSelected}
                      >
                        <SelectTrigger
                          className={`min-w-[104px] w-[120px] shrink-0 ${
                            !isSelected ? "opacity-40" : ""
                          }`}
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectValue placeholder="Access level" />
                        </SelectTrigger>
                        <SelectContent>
                          {config.roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
 })}
 </div>
 </div>

 {/* Share */}
 <div className="space-y-2">
 <Label className="text-sm font-medium">Share link via email</Label>
 <MultiEmailInput
 value={shareEmails}
 onChange={setShareEmails}
 disabled={isSubmitting}
 placeholder="enter.client@email.com, another@email.com"
 />
 <p className="text-xs text-general-muted-foreground">
 We&apos;ll email a unique access link to each recipient.
 </p>
 </div>

 {/* Expiry */}
 <div className="space-y-2">
            <Label className="text-sm font-medium">Link Expiry (days)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={expiresInDays}
              onChange={(e) =>
                setExpiresInDays(Math.max(1, parseInt(e.target.value, 10) || 30))
              }
              className="w-24"
            />
            <p className="text-xs text-general-muted-foreground">
              The link will expire after {expiresInDays} day
              {expiresInDays !== 1 ? "s" : ""}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !selectedEmail ||
              !trimmedWebsiteUrl ||
              Boolean(websiteUrlError) ||
              selectedProducts.length === 0 ||
              linkedAccounts.length === 0
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
