"use client";

import { SessionExpiredDialog } from "@/components/session-expired-dialog";
import { useSessionStore } from "@/store/session-store";

export function SessionExpiredProvider() {
  const { showSessionExpiredDialog, setShowSessionExpiredDialog } = useSessionStore();

  return (
    <SessionExpiredDialog
      open={showSessionExpiredDialog}
      onOpenChange={setShowSessionExpiredDialog}
    />
  );
}
