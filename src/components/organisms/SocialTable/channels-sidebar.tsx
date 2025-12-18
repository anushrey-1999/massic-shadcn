"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "../../filter-table/index";
import { cn } from "@/lib/utils";

interface ChannelRow {
  id: string;
  name: string;
  icon: string | null;
  relevance: number;
  isAllChannels?: boolean;
}

interface ChannelsSidebarProps {
  selectedChannel: string | null;
  onChannelSelect: (channel: string | null) => void;
}

const STATIC_CHANNELS = [
  { name: "Facebook", icon: "/icons/facebook.png", relevance: 0.85 },
  { name: "Instagram", icon: "/icons/instagram.png", relevance: 0.92 },
  { name: "LinkedIn", icon: "/icons/linkedin.png", relevance: 0.78 },
  { name: "X", icon: "/icons/twitter.png", relevance: 0.75 },
  { name: "YouTube", icon: "/icons/youtube.png", relevance: 0.95 },
  { name: "TikTok", icon: "/icons/tiktok.png", relevance: 0.82 },
  { name: "Reddit", icon: "/icons/reddit.png", relevance: 0.68 },
];

function getChannelIcon(channelName: string): string | null {
  if (!channelName) return null;
  
  const normalized = channelName.toLowerCase().trim();
  const iconMap: Record<string, string> = {
    facebook: "/icons/facebook.png",
    instagram: "/icons/instagram.png",
    linkedin: "/icons/linkedin.png",
    x: "/icons/twitter.png",
    youtube: "/icons/youtube.png",
    tiktok: "/icons/tiktok.png",
    reddit: "/icons/reddit.png",
  };
  
  return iconMap[normalized] || null;
}

function getChannelsTableColumns(
  selectedChannel: string | null,
  onChannelSelect: (channel: string | null) => void
): ColumnDef<ChannelRow>[] {
  return [
    {
      id: "channel",
      accessorKey: "name",
      header: () => <div className="text-sm font-semibold">Channel</div>,
      cell: ({ row }) => {
        const channel = row.original;
        const iconPath = channel.icon || (channel.isAllChannels ? null : getChannelIcon(channel.name));

        return (
          <div className="flex items-center gap-2">
            {iconPath && (
              <Image
                src={iconPath}
                alt={channel.name}
                width={16}
                height={16}
                className="shrink-0"
              />
            )}
            <span className="truncate">{channel.name}</span>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: false,
      size: 150,
    },
    {
      id: "relevance",
      accessorKey: "relevance",
      header: () => <div className="text-sm font-semibold">Relevance</div>,
      cell: ({ row }) => {
        const channel = row.original;
        const relevance = row.original.relevance;

        return (
          <div className="flex items-center">
            <RelevancePill score={relevance} />
          </div>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
      size: 130,
    },
  ];
}

export function ChannelsSidebar({
  selectedChannel,
  onChannelSelect,
}: ChannelsSidebarProps) {
  const tableData = React.useMemo<ChannelRow[]>(() => {
    const allChannelsRow: ChannelRow = {
      id: "all-channels",
      name: "All Channels",
      icon: null,
      relevance: 0,
      isAllChannels: true,
    };

    const channelRows: ChannelRow[] = STATIC_CHANNELS.map((channel) => ({
      id: channel.name,
      name: channel.name,
      icon: channel.icon,
      relevance: channel.relevance,
      isAllChannels: false,
    }));

    return [allChannelsRow, ...channelRows].map((row) => {
      const isSelected = row.isAllChannels
        ? selectedChannel === null
        : selectedChannel === row.name;
      return {
        ...row,
        isSelected,
        onClick: () => onChannelSelect(row.isAllChannels ? null : row.name),
      } as ChannelRow & { isSelected: boolean; onClick: () => void };
    });
  }, [selectedChannel, onChannelSelect]);

  const columns = React.useMemo(
    () => getChannelsTableColumns(selectedChannel, onChannelSelect),
    [selectedChannel, onChannelSelect]
  );

  const { table } = useDataTable({
    data: tableData,
    columns,
    pageCount: 1,
    enableAdvancedFilter: false,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 1000,
      },
    },
    getRowId: (originalRow: ChannelRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  if (tableData.length === 0) {
    return (
      <div className="h-full w-full p-4">
        <p className="text-sm text-muted-foreground">No channels available</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <DataTable
        table={table}
        isLoading={false}
        emptyMessage="No channels found"
        className="h-full gap-0 [&>div:last-child]:hidden [&>div:first-child]:border-0 [&>div:first-child]:rounded-none [&>div:first-child]:min-h-0 [&>div:first-child]:flex-1 [&>div:first-child>div>table]:min-w-0! [&>div:first-child>div>table]:w-full"
      >
        {null}
      </DataTable>
    </div>
  );
}
