"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CredentialResponse } from "@react-oauth/google";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FreeBusinessConnectionPanel } from "@/components/organisms/signup/FreeBusinessConnectionPanel";
import {
  AccountTypeStep,
  BusinessDetailsStep,
  CreatingBusinessStep,
  GoogleSignupStep,
} from "@/components/organisms/signup/FreeBusinessSignupSteps";
import { FreeBusinessSignupTemplate } from "@/components/templates/FreeBusinessSignupTemplate";
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
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { useGoogleSignupCheck, useSignup } from "@/hooks/use-auth";
import { useBusinessCreation } from "@/hooks/use-business-creation";
import { useLocations } from "@/hooks/use-locations";
import { useProfileAnalysis } from "@/hooks/use-profile-analysis";
import { apiErrorMessage } from "@/lib/api-error";
import {
  emptyCreationProgress,
  type CreationProgress,
} from "@/lib/business-creation-draft";
import { USER_ROLE_IDS } from "@/lib/user-roles";
import { useAuthStore } from "@/store/auth-store";
import { useSignupStore } from "@/store/signup-store";
import { profileFormDefaults } from "@/utils/profile-form-mappers";

const AGENCY_CONTACT_URL = "https://massic.io/contact";
const BUSINESS_SETUP_ERROR_TOAST = "free-business-signup-error";

export default function SignupPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const {
    step,
    userSignupData,
    businessData,
    businessId,
    profileBuildRequested,
    setStep,
    setUserType,
    setUserSignupData,
    setBusinessData,
    setBusinessId,
    setProfileBuildRequested,
    reset,
  } = useSignupStore();
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");
  const googleSignupCheck = useGoogleSignupCheck();
  const signup = useSignup();
  const [ready, setReady] = useState(false);
  const [redirectDestination, setRedirectDestination] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [existingAccountOpen, setExistingAccountOpen] = useState(false);
  const signupInFlight = useRef(false);
  const googleSignupRef = useRef<HTMLDivElement>(null);
  const [creationProgress, setCreationProgress] = useState<CreationProgress>(
    emptyCreationProgress,
  );
  const handleCreationProgress = useCallback(
    (progress: CreationProgress) => setCreationProgress({ ...progress }),
    [],
  );
  const businessCreation = useBusinessCreation({
    isPitch: false,
    locationOptions,
    includeCategories: false,
    onProgress: handleCreationProgress,
  });
  const profileBuild = useProfileAnalysis(businessId || "");
  const creatingRef = useRef(false);
  const buildRef = useRef(false);
  const redirectHome =
    ready &&
    isAuthenticated &&
    (step === "initial" || (user && user.roleid !== USER_ROLE_IDS.BUSINESS));
  const redirectTo = redirectDestination ?? (redirectHome ? "/" : null);
  const resetSignedOutDraft =
    ready &&
    !isAuthenticated &&
    step !== "initial" &&
    step !== "googleSignIn" &&
    !userSignupData.googleToken;
  const canSetUpBusiness =
    ready && !redirectTo && isAuthenticated && user?.roleid === USER_ROLE_IDS.BUSINESS;

  useEffect(() => {
    // The server renders before the saved signup step and auth cookies are available.
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated) auth.hydrate();
    setReady(true);
  }, []);

  useEffect(() => {
    if (resetSignedOutDraft) reset();
  }, [resetSignedOutDraft, reset]);

  useEffect(() => {
    if (!redirectTo) return;
    // The redirect screen is already active before resetting the signup step.
    reset();
    router.replace(redirectTo);
  }, [redirectTo, reset, router]);

  useEffect(() => {
    if (!canSetUpBusiness || step !== "creatingBusiness") return;
    if (businessId) {
      setStep("connectSources");
      return;
    }
    if (creatingRef.current) return;

    creatingRef.current = true;
    const values = {
      ...profileFormDefaults,
      website: businessData.website,
      businessName: businessData.businessName,
      primaryLocation: businessData.primaryLocation,
      serviceAreaType: businessData.serviceAreaType,
    };

    void businessCreation
      .create(values)
      .then(({ business }) => {
        setBusinessId(business.UniqueId);
        setStep("connectSources");
      })
      .catch((error) => {
        creatingRef.current = false;
        toast.error("We couldn't finish business setup", {
          id: BUSINESS_SETUP_ERROR_TOAST,
          description: apiErrorMessage(error),
        });
        setStep("businessDetails");
      });
  }, [
    businessCreation,
    businessData,
    businessId,
    canSetUpBusiness,
    setBusinessId,
    setStep,
    step,
  ]);

  useEffect(() => {
    if (
      !canSetUpBusiness ||
      !businessId ||
      profileBuildRequested ||
      buildRef.current
    ) {
      return;
    }
    buildRef.current = true;
    setProfileBuildRequested(true);
    void profileBuild
      .mutateAsync("context")
      .catch((error) => {
        buildRef.current = false;
        setProfileBuildRequested(false);
        toast.error("We couldn't finish automatic profile setup", {
          description: apiErrorMessage(error),
        });
      });
  }, [
    businessId,
    canSetUpBusiness,
    profileBuild,
    profileBuildRequested,
    setProfileBuildRequested,
  ]);

  const showExistingAccount = useCallback(() => {
    setStep("googleSignIn");
    setUserSignupData({ googleToken: "", email: "", firstName: "", lastName: "" });
    setExistingAccountOpen(true);
  }, [setStep, setUserSignupData]);

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      if (signupInFlight.current || existingAccountOpen) return;
      toast.dismiss(BUSINESS_SETUP_ERROR_TOAST);
      const googleToken = credentialResponse.credential;
      if (!googleToken) {
        toast.error("Google did not return a signup credential. Please try again.");
        return;
      }
      signupInFlight.current = true;
      try {
        const result = await googleSignupCheck.mutateAsync(googleToken);
        if (result.accountExists) {
          showExistingAccount();
          return;
        }
        setUserSignupData({
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          googleToken,
        });
        setStep("businessDetails");
      } catch {
        toast.error("Couldn't check your Google account. Please try again.", {
          id: BUSINESS_SETUP_ERROR_TOAST,
        });
      } finally {
        googleSignupCheck.reset();
        signupInFlight.current = false;
      }
    },
    [existingAccountOpen, googleSignupCheck, setStep, setUserSignupData, showExistingAccount],
  );

  const createAccount = useCallback(async () => {
    if (signupInFlight.current) return;
    toast.dismiss(BUSINESS_SETUP_ERROR_TOAST);
    if (isAuthenticated && user?.roleid === USER_ROLE_IDS.BUSINESS) {
      setStep("creatingBusiness");
      return;
    }
    if (!userSignupData.googleToken) {
      toast.error("Continue with Google again to finish creating your account.");
      setStep("googleSignIn");
      return;
    }
    signupInFlight.current = true;
    setCreatingAccount(true);
    try {
      await signup.mutateAsync({
        email: userSignupData.email,
        firstName: userSignupData.firstName,
        lastName: userSignupData.lastName,
        orgName: businessData.businessName,
        website: businessData.website,
        userType: "BUSINESS",
        signupMethod: "GOOGLE",
        googleToken: userSignupData.googleToken,
      });
      setUserSignupData({ googleToken: "" });
      setStep("creatingBusiness");
    } catch (error) {
      if (
        isAxiosError<{ data?: { userExists?: boolean } }>(error) &&
        error.response?.status === 409 &&
        error.response.data?.data?.userExists === true
      ) {
        showExistingAccount();
        return;
      }
      toast.error("Account creation failed", {
        id: BUSINESS_SETUP_ERROR_TOAST,
        description: apiErrorMessage(error),
      });
    } finally {
      signup.reset();
      signupInFlight.current = false;
      setCreatingAccount(false);
    }
  }, [
    businessData.businessName,
    businessData.website,
    isAuthenticated,
    setStep,
    setUserSignupData,
    showExistingAccount,
    signup,
    user?.roleid,
    userSignupData,
  ]);

  const pending =
    googleSignupCheck.isPending || creatingAccount || businessCreation.isPending;
  const settingUpBusiness =
    step === "creatingBusiness" || (step === "businessDetails" && creatingAccount);

  const finishOnboarding = useCallback(() => {
    if (businessId) setRedirectDestination(`/business/${businessId}/analytics`);
  }, [businessId]);

  if (!ready || resetSignedOutDraft) return <FreeBusinessSignupTemplate />;

  if (redirectTo) {
    return (
      <FreeBusinessSignupTemplate>
        <div
          role="status"
          className="flex flex-col items-center gap-3 px-5 py-8 text-sm text-general-muted-foreground"
        >
          <MassicAmoebaLoader size={36} label={null} />
          <p>Opening Massic…</p>
        </div>
      </FreeBusinessSignupTemplate>
    );
  }

  return (
    <FreeBusinessSignupTemplate>
      {step === "initial" ? (
        <AccountTypeStep
          onBusiness={() => {
            setUserType("BUSINESS");
            setStep("googleSignIn");
          }}
          onAgency={() => {
            setUserType("AGENCY");
            window.location.assign(AGENCY_CONTACT_URL);
          }}
        />
      ) : null}
      {step === "googleSignIn" ? (
        <GoogleSignupStep
          onSuccess={handleGoogleSuccess}
          onError={() => toast.error("Google signup failed. Please try again.")}
          onBack={() => {
            setUserType(null);
            setStep("initial");
          }}
          pending={pending}
          googleSignupRef={googleSignupRef}
        />
      ) : null}
      <AlertDialog open={existingAccountOpen} onOpenChange={setExistingAccountOpen}>
        <AlertDialogContent
          className="w-[calc(100%-2rem)] max-w-[400px] rounded-lg motion-reduce:animate-none"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            googleSignupRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-medium">Account already exists</AlertDialogTitle>
            <AlertDialogDescription>
              This Google account is already registered with Massic. Log in to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 min-h-11 sm:min-h-9">
              Use a different Google account
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 sm:min-h-9"
              onClick={() => setRedirectDestination("/login")}
            >
              Go to login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {step === "businessDetails" ? (
        <div hidden={creatingAccount}>
          <BusinessDetailsStep
            value={businessData}
            locationOptions={locationOptions}
            locationsLoading={locationsLoading}
            pending={pending}
            onChange={setBusinessData}
            onBack={() => setStep("googleSignIn")}
            onContinue={() => void createAccount()}
          />
        </div>
      ) : null}
      {settingUpBusiness ? (
        <CreatingBusinessStep
          creatingAccount={step === "businessDetails"}
          progress={creationProgress}
        />
      ) : null}
      {step === "connectSources" && businessId ? (
        <div className="motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-out">
          <FreeBusinessConnectionPanel
            businessId={businessId}
            website={businessData.website}
            onContinue={finishOnboarding}
          />
        </div>
      ) : null}
    </FreeBusinessSignupTemplate>
  );
}
