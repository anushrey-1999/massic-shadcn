"use client";

import Link from "next/link";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { useCreateTeamMemberProfile, useValidateInviteToken } from "@/hooks/use-team-invite";
import { useInvitedGoogleLogin } from "@/hooks/use-auth";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function errorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  return error instanceof Error ? error.message : "Unable to accept invitation. Please try again.";
}

function InvitationLoading() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      Validating your invitation…
    </div>
  );
}

function TeamSignupContent() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const submitting = useRef(false);
  const { data: tokenData, isLoading: isValidating, isError: isTokenInvalid, error: validationError, refetch } = useValidateInviteToken(token);
  const invitedGoogleLogin = useInvitedGoogleLogin();
  const createProfile = useCreateTeamMemberProfile();
  const isPending = invitedGoogleLogin.isPending || createProfile.isPending;
  const existingAccount = tokenData?.AccountExists === true;

  const finishAcceptance = () => {
    setAccepted(true);
    toast.success("Invitation accepted.");
    router.replace("/");
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (submitting.current || !token) return;
    if (!response.credential) {
      setError("Google sign-in failed. Please try again.");
      return;
    }
    submitting.current = true;
    setError("");
    try {
      await invitedGoogleLogin.mutateAsync({ token, googleToken: response.credential });
      finishAcceptance();
    } catch (cause) {
      setError(errorMessage(cause));
      submitting.current = false;
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || !token) return;
    setError("");
    if (!existingAccount && !firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }
    if (!existingAccount && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!existingAccount && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    submitting.current = true;
    try {
      await createProfile.mutateAsync({
        token, Password: password,
        ...(!existingAccount && { FirstName: firstName.trim(), LastName: lastName.trim(), ConfirmPassword: confirmPassword }),
      });
      finishAcceptance();
    } catch (cause) {
      setError(errorMessage(cause));
      submitting.current = false;
    }
  };

  if (accepted) {
    return <CardContent><p role="status" className="py-8 text-center text-sm">Invitation accepted. Opening Massic…</p></CardContent>;
  }
  if (token && isValidating) return <CardContent><InvitationLoading /></CardContent>;
  if (!token || isTokenInvalid || !tokenData) {
    const invalidLink = !token || /invalid|expired|unauthorized/i.test(validationError ? errorMessage(validationError) : "");
    return (
      <>
        <CardHeader>
          <CardTitle>{invalidLink ? "Invitation unavailable" : "Unable to load invitation"}</CardTitle>
          <CardDescription>
            {invalidLink ? "This invitation link is invalid, expired, cancelled, or already used. Ask your team administrator for a new invitation." : "We couldn’t check your invitation. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!invalidLink && <Button className="w-full" onClick={() => refetch()}>Try again</Button>}
          <Button asChild variant="outline" className="w-full"><Link href="/login">Go to sign in</Link></Button>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Accept invitation</CardTitle>
        <CardDescription className="break-words">Join {tokenData.OrganzationName || "your team"} on Massic.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GenericInput id="invited-email" type="email" label="Invited email" value={tokenData.Email} readOnly />
        <p className="text-sm text-muted-foreground">
          {existingAccount ? "You already have a Massic account. Continue with Google or sign in with your existing password to join." : "Continue with Google or create an account with your email and a password."}
        </p>
        {error && <p id="invite-error" role="alert" className="text-sm text-destructive">{error}</p>}
        <div inert={isPending} className="flex justify-center overflow-hidden py-1">
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google sign-in failed. Please try again.")} size="large" />
        </div>
        {invitedGoogleLogin.isPending && <p role="status" className="text-center text-sm text-muted-foreground">Accepting invitation…</p>}
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or use email<div className="h-px flex-1 bg-border" /></div>
        <form onSubmit={handlePasswordSubmit} aria-describedby={error ? "invite-error" : undefined}>
          <fieldset disabled={isPending} className="min-w-0 space-y-4">
            {!existingAccount && <>
              <GenericInput id="first-name" type="input" label="First name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={255} required />
              <GenericInput id="last-name" type="input" label="Last name (optional)" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={255} />
            </>}
            <GenericInput id="password" type="password" label="Password" autoComplete={existingAccount ? "current-password" : "new-password"} description={existingAccount ? "Enter your existing Massic password." : "Use at least 6 characters."} value={password} onChange={(e) => setPassword(e.target.value)} minLength={existingAccount ? undefined : 6} required />
            {!existingAccount && <GenericInput id="confirm-password" type="password" label="Confirm password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required />}
            <Button type="submit" className="w-full" disabled={isPending}>
              {createProfile.isPending ? <><Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />Joining…</> : existingAccount ? "Sign in and join team" : "Create account and join team"}
            </Button>
          </fieldset>
        </form>
      </CardContent>
    </>
  );
}

export default function TeamSignupPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4 py-8 sm:px-8">
      <Card className="w-full max-w-md">
        <Suspense fallback={<CardContent><InvitationLoading /></CardContent>}>
          <TeamSignupContent />
        </Suspense>
      </Card>
    </div>
  );
}
