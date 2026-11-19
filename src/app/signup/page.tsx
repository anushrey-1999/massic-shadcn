"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CredentialResponse } from "@react-oauth/google";
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
import { useGoogleLogin, useSignup } from "@/hooks/use-auth";
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
  const googleLogin = useGoogleLogin();
  const signup = useSignup();
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

  useEffect(() => {
    // Account choice and Google sign-in can resume without credentials. Later
    // signed-out steps need the in-memory Google token from this tab.
    // AuthProvider may not be hydrated yet, so check the cookie-backed store.
    if (!isAuthenticated) {
      useAuthStore.getState().hydrate();
      if (useAuthStore.getState().isAuthenticated) return;
      const canResumeSignedOut =
        step === "initial" ||
        step === "googleSignIn" ||
        Boolean(userSignupData.googleToken);
      if (!canResumeSignedOut) reset();
      return;
    }
    if (!user) return;
    if (user.roleid !== USER_ROLE_IDS.BUSINESS) {
      if (step !== "initial") reset();
      router.replace("/");
      return;
    }
    if (step === "initial") router.replace("/");
  }, [isAuthenticated, reset, router, step, user, userSignupData.googleToken]);

  useEffect(() => {
    if (
      step !== "creatingBusiness" ||
      !isAuthenticated ||
      !user ||
      creatingRef.current ||
      businessId
    ) {
      return;
    }

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
        toast.success("Your business is ready");
      })
      .catch((error) => {
        creatingRef.current = false;
        toast.error("We couldn't finish business setup", {
          description: apiErrorMessage(error),
        });
        setStep("businessDetails");
      });
  }, [
    businessCreation,
    businessData,
    businessId,
    isAuthenticated,
    setBusinessId,
    setStep,
    step,
    user,
  ]);

  useEffect(() => {
    if (
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
    profileBuild,
    profileBuildRequested,
    setProfileBuildRequested,
  ]);

  const handleGoogleSuccess = useCallback(
    async (credentialResponse: CredentialResponse) => {
      const googleToken = credentialResponse.credential;
      if (!googleToken) {
        toast.error("Google did not return a sign-in credential.");
        return;
      }
      try {
        await googleLogin.mutateAsync({ token: googleToken });
        toast.success("Welcome back");
        reset();
        router.replace("/");
      } catch (error: unknown) {
        const signupError = error as {
          userNotFound?: boolean;
          googleUserDetails?: {
            email?: string;
            firstName?: string;
            lastName?: string;
          };
        };
        if (!signupError.userNotFound) {
          toast.error("Google sign-in failed", {
            description: apiErrorMessage(error),
          });
          return;
        }
        setUserSignupData({
          email: signupError.googleUserDetails?.email || "",
          firstName: signupError.googleUserDetails?.firstName || "",
          lastName: signupError.googleUserDetails?.lastName || "",
          googleToken,
        });
        setStep("businessDetails");
      }
    },
    [googleLogin, reset, router, setStep, setUserSignupData],
  );

  const createAccount = useCallback(async () => {
    if (isAuthenticated && user?.roleid === USER_ROLE_IDS.BUSINESS) {
      setStep("creatingBusiness");
      return;
    }
    if (!userSignupData.googleToken) {
      toast.error("Continue with Google again to finish creating your account.");
      setStep("googleSignIn");
      return;
    }
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
      toast.error("Account creation failed", {
        description: apiErrorMessage(error),
      });
    }
  }, [
    businessData.businessName,
    businessData.website,
    isAuthenticated,
    setStep,
    setUserSignupData,
    signup,
    user?.roleid,
    userSignupData,
  ]);

  const pending =
    googleLogin.isPending || signup.isPending || businessCreation.isPending;

  const finishOnboarding = useCallback(() => {
    if (!businessId) return;
    const analyticsPath = `/business/${businessId}/analytics`;
    reset();
    router.replace(analyticsPath);
  }, [businessId, reset, router]);

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
          onError={() => toast.error("Google sign-in failed. Please try again.")}
          onBack={() => {
            setUserType(null);
            setStep("initial");
          }}
          pending={pending}
        />
      ) : null}
      {step === "businessDetails" ? (
        <BusinessDetailsStep
          value={businessData}
          locationOptions={locationOptions}
          locationsLoading={locationsLoading}
          pending={pending}
          onChange={setBusinessData}
          onBack={() => setStep("googleSignIn")}
          onContinue={() => void createAccount()}
        />
      ) : null}
      {step === "creatingBusiness" ? (
        <CreatingBusinessStep progress={creationProgress} />
      ) : null}
      {step === "connectSources" && businessId ? (
        <FreeBusinessConnectionPanel
          businessId={businessId}
          website={businessData.website}
          onContinue={finishOnboarding}
        />
      ) : null}
    </FreeBusinessSignupTemplate>
  );
}
