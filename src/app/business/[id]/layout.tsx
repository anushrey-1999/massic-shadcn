import * as React from "react";
import { ChatWidget } from "@/components/chatbot/chat-widget";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  return (
    <>
      {children}
      <ChatWidget businessId={id} />
    </>
  );
}
