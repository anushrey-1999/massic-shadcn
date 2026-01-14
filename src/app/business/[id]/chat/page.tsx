import { redirect } from "next/navigation";
import { getPageMetadata } from "@/config/seo";

export const metadata = {
  ...getPageMetadata("businessChat"),
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BusinessChatPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/business/${id}/chat/full`);
}
