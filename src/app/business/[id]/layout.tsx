import * as React from "react";
import { ChatLauncher } from "@/components/chatbot/chat-launcher";

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
      <ChatLauncher businessId={id} />
    </>
  );
}
