"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CredentialResponse } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FreeBusinessConnectionPanel } from "@/components/organisms/signup/FreeBusinessConnectionPanel";
import {
  AccountTypeStep,
  BusinessCategoriesStep,
  BusinessDetailsStep,
  CreatingBusinessStep,
  GoogleSignupStep,
  ProfileReviewStep,
} from "@/components/organisms/signup/FreeBusinessSignupSteps";
import { FreeBusinessSignupTemplate } from "@/components/templates/FreeBusinessSignupTemplate";
import { useGoogleLogin, useSignup } from "@/hooks/use-auth";
import { useBusinessCreation } from "@/hooks/use-business-creation";
import { useJobByBusinessId } from "@/hooks/use-jobs";
import { useLocations } from "@/hooks/use-locations";
import { useProfileAnalysis } from "@/hooks/use-profile-analysis";
import { apiErrorMessage } from "@/lib/api-error";
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
  const businessCreation = useBusinessCreation({
    isPitch: false,
    locationOptions,
    includeCategories: true,
  });
  const profileBuild = useProfileAnalysis(businessId || "");
  const jobQuery = useJobByBusinessId(businessId);
  const creatingRef = useRef(false);
  const buildRef = useRef(false);

  useEffect(() => {
    // A signed-out visitor can only resume with the Google token from this
    // tab; anything else is stale progress from a previous session. This
    // effect runs before AuthProvider hydrates, so read the session cookie
    // first instead of trusting the initial signed-out state.
    if (!isAuthenticated) {
      useAuthStore.getState().hydrate();
      if (useAuthStore.getState().isAuthenticated) return;
      if (step !== "initial" && !userSignupData.googleToken) reset();
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
      primaryCategory: businessData.primaryCategory,
      secondaryCategory: businessData.secondaryCategory,
      categoriesTagged: businessData.categoriesTagged,
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
        setStep("businessCategories");
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
      buildRef.current ||
      [
        "initial",
        "userTypeSelection",
        "businessDetails",
        "businessCategories",
        "creatingBusiness",
      ].includes(
        step,
      )
    ) {
      return;
    }
    buildRef.current = true;
    void profileBuild
      .mutateAsync("context")
      .then(() => setProfileBuildRequested(true))
      .catch((error) => {
        buildRef.current = false;
        toast.error("Profile preparation will continue from Profile", {
          description: apiErrorMessage(error),
        });
      });
  }, [
    businessId,
    profileBuild,
    profileBuildRequested,
    setProfileBuildRequested,
    step,
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
        setStep("userTypeSelection");
      }
    },
    [googleLogin, router, setStep, setUserSignupData],
  );

  const createAccount = useCallback(async () => {
    if (isAuthenticated && user?.roleid === USER_ROLE_IDS.BUSINESS) {
      setStep("creatingBusiness");
      return;
    }
    if (!userSignupData.googleToken) {
      toast.error("Continue with Google again to finish creating your account.");
      setStep("initial");
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

  const profileReady =
    jobQuery.data?.has_build_completed === true ||
    jobQuery.data?.profile_status === "success";
  const pending =
    googleLogin.isPending || signup.isPending || businessCreation.isPending;

  return (
    <FreeBusinessSignupTemplate>
      {step === "initial" ? (
        <GoogleSignupStep
          onSuccess={handleGoogleSuccess}
          onError={() => toast.error("Google sign-in failed. Please try again.")}
          pending={pending}
        />
      ) : null}
      {step === "userTypeSelection" ? (
        <AccountTypeStep
          email={userSignupData.email}
          onBack={() => {
            reset();
            setStep("initial");
          }}
          onBusiness={() => {
            setUserType("BUSINESS");
            setStep("businessDetails");
          }}
          onAgency={() => {
            setUserType("AGENCY");
            window.location.assign(AGENCY_CONTACT_URL);
          }}
        />
      ) : null}
      {step === "businessDetails" ? (
        <BusinessDetailsStep
          value={businessData}
          locationOptions={locationOptions}
          locationsLoading={locationsLoading}
          pending={pending}
          onChange={setBusinessData}
          onBack={() => setStep("userTypeSelection")}
          onContinue={() => setStep("businessCategories")}
        />
      ) : null}
      {step === "businessCategories" ? (
        <BusinessCategoriesStep
          value={businessData}
          pending={pending}
          onChange={setBusinessData}
          onBack={() => setStep("businessDetails")}
          onContinue={() => void createAccount()}
        />
      ) : null}
      {step === "creatingBusiness" ? (
        <CreatingBusinessStep message="Creating your profile. This only takes a few seconds." />
      ) : null}
      {step === "connectSources" && businessId ? (
        <FreeBusinessConnectionPanel
          businessId={businessId}
          website={businessData.website}
          onContinue={() => setStep("profileReview")}
        />
      ) : null}
      {step === "profileReview" && businessId ? (
        <ProfileReviewStep
          ready={profileReady}
          businessName={businessData.businessName}
          onReview={() =>
            router.push(`/business/${businessId}/profile?onboarding=1`)
          }
          onFinish={() => {
            reset();
            router.replace(`/business/${businessId}/analytics`);
          }}
        />
      ) : null}
    </FreeBusinessSignupTemplate>
  );
}
