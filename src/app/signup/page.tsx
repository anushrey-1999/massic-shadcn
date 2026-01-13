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
import { Mail, Building2, Briefcase, ArrowLeft, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { useGoogleAccounts } from "@/hooks/use-google-accounts";

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
          <GoogleLogin onSuccess={onGoogleSuccess} onError={onGoogleError} text="signup_with" />
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
  isGoogleSignup = false,
}: {
  onBack: () => void;
  onContinue: () => void;
  isLoading: boolean;
  isGoogleSignup?: boolean;
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
        <CardTitle className="text-2xl">
          {isGoogleSignup ? "Complete Your Profile" : "Continue with Email"}
        </CardTitle>
        <CardDescription>
          {isGoogleSignup
            ? "Set a password to complete your account setup"
            : "Please enter your details below"}
        </CardDescription>
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
            disabled={isLoading || isGoogleSignup}
          />
          <GenericInput
            type="input"
            label="Last Name"
            placeholder="Enter your last name"
            value={userSignupData.lastName}
            onChange={(e) => setUserSignupData({ lastName: e.target.value })}
            required
            disabled={isLoading || isGoogleSignup}
          />
        </div>

        <GenericInput
          type="email"
          label="Email"
          placeholder="Enter your email"
          value={userSignupData.email}
          onChange={(e) => setUserSignupData({ email: e.target.value })}
          required
          disabled={isLoading || isGoogleSignup}
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

function ConnectGoogleStep({
  onGoogleConnect,
  onSkip,
  isLoading,
}: {
  onGoogleConnect: () => void;
  onSkip: () => void;
  isLoading: boolean;
}) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-4">
        <CardTitle className="text-2xl">Link Google Accounts</CardTitle>
        <CardDescription className="text-base">
          Link your Google accounts to unlock detailed insights from Google
          Analytics 4 and Google Search Console.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={onGoogleConnect}
          disabled={isLoading}
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
          Connect Google Account
        </Button>

        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          Skip for now
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { connectGoogleAccount } = useGoogleAccounts();
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
    if (isAuthenticated && step !== "connectGoogle" && step === "initial") {
      router.push("/");
    }
  }, [isAuthenticated, step, router]);

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
        setStep("emailForm");
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
        website: agencyData.website,
        userType: "AGENCY",
        signupMethod: userSignupData.googleToken ? "GOOGLE" : "EMAIL",
        ...(userSignupData.googleToken && {
          googleToken: userSignupData.googleToken,
        }),
      });

      toast.success("Account created successfully!");
      setStep("connectGoogle");
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
        website: businessData.website,
        userType: "BUSINESS",
        signupMethod: userSignupData.googleToken ? "GOOGLE" : "EMAIL",
        ...(userSignupData.googleToken && {
          googleToken: userSignupData.googleToken,
        }),
      });

      toast.success("Account created successfully!");
      setStep("connectGoogle");
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

  const handleConnectGoogle = () => {
    connectGoogleAccount();
  };

  const handleSkipGoogle = () => {
    router.push("/");
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
          isGoogleSignup={!!userSignupData.googleToken}
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

      {step === "connectGoogle" && (
        <ConnectGoogleStep
          onGoogleConnect={handleConnectGoogle}
          onSkip={handleSkipGoogle}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
