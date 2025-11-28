"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_CLIENT_ID) {
    console.warn("Google Client ID not configured");
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}
