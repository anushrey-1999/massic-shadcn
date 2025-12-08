"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  // Always wrap in GoogleOAuthProvider to provide context
  // This ensures GoogleLogin components have access to the provider context
  // If client ID is missing, GoogleLogin should be conditionally rendered
  if (!GOOGLE_CLIENT_ID) {
    console.warn("Google Client ID not configured. Google OAuth features will not work.");
    // Still provide the context with empty string - components should check for client ID before rendering
    return (
      <GoogleOAuthProvider clientId="">
        {children}
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}
