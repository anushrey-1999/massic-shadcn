"use client";

import * as React from "react";
import { AskMassicOverlayProvider } from "@/components/chatbot/ask-massic-overlay-provider";

type Props = {
  businessId: string;
  children: React.ReactNode;
};

export function BusinessShell({ businessId, children }: Props) {
  return (
    <AskMassicOverlayProvider businessId={businessId}>
      {children}
    </AskMassicOverlayProvider>
  );
}
