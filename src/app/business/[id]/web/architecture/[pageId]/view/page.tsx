import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WebsiteArchitecturePreview } from "@/components/organisms/WebsiteArchitecturePreview/website-architecture-preview";
import { webArchitectureTabEnabled } from "@/config/web-page-features";

export const metadata: Metadata = {
  title: "View Page",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = await params;
  if (!webArchitectureTabEnabled) redirect(`/business/${encodeURIComponent(id)}/web`);
  return <WebsiteArchitecturePreview businessId={id} pageId={pageId} />;
}
