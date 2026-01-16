import { create } from "zustand";

interface SessionStore {
  showSessionExpiredDialog: boolean;
  setShowSessionExpiredDialog: (show: boolean) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  showSessionExpiredDialog: false,
  setShowSessionExpiredDialog: (show) => set({ showSessionExpiredDialog: show }),
}));
