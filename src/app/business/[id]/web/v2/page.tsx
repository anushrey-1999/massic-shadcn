import { redirect } from "next/navigation";
import { webArchitectureTabEnabled } from "@/config/web-page-features";
import { WebV2PageClient } from "./web-v2-page-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BusinessWebV2Page({ params }: PageProps) {
  const { id } = await params;

  if (!webArchitectureTabEnabled) {
    redirect(`/business/${encodeURIComponent(id)}/web`);
  }

  return <WebV2PageClient businessId={id} />;
}
