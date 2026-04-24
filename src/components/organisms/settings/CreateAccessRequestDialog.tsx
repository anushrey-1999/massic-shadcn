"use client";

import React, { useState, useMemo } from "react";
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
import { useCreateAccessRequest } from "@/hooks/use-access-requests";
import { PRODUCT_CONFIG, ALL_PRODUCTS } from "@/config/access-request";
import { ProductIcon } from "@/components/organisms/access-request/ProductIcon";
import type { Product, AccessRequest } from "@/types/access-request";

interface CreateAccessRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAccessRequestDialog({
  open,
  onOpenChange,
}: CreateAccessRequestDialogProps) {
  const { agencyDetails } = useAgencyInfo();
  const { connectGoogleAccount } = useGoogleAccounts();
  const createMutation = useCreateAccessRequest();

  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [roles, setRoles] = useState<Partial<Record<Product, string>>>({});
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [createdRequest, setCreatedRequest] = useState<AccessRequest | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

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
    setSelectedProducts([]);
    setRoles({});
    setExpiresInDays(30);
    setCreatedRequest(null);
    setLinkCopied(false);
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
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        agencyEmail: selectedEmail,
        products: selectedProducts,
        roles,
        expiresInDays,
      });
      setCreatedRequest(result);
      toast.success("Access request created successfully");
    } catch (err: any) {
      toast.error("Failed to create request", {
        description: err?.message || "Please try again",
      });
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

  const isSubmitting = createMutation.isPending;

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
          <DialogTitle>Create Access Request</DialogTitle>
          <DialogDescription>
            Generate a link to request access to a client&apos;s Google accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Agency Email Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Agency Email</Label>
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
