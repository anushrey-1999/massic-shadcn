import { ChatFullPage } from "@/components/chatbot/chat-full-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessChatFullPage({ params }: PageProps) {
  const { id } = await params;
  return <ChatFullPage businessId={id} />;
}
