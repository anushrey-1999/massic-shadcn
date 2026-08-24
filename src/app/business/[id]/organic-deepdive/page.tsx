import { OrganicDeepdiveTemplate } from "@/components/templates/OrganicDeepdiveTemplate";
import { GoogleConnectionGuard } from "@/components/molecules/GoogleConnectionGuard";
import { getPageMetadata } from "@/config/seo";

export const metadata = {
  ...getPageMetadata("businessAnalytics"),
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrganicDeepdivePage({ params }: PageProps) {
  const { id } = await params;
  return (
    <GoogleConnectionGuard
      requires={["gsc"]}
      businessId={id}
      subject="organic performance for this business"
    >
      <OrganicDeepdiveTemplate />
    </GoogleConnectionGuard>
  );
}
