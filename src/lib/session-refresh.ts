import { decodeJwt } from "@/utils/jwt";

// Refresh only within the final 10 hours of the token lifetime.
export const SESSION_REFRESH_WINDOW_SECONDS = 60 * 10 * 60;

export function shouldRefreshSession(token: string, now = Date.now()) {
  const expiresAt = decodeJwt(token)?.exp;
  if (typeof expiresAt !== "number") return false;

  const secondsLeft = expiresAt - Math.floor(now / 1000);
  return secondsLeft > 0 && secondsLeft <= SESSION_REFRESH_WINDOW_SECONDS;
}
