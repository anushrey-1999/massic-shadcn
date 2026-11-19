import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SignupStep =
  | "initial"
  | "googleSignIn"
  | "businessDetails"
  | "creatingBusiness"
  | "connectSources";

export type UserType = "AGENCY" | "BUSINESS";
export type SignupDataSource = "ga4" | "gsc" | "gbp";

interface UserSignupData {
  firstName: string;
  lastName: string;
  email: string;
  googleToken: string;
}

interface BusinessData {
  businessName: string;
  website: string;
  primaryLocation: string;
  serviceAreaType: string;
}

interface SignupState {
  step: SignupStep;
  userType: UserType | null;
  userSignupData: UserSignupData;
  businessData: BusinessData;
  businessId: string | null;
  profileBuildRequested: boolean;

  setStep: (step: SignupStep) => void;
  setUserType: (userType: UserType | null) => void;
  setUserSignupData: (data: Partial<UserSignupData>) => void;
  setBusinessData: (data: Partial<BusinessData>) => void;
  setBusinessId: (businessId: string | null) => void;
  setProfileBuildRequested: (requested: boolean) => void;
  reset: () => void;
}

const initialUserSignupData: UserSignupData = {
  firstName: "",
  lastName: "",
  email: "",
  googleToken: "",
};

const initialBusinessData: BusinessData = {
  businessName: "",
  website: "",
  primaryLocation: "",
  serviceAreaType: "",
};

function normalizeSignupStep(step: unknown): SignupStep {
  switch (step) {
    case "googleSignIn":
    case "businessDetails":
    case "creatingBusiness":
    case "connectSources":
      return step;
    case "businessCategories":
      return "businessDetails";
    case "profileReview":
      return "initial";
    case "initial":
    case "userTypeSelection":
    default:
      return "initial";
  }
}

function normalizeBusinessData(
  data: Partial<BusinessData> | undefined,
): BusinessData {
  return {
    businessName: data?.businessName ?? "",
    website: data?.website ?? "",
    primaryLocation: data?.primaryLocation ?? "",
    serviceAreaType: data?.serviceAreaType ?? "",
  };
}

export const useSignupStore = create<SignupState>()(
  persist(
    (set) => ({
      step: "initial",
      userType: null,
      userSignupData: initialUserSignupData,
      businessData: initialBusinessData,
      businessId: null,
      profileBuildRequested: false,

      setStep: (step) => set({ step }),
      setUserType: (userType) => set({ userType }),
      setUserSignupData: (data) =>
        set((state) => ({
          userSignupData: { ...state.userSignupData, ...data },
        })),
      setBusinessData: (data) =>
        set((state) => ({
          businessData: { ...state.businessData, ...data },
        })),
      setBusinessId: (businessId) => set({ businessId }),
      setProfileBuildRequested: (profileBuildRequested) =>
        set({ profileBuildRequested }),
      reset: () =>
        set({
          step: "initial",
          userType: null,
          userSignupData: initialUserSignupData,
          businessData: initialBusinessData,
          businessId: null,
          profileBuildRequested: false,
        }),
    }),
    {
      name: "massic-free-business-signup",
      partialize: (state) => ({
        step: state.step,
        userType: state.userType,
        businessData: state.businessData,
        businessId: state.businessId,
        profileBuildRequested: state.profileBuildRequested,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SignupState>;
        return {
          ...current,
          ...saved,
          step: normalizeSignupStep(saved.step),
          businessData: normalizeBusinessData(saved.businessData),
        };
      },
    },
  ),
);
