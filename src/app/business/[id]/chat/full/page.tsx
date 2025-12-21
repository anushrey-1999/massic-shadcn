import { ChatFullPage } from "@/components/chatbot/chat-full-page";
import { EntitlementsGuard } from "@/components/molecules/EntitlementsGuard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessChatFullPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <EntitlementsGuard
      entitlement="aiChat"
      businessId={id}
      alertMessage="Upgrade your plan to unlock Ask Massic bot."
    >
      <ChatFullPage businessId={id} />
    </EntitlementsGuard>
  );
}
