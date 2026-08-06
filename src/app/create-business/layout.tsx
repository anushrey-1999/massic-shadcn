import type { Metadata } from "next";
import { getPageMetadata } from "@/config/seo";
import { CreateBusinessFeatureGate } from "@/components/create-business/CreateBusinessFeatureGate";

export const metadata: Metadata = {
  ...getPageMetadata("createBusiness"),
};

export default function CreateBusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const webflowCreateBusinessEnabled =
    process.env.NEXT_PUBLIC_WEBFLOW_CREATE_BUSINESS_ENABLED === "true";

  return (
    <CreateBusinessFeatureGate enabled={webflowCreateBusinessEnabled}>
      {children}
    </CreateBusinessFeatureGate>
  );
}
