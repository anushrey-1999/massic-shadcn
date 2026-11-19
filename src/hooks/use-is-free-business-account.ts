import { USER_ROLE_IDS } from "@/lib/user-roles";
import { useAuthStore } from "@/store/auth-store";

export function useIsFreeBusinessAccount(): boolean {
  return (
    useAuthStore((state) => state.user?.roleid) === USER_ROLE_IDS.BUSINESS
  );
}
