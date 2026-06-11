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
import {
  useValidateInviteToken,
} from "@/hooks/use-team-invite";
import { useInvitedGoogleLogin, useSetPassword } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function TeamSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [googleAccepted, setGoogleAccepted] = useState(false);

  const {
    data: tokenData,
    isLoading: isValidating,
    isError: isTokenInvalid,
  } = useValidateInviteToken(token);

  const invitedGoogleLogin = useInvitedGoogleLogin();
  const setPasswordMutation = useSetPassword();
  const authToken = useAuthStore((state) => state.token);
  const authUser = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid invitation link");
      router.push("/not-found");
    }
  }, [token, router]);

  useEffect(() => {
    if (isTokenInvalid) {
      toast.error("Invalid or expired invitation token");
      router.push("/not-found");
    }
  }, [isTokenInvalid, router]);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential || !token) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }

    try {
      const result = await invitedGoogleLogin.mutateAsync({
        token,
        googleToken: credentialResponse.credential,
      });
      if (!result.user?.requiresPasswordSetup) {
        toast.success("Invitation accepted.");
        router.push("/");
        return;
      }
      setGoogleAccepted(true);
      toast.success("Invitation accepted. Set a password to finish.");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to accept invitation. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google sign-in failed. Please try again.");
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("Password is required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await setPasswordMutation.mutateAsync({ password });
      if (authToken && authUser) {
        setAuth(authToken, { ...authUser, requiresPasswordSetup: false });
      }

      toast.success("Password set successfully.");
      router.push("/");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to set password. Please try again.";
      toast.error(errorMessage);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background p-8">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Validating your invitation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenData) {
    return null;
  }

  const isLoading = invitedGoogleLogin.isPending || setPasswordMutation.isPending;
  const showPasswordForm = googleAccepted || authUser?.requiresPasswordSetup;

  return (
    <div className="min-h-full flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Accept Invitation</CardTitle>
          <CardDescription>
            Join {tokenData.OrganzationName || "the team"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <GenericInput
              type="input"
              label="Organization"
              value={tokenData.OrganzationName || ""}
              disabled
            />

            <GenericInput
              type="email"
              label="Email"
              value={tokenData.Email}
              disabled
            />

            {!showPasswordForm ? (
              <div className="flex justify-center py-2">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <GenericInput
                  type="password"
                  label="Password"
                  placeholder="Enter your password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <GenericInput
                  type="password"
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {setPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Set Password"
                  )}
                </Button>
              </form>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeamSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full flex items-center justify-center bg-background p-8">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <TeamSignupContent />
    </Suspense>
  );
}
