import { useCallback } from "react";
import { useAgencyInfo } from "@/hooks/use-agency-settings";

const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/webmasters",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function useGoogleAccounts() {
  const { agencyDetails, isAuthenticated } = useAgencyInfo();

  const linkedAccounts = agencyDetails || [];
  const hasLinkedAccounts = Array.isArray(linkedAccounts) &&
    linkedAccounts.length > 0 &&
    linkedAccounts[0]?.AuthId;

  const buildGoogleAuthUrl = useCallback((returnTo: string) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/signin-google`;

    if (!clientId) {
      console.error("Google Client ID not configured");
      return null;
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("scope", GOOGLE_OAUTH_SCOPES);
    authUrl.searchParams.set("prompt", "select_account consent");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("response_type", "code");
    const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/settings";
    authUrl.searchParams.set(
      "state",
      window.btoa(JSON.stringify({ returnTo: safeReturnTo })),
    );
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("flowName", "GeneralOAuthFlow");
    authUrl.searchParams.set("client_id", clientId);
    return authUrl.toString();
  }, []);

  /** Same-tab OAuth that lands back on `returnTo`, used by guided flows. */
  const connectGoogleAccountFrom = useCallback(
    (returnTo: string) => {
      const authUrl = buildGoogleAuthUrl(returnTo);
      if (authUrl) window.location.assign(authUrl);
    },
    [buildGoogleAuthUrl],
  );

  // Settings opens OAuth in a new tab so the user stays on the page.
  const connectGoogleAccount = useCallback(() => {
    const authUrl = buildGoogleAuthUrl("/settings");
    if (authUrl) window.open(authUrl, "_blank");
  }, [buildGoogleAuthUrl]);

  return {
    linkedAccounts,
    hasLinkedAccounts,
    connectGoogleAccount,
    connectGoogleAccountFrom,
    isAuthenticated,
  };
}
