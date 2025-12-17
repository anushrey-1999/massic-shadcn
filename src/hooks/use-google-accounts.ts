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

  const connectGoogleAccount = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/signin-google`;

    if (!clientId) {
      console.error("Google Client ID not configured");
      return;
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("scope", GOOGLE_OAUTH_SCOPES);
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", "state_parameter_passthrough_value");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("flowName", "GeneralOAuthFlow");
    authUrl.searchParams.set("client_id", clientId);

    // Open in new tab for settings page (user stays on page)
    window.open(authUrl.toString(), "_blank");
  }, []);

  return {
    linkedAccounts,
    hasLinkedAccounts,
    connectGoogleAccount,
    isAuthenticated,
  };
}
