import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessChatPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/business/${id}/chat/full`);
}
