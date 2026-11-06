import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import LayoutWrapper from "@/components/layouts/layout-wrapper";
import { QueryProvider } from "@/components/providers/query-provider";
import { NuqsProvider } from "@/components/providers/nuqs-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { GoogleAuthProvider } from "@/components/providers/google-auth-provider";
import { SessionExpiredProvider } from "@/components/providers/session-expired-provider";
import { UnsavedChangesProvider } from "@/components/providers/unsaved-changes-provider";
import { PostHogAnalyticsProvider } from "@/components/providers/posthog-analytics-provider";
import { pageMeta, siteMeta } from "@/config/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || "https://app.massic.io"),
  title: {
    default: `${pageMeta.dashboard.title} | ${siteMeta.name}`,
    template: siteMeta.titleTemplate,
  },
  description: siteMeta.description,
  icons: {
    icon: "/massic-icon-green.svg",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  openGraph: {
    type: "website",
    siteName: siteMeta.name,
    images: [siteMeta.shareImage],
  },
  twitter: { card: "summary" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <GoogleAuthProvider>
            <AuthProvider>
              <PostHogAnalyticsProvider>
                <NuqsProvider>
                  <UnsavedChangesProvider>
                    <LayoutWrapper>{children}</LayoutWrapper>
                  </UnsavedChangesProvider>
                  <Toaster />
                  <SessionExpiredProvider />
                </NuqsProvider>
              </PostHogAnalyticsProvider>
            </AuthProvider>
          </GoogleAuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
