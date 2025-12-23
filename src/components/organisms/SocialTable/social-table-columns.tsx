"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Share2, Tag, TrendingUp, Megaphone } from "lucide-react";
import Image from "next/image";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { ExpandablePills } from "@/components/ui/expandable-pills";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { Typography } from "@/components/ui/typography";
import type { SocialRow } from "@/types/social-types";

function getChannelIcon(channelName: string): string | null {
  if (!channelName) return null;

  const normalized = channelName.toLowerCase().trim();
  const iconMap: Record<string, string> = {
    facebook: "/icons/facebook.png",
    instagram: "/icons/instagram.png",
    linkedin: "/icons/linkedin.png",
    twitter: "/icons/twitter.png",
    x: "/icons/twitter.png",
    youtube: "/icons/youtube.png",
    tiktok: "/icons/tiktok.png",
    reddit: "/icons/reddit.png",
  };

  return iconMap[normalized] || null;
}

interface GetSocialTableColumnsProps {
  [key: string]: any;
}

export function getSocialTableColumns({ }: GetSocialTableColumnsProps = {}): ColumnDef<SocialRow>[] {
  return [
    {
      id: "channel_name",
      accessorKey: "channel_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Channel" />
      ),
      cell: ({ row }) => {
        const channelName = row.getValue<string>("channel_name") || "";
        const iconPath = getChannelIcon(channelName);

        return (
          <div className="flex items-center gap-2">
            {iconPath && (
              <Image
                src={iconPath}
                alt={channelName}
                width={20}
                height={20}
                className="shrink-0"
              />
            )}
            <span className="truncate">
              {channelName || "N/A"}
            </span>
          </div>
        );
      },
      meta: {
        label: "Channel",
        placeholder: "Search channels...",
        variant: "text",
        icon: Share2,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 200,
      minSize: 150,
      maxSize: 300,
    },
    {
      id: "campaign_name",
      accessorKey: "campaign_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Campaign Name" />
      ),
      cell: ({ row }) => (
        <Typography variant="p" className="truncate">
          {row.getValue("campaign_name") || "N/A"}
        </Typography>
      ),
      meta: {
        label: "Campaign Name",
        placeholder: "Search campaign names...",
        variant: "text",
        icon: Megaphone,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 250,
      minSize: 200,
      maxSize: 350,
    },
    {
      id: "campaign_relevance",
      accessorKey: "campaign_relevance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Campaign Rel" />
      ),
      cell: ({ cell }) => {
        const score = cell.getValue<number>();
        return (
          <div className="flex items-center">
            <RelevancePill score={score || 0} />
          </div>
        );
      },
      meta: {
        label: "Campaign Relevance",
        variant: "range",
        range: [0, 1],
        icon: TrendingUp,
      },
      enableColumnFilter: true,
      enableSorting: true,
      size: 130,
      minSize: 110,
      maxSize: 160,
    },
    {
      id: "total_clusters",
      accessorKey: "total_clusters",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Tactics" />
      ),
      cell: ({ row }) => {
        const totalClusters = row.original.total_clusters ?? 0;
        return (
          <Typography variant="p" className="truncate">
            {totalClusters}
          </Typography>
        );
      },
      meta: {
        label: "Tactics",
        placeholder: "Search tactics...",
        variant: "number",
        icon: Tag,
      },
      enableColumnFilter: false,
      enableSorting: true,
      size: 250,
      minSize: 200,
      maxSize: 350,
    },
  ];
}
