"use client";

import { useParams } from "next/navigation";
import { MassicAgentShell } from "@/components/massic-agent";

export default function BusinessAgentPage() {
  const { id } = useParams<{ id: string }>();
  return <MassicAgentShell businessId={id} />;
}
