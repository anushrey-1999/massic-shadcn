"use client";

import * as React from "react";
import styles from "./channels-sidebar.module.css";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { RelevancePill } from "@/components/ui/relevance-pill";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { DataTable } from "../../filter-table/index";
import { DataTableColumnHeader } from "../../filter-table/data-table-column-header";
import { cn } from "@/lib/utils";

interface ChannelRow {
  id: string;
  name: string;
  icon: string | null;
  relevance: number;
  isAllChannels?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

interface ChannelsSidebarProps {
  selectedChannel: string | null;
  onChannelSelect: (channel: string | null) => void;
  channels?: Array<{ name: string; relevance: number; icon?: string | null }>;
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Channel" />
      ),
      cell: ({ row }) => {
        const channel = row.original;
        const iconPath = channel.icon || (channel.isAllChannels ? null : getChannelIcon(channel.name));

        return (
          <div className={"flex items-center gap-1 min-h-10 h-10 " + styles.channelsSidebarCell}>
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
      size: 120,
      sortingFn: (rowA, rowB) => {
        // Always keep "All Channels" at the top
        if (rowA.original.isAllChannels) return -1;
        if (rowB.original.isAllChannels) return 1;
        // Then sort by name
        const a = rowA.original.name.toLowerCase();
        const b = rowB.original.name.toLowerCase();
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      },
    },
    {
      id: "relevance",
      accessorKey: "relevance",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Relevance" />
      ),
      cell: ({ row }) => {
        const channel = row.original;
        const relevance = row.original.relevance;

        if (channel.isAllChannels) {
          return <div className="flex items-center"></div>;
        }

        return (
          <div className="flex items-center">
            <RelevancePill score={relevance} />
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: false,
      size: 130,
      sortingFn: (rowA, rowB) => {
        // Always keep "All Channels" at the top
        if (rowA.original.isAllChannels) return -1;
        if (rowB.original.isAllChannels) return 1;
        // Then sort by relevance
        const a = rowA.original.relevance;
        const b = rowB.original.relevance;
        return a - b;
      },
    },
  ];
}

export function ChannelsSidebar({
  selectedChannel,
  onChannelSelect,
  channels,
}: ChannelsSidebarProps) {
  const tableData = React.useMemo<ChannelRow[]>(() => {
    const allChannelsRow: ChannelRow = {
      id: "all-channels",
      name: "All Channels",
      icon: null,
      relevance: 0,
      isAllChannels: true,
    };

    const sourceChannels =
      Array.isArray(channels) && channels.length > 0 ? channels : STATIC_CHANNELS;

    const channelRows: ChannelRow[] = sourceChannels.map((channel) => ({
      id: channel.name,
      name: channel.name,
      icon: channel.icon || null,
      relevance: channel.relevance ?? 0,
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
      };
    });
  }, [selectedChannel, onChannelSelect, channels]);

  const columns = React.useMemo(
    () => getChannelsTableColumns(selectedChannel, onChannelSelect),
    [selectedChannel, onChannelSelect]
  );

  const { table } = useLocalDataTable({
    data: tableData,
    columns,
    initialState: {
      sorting: [{ id: "relevance", desc: true }], // Default sort by relevance descending
      pagination: {
        pageIndex: 0,
        pageSize: 1000,
      },
    },
    getRowId: (originalRow: ChannelRow) => originalRow.id,
    globalFilterFn: undefined,
  });

  if (tableData.length === 0) {
    return (
      <div className="h-full w-full p-4">
        <p className="text-sm text-muted-foreground">No channels available</p>
      </div>
    );
  }

  const handleRowClick = React.useCallback((row: ChannelRow) => {
    if (row.onClick) {
      row.onClick();
    }
  }, []);

  const selectedRowId = React.useMemo(() => {
    if (selectedChannel === null) {
      return "all-channels";
    }
    return selectedChannel;
  }, [selectedChannel]);

  // Create a table proxy that always returns "All Channels" first
  // This needs to be recreated when sorting state changes, so we use the sorting state as a dependency
  const sortingState = table.getState().sorting;
  const tableWithFixedRows = React.useMemo(() => {
    const originalGetRowModel = table.getRowModel.bind(table);
    return {
      ...table,
      getRowModel: () => {
        // Get the current sorted rows from the table
        const originalModel = originalGetRowModel();
        const originalRows = originalModel.rows;
        
        // Separate "All Channels" from other rows
        const allChannelsRow = originalRows.find((row) => row.original.isAllChannels);
        const otherRows = originalRows.filter((row) => !row.original.isAllChannels);
        
        // Always put "All Channels" first, then the sorted other rows
        const sortedRows = allChannelsRow ? [allChannelsRow, ...otherRows] : originalRows;
        
        return {
          ...originalModel,
          rows: sortedRows,
          flatRows: sortedRows,
        };
      },
    };
  }, [table, sortingState]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <DataTable
        table={tableWithFixedRows as typeof table}
        isLoading={false}
        emptyMessage="No channels found"
        className={"gap-0 " + styles.channelsSidebarTable + " [&>div:last-child]:hidden [&>div:first-child]:border-0 [&>div:first-child]:rounded-none [&>div:first-child]:min-h-0 [&>div:first-child]:flex-1 [&>div:first-child>div>table]:min-w-0! [&>div:first-child>div>table]:w-full"}
        onRowClick={handleRowClick}
        selectedRowId={selectedRowId}
        highlightSelectedRow={true}
      >
        {null}
      </DataTable>
    </div>
  );
}
