import { create } from "zustand";

export type SignupStep =
  | "initial"
  | "emailForm"
  | "userTypeSelection"
  | "agencyWorkspace"
  | "businessProfile"
  | "connectGoogle";

export type UserType = "AGENCY" | "BUSINESS";

interface UserSignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  googleToken: string;
}

interface AgencyData {
  agencyName: string;
  website: string;
}

interface BusinessData {
  businessName: string;
  website: string;
}

interface SignupState {
  step: SignupStep;
  userType: UserType;
  userSignupData: UserSignupData;
  agencyData: AgencyData;
  businessData: BusinessData;
  isSignupFlow: boolean;

  setStep: (step: SignupStep) => void;
  setUserType: (userType: UserType) => void;
  setUserSignupData: (data: Partial<UserSignupData>) => void;
  setAgencyData: (data: Partial<AgencyData>) => void;
  setBusinessData: (data: Partial<BusinessData>) => void;
  setIsSignupFlow: (isSignupFlow: boolean) => void;
  reset: () => void;
}

const initialUserSignupData: UserSignupData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  googleToken: "",
};

const initialAgencyData: AgencyData = {
  agencyName: "",
  website: "",
};

const initialBusinessData: BusinessData = {
  businessName: "",
  website: "",
};

export const useSignupStore = create<SignupState>()((set) => ({
  step: "initial",
  userType: "AGENCY",
  userSignupData: initialUserSignupData,
  agencyData: initialAgencyData,
  businessData: initialBusinessData,
  isSignupFlow: false,

  setStep: (step) => set({ step }),
  setUserType: (userType) => set({ userType }),
  setUserSignupData: (data) =>
    set((state) => ({
      userSignupData: { ...state.userSignupData, ...data },
    })),
  setAgencyData: (data) =>
    set((state) => ({
      agencyData: { ...state.agencyData, ...data },
    })),
  setBusinessData: (data) =>
    set((state) => ({
      businessData: { ...state.businessData, ...data },
    })),
  setIsSignupFlow: (isSignupFlow) => set({ isSignupFlow }),
  reset: () =>
    set({
      step: "initial",
      userType: "AGENCY",
      userSignupData: initialUserSignupData,
      agencyData: initialAgencyData,
      businessData: initialBusinessData,
      isSignupFlow: false,
    }),
}));
