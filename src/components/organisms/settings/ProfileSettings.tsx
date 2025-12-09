"use client";

import React from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GenericInput } from "@/components/ui/generic-input";
import { Upload } from "lucide-react";
import { useBusinessStore } from "@/store/business-store";
import LinkedBusinessTable from "./LinkedBusinessTable";

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
};

const linkedGoogleAccounts: GoogleAccount[] = [
  {
    email: "gsd@kanahiku.com",
    profileImage: undefined, // Will use initial if not provided
  },
  {
    email: "alex@nkpmedical.com",
    profileImage: undefined, // Will use initial if not provided
  },
];

export function ProfileSettings() {
  const { profileDataByUniqueID } = useBusinessStore();
  const businessName = profileDataByUniqueID?.Name || profileDataByUniqueID?.DisplayName || "Kanahiku";
  
  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };
  
  const agencyForm = useForm({
    defaultValues: {
      agencyName: "GSD Admin",
      agencyWebsite: profileDataByUniqueID?.Website || "http://www.kanahiku.com",
      emailAddress: "gsd@kanahiku.com",
      logo: "",
    },
    validators: {
      onChange: agencyFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        // Handle save agency info
        console.log("Save agency info:", value);
        
        // Simulate API call - replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        toast.success("Agency information saved successfully!");
      } catch (error) {
        console.error("Error saving agency info:", error);
        toast.error("Failed to save agency information", {
          description: error instanceof Error ? error.message : "Please try again later.",
        });
        throw error;
      }
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agency Info</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              agencyForm.handleSubmit();
            }}
            className="space-y-4"
          >
            {/* Logo and Business Name Display */}
            <agencyForm.Field
              name="logo"
              children={(logoField) => (
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative">
                    {logoField.state.value ? (
                      <img
                        src={logoField.state.value}
                        alt="Agency Logo"
                        className="h-12 w-12 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted border flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{businessName}</h2>
                  </div>
                </div>
              )}
            />
            
            <agencyForm.Field
              name="agencyName"
              children={(field) => (
                <GenericInput<AgencyFormData>
                  formField={field}
                  type="input"
                  label="Agency Name"
                />
              )}
            />
            
            <agencyForm.Field
              name="agencyWebsite"
              children={(field) => (
                <GenericInput<AgencyFormData>
                  formField={field}
                  type="url"
                  label="Agency Website"
                />
              )}
            />
            
            <agencyForm.Field
              name="emailAddress"
              children={(field) => (
                <GenericInput<AgencyFormData>
                  formField={field}
                  type="email"
                  label="Email Address"
                  disabled={true}
                />
              )}
            />
            
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const fileInput = document.createElement("input");
                  fileInput.type = "file";
                  fileInput.accept = "image/*";
                  fileInput.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      // Create preview
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const result = reader.result as string;
                        agencyForm.setFieldValue("logo", result);
                        toast.success("Logo uploaded successfully!");
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  fileInput.click();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Google Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Linked Accounts List */}
            <div className="lg:col-span-2 space-y-3">
              {linkedGoogleAccounts.map((account, index) => (
                <div key={index} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500 border flex items-center justify-center overflow-hidden">
                      {account.profileImage ? (
                        <img
                          src={account.profileImage}
                          alt={account.email}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-white text-xs font-semibold">
                          {getInitials(account.email)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{account.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Account Section */}
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Handle add Google account
                  console.log("Add Google account");
                  toast.info("Add Google account functionality");
                }}
              >
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
              <p className="text-xs text-muted-foreground">
                Connect additional Google accounts to view all your sites in a single dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <LinkedBusinessTable />
    </div>
  );
}

