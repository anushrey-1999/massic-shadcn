import { OrganicDeepdiveTemplate } from "@/components/templates/OrganicDeepdiveTemplate";
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
  return <OrganicDeepdiveTemplate />;
}
