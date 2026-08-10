import type { Metadata } from "next";
import * as React from "react";

import { siteMeta } from "@/config/seo";
import {
  InvalidSnapshotShareTokenError,
  readSnapshotShareToken,
} from "@/lib/server/snapshot-share-token";
import {
  getLatestPublicSnapshot,
  SnapshotNotAvailableError,
  SnapshotUpstreamError,
} from "@/lib/server/snapshot-report-gateway";

import { PublicSnapshotClient } from "./PublicSnapshotClient";

const FALLBACK_TITLE = `SEO Snapshot | ${siteMeta.name}`;
const FALLBACK_DESCRIPTION =
  "View a live SEO snapshot report, powered by Massic.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}): Promise<Metadata> {
  const { t: token } = await searchParams;
  if (!token?.trim()) return fallbackMetadata();

  try {
    const payload = readSnapshotShareToken(token.trim());
    const report = await getLatestPublicSnapshot(payload.businessId);

    const businessName = report.meta?.business_name?.trim();
    const businessDesc = report.meta?.business_description?.trim();
    const domain = report.meta?.url?.trim();

    const title = businessName
      ? `${businessName} — SEO Snapshot | ${siteMeta.name}`
      : FALLBACK_TITLE;

    const description =
      businessDesc ||
      (domain
        ? `SEO snapshot report for ${domain}, powered by ${siteMeta.name}.`
        : FALLBACK_DESCRIPTION);

    return {
      title,
      description,
      icons: { icon: "/massic-logo-green.svg" },
      openGraph: {
        title,
        description,
        url: `/snapshot?t=${token}`,
        type: "article",
        siteName: siteMeta.name,
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch (error) {
    if (
      error instanceof InvalidSnapshotShareTokenError ||
      error instanceof SnapshotNotAvailableError ||
      error instanceof SnapshotUpstreamError
    ) {
      return fallbackMetadata();
    }
    return fallbackMetadata();
  }
}

function fallbackMetadata(): Metadata {
  return {
    title: FALLBACK_TITLE,
    description: FALLBACK_DESCRIPTION,
    icons: { icon: "/massic-logo-green.svg" },
    openGraph: {
      title: FALLBACK_TITLE,
      description: FALLBACK_DESCRIPTION,
      url: "/snapshot",
      type: "website",
      siteName: siteMeta.name,
    },
    twitter: {
      card: "summary",
      title: FALLBACK_TITLE,
      description: FALLBACK_DESCRIPTION,
    },
  };
}

export default async function PublicSnapshotPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: token } = await searchParams;
  return <PublicSnapshotClient token={token} />;
}
