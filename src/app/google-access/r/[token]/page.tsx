"use client";

import { useParams, useSearchParams } from "next/navigation";
import { AccessRequestRestoreGate } from "@/components/organisms/access-request/AccessRequestRestoreGate";

export default function AccessRequestLandingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;

  return (
    <AccessRequestRestoreGate
      inviteToken={searchParams.get("invite")}
      querySessionToken={searchParams.get("c")}
      token={token}
    />
  );
}
