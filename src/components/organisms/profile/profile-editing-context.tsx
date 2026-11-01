"use client";

import { createContext, useContext } from "react";

export const ProfileEditingDisabledContext = createContext(false);
export const useProfileEditingDisabled = () =>
  useContext(ProfileEditingDisabledContext);
