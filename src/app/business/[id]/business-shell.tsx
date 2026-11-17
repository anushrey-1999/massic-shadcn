"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AskMassicOverlayProvider } from "@/components/chatbot/ask-massic-overlay-provider";
import { useIsFreeBusinessAccount } from "@/hooks/use-is-free-business-account";
import { isFreeBusinessRoute } from "@/lib/business-navigation";

type Props = {
  businessId: string;
  children: React.ReactNode;
};

export function BusinessShell({ businessId, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isFreeBusinessAccount = useIsFreeBusinessAccount();
  const allowed = isFreeBusinessRoute(pathname, businessId);

  React.useEffect(() => {
    if (isFreeBusinessAccount && !allowed) {
      router.replace(`/business/${businessId}/analytics`);
    }
  }, [allowed, businessId, isFreeBusinessAccount, router]);

  if (isFreeBusinessAccount) {
    return allowed ? <>{children}</> : null;
  }

  return (
    <AskMassicOverlayProvider businessId={businessId}>
      {children}
    </AskMassicOverlayProvider>
  );
}
