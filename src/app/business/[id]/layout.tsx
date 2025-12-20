import * as React from "react";
import { ChatWidget } from "@/components/chatbot/chat-widget";

export default function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return (
    <>
      {children}
      <ChatWidget businessId={params.id} />
    </>
  );
}
