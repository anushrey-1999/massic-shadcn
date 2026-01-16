import { PitchesTableClient } from "@/components/organisms/PitchesTable";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Suspense } from "react";
import { getPageMetadata } from "@/config/seo";

export const metadata = {
  ...getPageMetadata("pitches"),
};

export default function PitchesPage() {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Pitches", href: "/pitches" },
  ];

  return (
    <div className="flex flex-col h-screen">
      <PageHeader breadcrumbs={breadcrumbs} />
      <div className="w-full max-w-[1224px] flex-1 min-h-0 p-5 flex flex-col">
        <Suspense fallback={null}>
          <PitchesTableClient />
        </Suspense>
      </div>
    </div>
  );
}
