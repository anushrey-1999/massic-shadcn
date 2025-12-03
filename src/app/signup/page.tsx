"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { Separator } from "@/components/ui/separator";
import { useLogin, useGoogleLogin, useSignup } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { useSignupStore, SignupStep, UserType } from "@/store/signup-store";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Mail, Building2, Briefcase, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function InitialStep({
  onGoogleSuccess,
  onGoogleError,
  onEmailClick,
  isLoading,
}: {
  onGoogleSuccess: (response: CredentialResponse) => void;
  onGoogleError: () => void;
  onEmailClick: () => void;
  isLoading: boolean;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome to Massic</CardTitle>
        <CardDescription>Create your account to get started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <GoogleLogin onSuccess={onGoogleSuccess} onError={onGoogleError} />
        </div>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground uppercase">or</span>
          <Separator className="flex-1" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={onEmailClick}
          disabled={isLoading}
        >
          <Mail className="mr-2 h-4 w-4" />
          Continue with Email
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline hover:text-foreground">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function EmailFormStep({
  onBack,
  onContinue,
  isLoading,
}: {
  onBack: () => void;
  onContinue: () => void;
  isLoading: boolean;
}) {
  const { userSignupData, setUserSignupData } = useSignupStore();

  const handleContinue = () => {
    if (
      !userSignupData.firstName.trim() ||
      !userSignupData.lastName.trim() ||
      !userSignupData.email.trim() ||
      !userSignupData.password.trim() ||
      !userSignupData.confirmPassword.trim()
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    if (userSignupData.password !== userSignupData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (userSignupData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    onContinue();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Continue with Email</CardTitle>
        <CardDescription>Please enter your details below</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <GenericInput
            type="input"
            label="First Name"
            placeholder="Enter your first name"
            value={userSignupData.firstName}
            onChange={(e) => setUserSignupData({ firstName: e.target.value })}
            required
            disabled={isLoading}
          />
          <GenericInput
            type="input"
            label="Last Name"
            placeholder="Enter your last name"
            value={userSignupData.lastName}
            onChange={(e) => setUserSignupData({ lastName: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>

        <GenericInput
          type="email"
          label="Email"
          placeholder="Enter your email"
          value={userSignupData.email}
          onChange={(e) => setUserSignupData({ email: e.target.value })}
          required
          disabled={isLoading}
        />

        <GenericInput
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={userSignupData.password}
          onChange={(e) => setUserSignupData({ password: e.target.value })}
          required
          disabled={isLoading}
        />

        <GenericInput
          type="password"
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={userSignupData.confirmPassword}
          onChange={(e) =>
            setUserSignupData({ confirmPassword: e.target.value })
          }
          required
          disabled={isLoading}
        />

        <div className="flex gap-4 pt-2">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isLoading}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UserTypeSelectionStep({
  onBack,
  onContinue,
  isLoading,
}: {
  onBack: () => void;
  onContinue: (userType: UserType) => void;
  isLoading: boolean;
}) {
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose Your Account Type</CardTitle>
        <CardDescription>
          Select the type that best describes you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedType("AGENCY")}
          disabled={isLoading}
          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${selectedType === "AGENCY"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Agency</h3>
              <p className="text-sm text-muted-foreground">
                I manage SEO for multiple clients and businesses
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedType("BUSINESS")}
          disabled={isLoading}
          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${selectedType === "BUSINESS"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Business</h3>
              <p className="text-sm text-muted-foreground">
                I want to manage SEO for my own business
              </p>
            </div>
          </div>
        </button>

        <div className="flex gap-4 pt-2">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => selectedType && onContinue(selectedType)}
            disabled={isLoading || !selectedType}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AgencyWorkspaceStep({
  onBack,
  onSubmit,
  isLoading,
}: {
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  const { agencyData, setAgencyData } = useSignupStore();

  const handleSubmit = () => {
    if (!agencyData.agencyName.trim() || !agencyData.website.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    onSubmit();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Your Agency Workspace</CardTitle>
        <CardDescription>
          Set up your agency profile to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GenericInput
          type="input"
          label="Agency Name"
          placeholder="Enter your agency name"
          value={agencyData.agencyName}
          onChange={(e) => setAgencyData({ agencyName: e.target.value })}
          required
          disabled={isLoading}
        />

        <GenericInput
          type="url"
          label="Website"
          placeholder="https://www.youragency.com"
          value={agencyData.website}
          onChange={(e) => setAgencyData({ website: e.target.value })}
          required
          disabled={isLoading}
        />

        <div className="flex gap-4 pt-2">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Workspace"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessProfileStep({
  onBack,
  onSubmit,
  isLoading,
}: {
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  const { businessData, setBusinessData } = useSignupStore();

  const handleSubmit = () => {
    if (!businessData.businessName.trim() || !businessData.website.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    onSubmit();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Your Business Profile</CardTitle>
        <CardDescription>
          Set up your business to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GenericInput
          type="input"
          label="Business Name"
          placeholder="Enter your business name"
          value={businessData.businessName}
          onChange={(e) => setBusinessData({ businessName: e.target.value })}
          required
          disabled={isLoading}
        />

        <GenericInput
          type="url"
          label="Website"
          placeholder="https://www.yourbusiness.com"
          value={businessData.website}
          onChange={(e) => setBusinessData({ website: e.target.value })}
          required
          disabled={isLoading}
        />

        <div className="flex gap-4 pt-2">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isLoading}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Profile"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const {
    step,
    userType,
    userSignupData,
    agencyData,
    businessData,
    setStep,
    setUserType,
    setUserSignupData,
    reset,
  } = useSignupStore();

  const login = useLogin();
  const googleLogin = useGoogleLogin();
  const signup = useSignup();

  const isLoading = login.isPending || googleLogin.isPending || signup.isPending;

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast.error("Google signup failed: No credential received");
      return;
    }

    try {
      await googleLogin.mutateAsync({
        token: credentialResponse.credential,
      });

      toast.success("Login successful!");
      router.push("/");
    } catch (error: any) {
      if (error.userNotFound) {
        toast.info("Account not found. Let's create one!");
        const googleDetails = error.googleUserDetails;
        setUserSignupData({
          email: googleDetails?.email || "",
          firstName: googleDetails?.firstName || "",
          lastName: googleDetails?.lastName || "",
          googleToken: credentialResponse.credential,
        });
        setStep("userTypeSelection");
        return;
      }
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Google signup failed.";
      toast.error(errorMessage);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google signup failed. Please try again.");
  };

  const handleEmailClick = () => {
    setStep("emailForm");
  };

  const handleEmailFormContinue = () => {
    setStep("userTypeSelection");
  };

  const handleUserTypeSelection = (selectedUserType: UserType) => {
    setUserType(selectedUserType);
    if (selectedUserType === "AGENCY") {
      setStep("agencyWorkspace");
    } else {
      setStep("businessProfile");
    }
  };

  const handleAgencySubmit = async () => {
    try {
      await signup.mutateAsync({
        email: userSignupData.email,
        password: userSignupData.password,
        firstName: userSignupData.firstName,
        lastName: userSignupData.lastName,
        orgName: agencyData.agencyName,
        userType: "AGENCY",
        signupMethod: userSignupData.googleToken ? "GOOGLE" : "EMAIL",
        ...(userSignupData.googleToken && {
          googleToken: userSignupData.googleToken,
        }),
      });

      toast.success("Account created successfully!");
      router.push("/");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create workspace";
      toast.error(errorMessage);
    }
  };

  const handleBusinessSubmit = async () => {
    try {
      await signup.mutateAsync({
        email: userSignupData.email,
        password: userSignupData.password,
        firstName: userSignupData.firstName,
        lastName: userSignupData.lastName,
        orgName: businessData.businessName,
        userType: "BUSINESS",
        signupMethod: userSignupData.googleToken ? "GOOGLE" : "EMAIL",
        ...(userSignupData.googleToken && {
          googleToken: userSignupData.googleToken,
        }),
      });

      toast.success("Account created successfully!");
      router.push("/");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create profile";
      toast.error(errorMessage);
    }
  };

  const handleBack = (targetStep: SignupStep) => {
    setStep(targetStep);
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-background p-8">
      {step === "initial" && (
        <InitialStep
          onGoogleSuccess={handleGoogleSuccess}
          onGoogleError={handleGoogleError}
          onEmailClick={handleEmailClick}
          isLoading={isLoading}
        />
      )}

      {step === "emailForm" && (
        <EmailFormStep
          onBack={() => handleBack("initial")}
          onContinue={handleEmailFormContinue}
          isLoading={isLoading}
        />
      )}

      {step === "userTypeSelection" && (
        <UserTypeSelectionStep
          onBack={() =>
            handleBack(userSignupData.googleToken ? "initial" : "emailForm")
          }
          onContinue={handleUserTypeSelection}
          isLoading={isLoading}
        />
      )}

      {step === "agencyWorkspace" && (
        <AgencyWorkspaceStep
          onBack={() => handleBack("userTypeSelection")}
          onSubmit={handleAgencySubmit}
          isLoading={isLoading}
        />
      )}

      {step === "businessProfile" && (
        <BusinessProfileStep
          onBack={() => handleBack("userTypeSelection")}
          onSubmit={handleBusinessSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
