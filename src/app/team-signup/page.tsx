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
  useCreateTeamMemberProfile,
} from "@/hooks/use-team-invite";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function TeamSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const {
    data: tokenData,
    isLoading: isValidating,
    isError: isTokenInvalid,
  } = useValidateInviteToken(token);

  const createProfile = useCreateTeamMemberProfile();

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }

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

    if (!token) {
      toast.error("Invalid invitation token");
      return;
    }

    try {
      await createProfile.mutateAsync({
        token,
        Password: password,
        FirstName: firstName,
        LastName: lastName,
      });

      toast.success("Profile created successfully! Please sign in.");
      router.push("/login");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create profile. Please try again.";
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

  const isLoading = createProfile.isPending;

  return (
    <div className="min-h-full flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Join {tokenData.OrganzationName || "the team"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <GenericInput
                type="input"
                label="First Name"
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isLoading}
              />
              <GenericInput
                type="input"
                label="Last Name"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
              />
            </div>

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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                "Complete Profile"
              )}
            </Button>
          </form>
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
