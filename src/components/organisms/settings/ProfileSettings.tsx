"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GenericInput } from "@/components/ui/generic-input";
import { Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { useBusinessStore } from "@/store/business-store";
import LinkedBusinessTable from "./LinkedBusinessTable";
import {
  useAgencyInfo,
  useUpdateAgencyInfo,
  useUploadLogo,
} from "@/hooks/use-agency-settings";
import { useGoogleAccounts } from "@/hooks/use-google-accounts";
import { Typography } from "@/components/ui/typography";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUnlinkGoogleAccount } from "@/hooks/use-unlink-google-account";

const agencyFormSchema = z.object({
  agencyName: z.string().min(1, "Agency Name is required"),
  agencyWebsite: z
    .string()
    .min(1, "Agency Website is required")
    .url("Please enter a valid URL"),
  emailAddress: z
    .string()
    .min(1, "Email Address is required")
    .email("Please enter a valid email address"),
  logo: z.string(),
});

type AgencyFormData = z.infer<typeof agencyFormSchema>;

type GoogleAccount = {
  email: string;
  profileImage?: string;
  AuthId?: string;
  DisplayName?: string;
};

function GoogleConnectButton() {
  const { connectGoogleAccount } = useGoogleAccounts();

  return (
    <Button variant="outline" className="w-full" onClick={connectGoogleAccount}>
      <svg
        className="h-4 w-4 mr-2"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Add Account
    </Button>
  );
}

export function ProfileSettings() {
  const { profileDataByUniqueID } = useBusinessStore();
  const { agencyInfo, agencyDetails } = useAgencyInfo();
  const updateAgencyMutation = useUpdateAgencyInfo();
  const uploadLogoMutation = useUploadLogo();
  const unlinkGoogleAccount = useUnlinkGoogleAccount();

  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<GoogleAccount | null>(null);

  // Use agencyDetails from API or fallback to empty
  const linkedGoogleAccounts: GoogleAccount[] = useMemo(() => {
    if (
      Array.isArray(agencyDetails) &&
      agencyDetails.length > 0 &&
      agencyDetails[0]?.AuthId
    ) {
      return agencyDetails.map((agency: any) => ({
        email: agency.DisplayName || agency.email || "",
        profileImage: undefined,
        AuthId: agency.AuthId,
        DisplayName: agency.DisplayName,
      }));
    }
    return [];
  }, [agencyDetails]);

  const businessName =
    profileDataByUniqueID?.Name ||
    profileDataByUniqueID?.DisplayName ||
    agencyInfo.name ||
    "Your Agency";

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  // Track if form has been initialized with API data
  const [formInitialized, setFormInitialized] = useState(false);

  const agencyForm = useForm({
    defaultValues: {
      agencyName: agencyInfo.name || "",
      agencyWebsite: agencyInfo.website || "",
      emailAddress: agencyInfo.email || "",
      logo: agencyInfo.logo || "",
    },
    validators: {
      onBlur: agencyFormSchema,
      onSubmit: agencyFormSchema,
    },
    onSubmit: async ({ value }) => {
      await updateAgencyMutation.mutateAsync({
        agencyName: value.agencyName,
        agencyWebsite: value.agencyWebsite,
      });
    },
  });

  // Update form when agencyInfo loads
  useEffect(() => {
    if (!formInitialized && agencyInfo.email) {
      agencyForm.setFieldValue("agencyName", agencyInfo.name || "");
      agencyForm.setFieldValue("agencyWebsite", agencyInfo.website || "");
      agencyForm.setFieldValue("emailAddress", agencyInfo.email || "");
      agencyForm.setFieldValue("logo", agencyInfo.logo || "");
      setFormInitialized(true);
    }
  }, [agencyInfo, formInitialized]);

  const handleLogoUpload = async (file: File) => {
    try {
      const logoUrl = await uploadLogoMutation.mutateAsync(file);
      agencyForm.setFieldValue("logo", logoUrl);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const isSubmitting = updateAgencyMutation.isPending;
  const isUploadingLogo = uploadLogoMutation.isPending;

  return (
    <div className="space-y-6">
      <Card variant="profileCard" className="p-4 bg-white border-none">
        <CardHeader className="pb-6">
          <CardTitle>
            <Typography variant="h4">Agency Info</Typography>
          </CardTitle>
        </CardHeader>
        <CardContent className="">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              agencyForm.handleSubmit();
            }}
          >
            <div className="flex gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {/* Agency Name */}
                <agencyForm.Field
                  name="agencyName"
                  children={(field) => (
                    <Card variant="profileCard">
                      <CardContent>
                        <GenericInput<AgencyFormData>
                          formField={field}
                          type="input"
                          inputVariant="noBorder"
                          label="Agency Name"
                          required={true}
                          placeholder="Provide the name of your agency"
                        />
                      </CardContent>
                    </Card>
                  )}
                />

                {/* Agency Website */}
                <agencyForm.Field
                  name="agencyWebsite"
                  children={(field) => (
                    <Card variant="profileCard">
                      <CardContent>
                        <GenericInput<AgencyFormData>
                          formField={field}
                          type="url"
                          inputVariant="noBorder"
                          label="Agency Website"
                          required={true}
                          placeholder="Provide the official url of your agency website"
                        />
                      </CardContent>
                    </Card>
                  )}
                />

                {/* Email Address */}
                <agencyForm.Field
                  name="emailAddress"
                  children={(field) => (
                    <Card variant="profileCard">
                      <CardContent>
                        <GenericInput<AgencyFormData>
                          formField={field}
                          type="email"
                          inputVariant="noBorder"
                          label="Email Address"
                          disabled={true}
                          placeholder="Provide the primary contact email for your agency"
                        />
                      </CardContent>
                    </Card>
                  )}
                />
              </div>

              <div className="shrink-0">
                {/* Logo */}
                <agencyForm.Field
                  name="logo"
                  children={(logoField) => (
                    <Card variant="profileCard">
                      <CardContent>
                        <div
                          onClick={() => {
                            if (!isUploadingLogo) {
                              const fileInput = document.createElement("input");
                              fileInput.type = "file";
                              fileInput.accept =
                                "image/png,image/jpeg,image/jpg";
                              fileInput.onchange = (e) => {
                                const file = (e.target as HTMLInputElement)
                                  .files?.[0];
                                if (file) {
                                  handleLogoUpload(file);
                                }
                              };
                              fileInput.click();
                            }
                          }}
                          className={`
                          relative w-[182px] h-[182px] rounded-lg border-2 border-dashed 
                          border-muted bg-muted/30 flex flex-col items-center justify-center 
                          cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50
                          ${isUploadingLogo
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                            }
                        `}
                        >
                          {logoField.state.value ? (
                            <>
                              <img
                                src={logoField.state.value}
                                alt="Agency Logo"
                                className="absolute inset-0 w-full h-full rounded-lg object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                {isUploadingLogo ? (
                                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                                ) : (
                                  <>
                                    <Upload className="h-8 w-8 text-white mb-2" />
                                    <span className="text-sm text-white font-medium">
                                      Replace
                                    </span>
                                  </>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              {isUploadingLogo ? (
                                <Loader2 className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
                              ) : (
                                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                              )}
                              <span className="text-sm font-medium text-muted-foreground mb-1">
                                Upload Thumbnail
                              </span>
                              <span className="text-xs text-muted-foreground">
                                .png, .jpeg, .jpg
                              </span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card variant="profileCard" className="p-4 bg-white border-none">
        <CardHeader className="pb-6 flex items-center justify-between">
          <CardTitle className="flex items-center justify-between">
            <Typography variant="h4">Linked Google Accounts</Typography>
          </CardTitle>
          <div className="flex flex-col gap-3">
            <GoogleConnectButton />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
            {/* Linked Accounts List */}
            <div className="lg:col-span-1 space-y-3">
              {linkedGoogleAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  No Google accounts linked yet. Click "Add Account" to connect
                  your first Google account.
                </p>
              ) : (
                linkedGoogleAccounts.map((account, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-general-border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full  border flex items-center justify-center overflow-hidden">
                        {account.profileImage ? (
                          <img
                            src={account.profileImage}
                            alt={account.email}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold">
                            {getInitials(account.email)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-mono text-general-unofficial-foreground-alt">
                          {account.email}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!account.AuthId || unlinkGoogleAccount.isPending}
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (!account.AuthId) return;
                          setSelectedAccount(account);
                          setUnlinkDialogOpen(true);
                        }}
                        aria-label="Unlink Google account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={unlinkDialogOpen}
        onOpenChange={(open) => {
          setUnlinkDialogOpen(open);
          if (!open) setSelectedAccount(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Google account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect the Google account and deactivate its linked business profiles. You can reconnect later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinkGoogleAccount.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedAccount?.AuthId || unlinkGoogleAccount.isPending}
              onClick={async (e) => {
                e.preventDefault();
                if (!selectedAccount?.AuthId) return;
                try {
                  await unlinkGoogleAccount.mutateAsync({ authId: selectedAccount.AuthId });
                  toast.success("Google account unlinked");
                  setUnlinkDialogOpen(false);
                  setSelectedAccount(null);
                } catch (error: any) {
                  toast.error("Failed to unlink Google account", {
                    description: error?.message || "Please try again later.",
                    descriptionClassName: "text-destructive-foreground/90",
                  });
                }
              }}
            >
              {unlinkGoogleAccount.isPending ? "Unlinking..." : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LinkedBusinessTable />
    </div>
  );
}
