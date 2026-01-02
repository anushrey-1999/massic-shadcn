import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import LayoutWrapper from "@/components/layouts/layout-wrapper";
import { QueryProvider } from "@/components/providers/query-provider";
import { NuqsProvider } from "@/components/providers/nuqs-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { GoogleAuthProvider } from "@/components/providers/google-auth-provider";
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
  title: {
    default: `${pageMeta.dashboard.title} | ${siteMeta.name}`,
    template: siteMeta.titleTemplate,
  },
  description: siteMeta.description,
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
              <NuqsProvider>
                <LayoutWrapper>
                  {children}
                </LayoutWrapper>
                <Toaster />
              </NuqsProvider>
            </AuthProvider>
          </GoogleAuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
