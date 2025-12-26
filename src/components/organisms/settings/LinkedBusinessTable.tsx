"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableColumnHeader } from "@/components/filter-table/data-table-column-header";
import { useLocalDataTable } from "@/hooks/use-local-data-table";
import { flexRender } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import TextWithPill from "@/components/molecules/TextWithPill";
import {
  TableElement,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  Link,
  Link2Off,
  Search,
  AlertCircle,
  Building2,
  Loader2,
  ChevronDown,
  Link2,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/molecules/settings/CustomSelect";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useFetchBusinesses,
  useCreateAgencyBusiness,
  useLinkPropertyId,
  useToggleBusinessStatus,
  type LinkedBusiness,
  type GA4Property,
  type GBPLocation,
} from "@/hooks/use-linked-businesses";
import { Typography } from "@/components/ui/typography";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Matched", value: "matched" },
  { label: "Unmatched", value: "unmatched" },
];

interface BusinessData {
  id: string;
  displayName: string;
  siteUrl: string;
  ga4?: {
    displayName: string;
    propertyId: string;
    accountName: string;
    accountId: string;
  };
  matchedGa4?: {
    displayName: string;
    propertyId: string;
    accountName: string;
    accountId: string;
  };
  matchedGa4Multiple?: Array<{
    displayName: string;
    propertyId: string;
    accountName: string;
    accountId: string;
  }>;
  selectedGa4?: {
    displayName: string;
    propertyId: string;
    accountName: string;
    accountId: string;
  };
  gbps?: Array<{
    title: string;
    locationId: string;
    location: string;
  }>;
  selectedGbp?: Array<{
    title: string;
    locationId: string;
    location: string;
    label: string;
  }>;
  businessProfile?: {
    Id: string;
    IsActive: boolean;
  };
  noLocation?: boolean;
}

const removeScDomainPrefix = (url: string) => {
  return url.replace(/^sc-domain:/, "");
};

export default function LinkedBusinessTable() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [localBusinesses, setLocalBusinesses] = useState<LinkedBusiness[]>([]);
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);
  const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
  const [confirmToggleRow, setConfirmToggleRow] =
    useState<LinkedBusiness | null>(null);

  // API hooks
  const { data: businessesData, isLoading, refetch } = useFetchBusinesses();
  const createBusinessMutation = useCreateAgencyBusiness();
  const linkPropertyMutation = useLinkPropertyId();
  const toggleStatusMutation = useToggleBusinessStatus();

  // Sync API data with local state
  useEffect(() => {
    if (businessesData?.businesses) {
      setLocalBusinesses(businessesData.businesses as LinkedBusiness[]);
    }
  }, [businessesData]);

  const allGBP = businessesData?.allGBP || [];
  const unmatchedGa4 = businessesData?.unmatchedGa4 || [];

  // Filter logic
  const filteredData = useMemo<LinkedBusiness[]>(() => {
    return localBusinesses.filter((row) => {
      if (
        search &&
        !row.displayName?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (filter === "matched") return !!row.matchedGa4;
      if (filter === "unmatched") return !row.matchedGa4;
      return true;
    });
  }, [search, localBusinesses, filter]);

  const handleGa4Change = (siteUrl: string, propertyId: string | null) => {
    setLocalBusinesses((prev) =>
      prev.map((b) => {
        if (b.siteUrl === siteUrl) {
          if (propertyId === null) {
            // Clear selection and set flag to indicate explicit clear
            return { ...b, selectedGa4: undefined, ga4Cleared: true };
          }
          const selectedGa4 =
            b.matchedGa4Multiple?.find(
              (ga4) => ga4.propertyId === propertyId
            ) || unmatchedGa4.find((ga4) => ga4.propertyId === propertyId);
          // When selecting, clear the ga4Cleared flag
          return { ...b, selectedGa4, ga4Cleared: false };
        }
        return b;
      })
    );
  };

  const handleGbpChange = (siteUrl: string, selectedLocationIds: string[]) => {
    setLocalBusinesses((prev) =>
      prev.map((b) => {
        if (b.siteUrl === siteUrl) {
          const hasNoLocation =
            selectedLocationIds.includes("no-location-exist");
          if (hasNoLocation) {
            return { ...b, selectedGbp: [], noLocation: true };
          }
          const selectedGbp = allGBP
            .filter((gbp) => selectedLocationIds.includes(gbp.locationId))
            .map((gbp) => ({
              ...gbp,
              label: `${gbp.title} (${gbp.locationId})`,
            }));
          return { ...b, selectedGbp, noLocation: false };
        }
        return b;
      })
    );
  };

  const handleAccept = async (row: LinkedBusiness) => {
    await createBusinessMutation.mutateAsync([row]);
  };

  const handleSaveChanges = async (row: LinkedBusiness) => {
    await linkPropertyMutation.mutateAsync({ business: row });
  };

  const handleToggleLink = async (row: LinkedBusiness) => {
    const rowId = row.siteUrl || row.id;
    setLoadingRowId(rowId || null);
    try {
      await toggleStatusMutation.mutateAsync({ business: row });
    } finally {
      setLoadingRowId(null);
    }
  };

  const openToggleConfirm = (row: LinkedBusiness) => {
    setConfirmToggleRow(row);
    setConfirmToggleOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!confirmToggleRow) return;
    await handleToggleLink(confirmToggleRow);
    setConfirmToggleOpen(false);
    setConfirmToggleRow(null);
  };

  const handleAcceptAll = async () => {
    const businessesToAccept = filteredData.filter(
      (b) => !b.businessProfile?.Id && (b.siteUrl || b.displayName)
    );
    if (businessesToAccept.length > 0) {
      await createBusinessMutation.mutateAsync(businessesToAccept);
    }
  };

  const isMutating =
    createBusinessMutation.isPending ||
    linkPropertyMutation.isPending ||
    toggleStatusMutation.isPending;

  const columns = useMemo<ColumnDef<LinkedBusiness>[]>(
    () => [
      {
        id: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Status" />
        ),
        enableSorting: true,
        accessorFn: (row) => row.businessProfile?.IsActive ? "active" : "inactive",
        meta: {
          align: "left",
        },
        cell: ({ row }) => {
          if ((row.original as any).isSummary) {
            return (
              <div className="text-xs font-mono text-general-muted-foreground">
                {totalActive} total
              </div>
            );
          }
          const isActive = row.original.businessProfile?.IsActive;
          const rowId = row.original.siteUrl || row.original.id;
          const isRowLoading = loadingRowId === rowId;

          return (
            <div className="flex items-center justify-start">
              {isRowLoading ? (
                <div className="h-9 w-9 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 cursor-pointer ${isActive
                      ? "bg-[#2E6A56] text-white"
                      : "border border-[#DC2626] bg-[#FEF2F2]"
                    }`}
                  onClick={() => openToggleConfirm(row.original)}
                >
                  {isActive ? (
                    <Link2 className="h-4.5 w-4.5 " />
                  ) : (
                    <Link2Off className="h-4.5 w-4.5 text-red-600" />
                  )}
                </Button>
              )}
            </div>
          );
        },
      },
      {
        id: "gsc",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="GSC" />
        ),
        enableSorting: true,
        accessorFn: (row) => removeScDomainPrefix(row.displayName || ""),
        cell: ({ row }) => {
          if ((row.original as any).isSummary) {
            return (
              <div className="text-xs font-mono text-general-muted-foreground">
                {totalBusinesses} total
              </div>
            );
          }
          return (
            <div className="max-w-[300px] truncate">
              {removeScDomainPrefix(row.original.displayName)}
            </div>
          );
        },
      },
      {
        id: "ga4",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="GA4" />
        ),
        enableSorting: true,
        accessorFn: (row) => {
          const getDisplayName = () =>
            row.selectedGa4?.displayName ??
            row.linkedPropertyId?.displayName ??
            row.matchedGa4?.displayName;
          return getDisplayName() || "Not Found";
        },
        cell: ({ row }) => {
          if ((row.original as any).isSummary) {
            return (
              <div className="text-xs font-mono text-general-muted-foreground">
                {totalGa4} total
              </div>
            );
          }
          const rowData = row.original;
          const hasMultipleMatches =
            (rowData.matchedGa4Multiple?.length ?? 0) > 1;
          const hasUnmatchedData = unmatchedGa4.length > 0;
          const hasLinkedData = rowData.linkedPropertyId || rowData.matchedGa4;

          // Helper functions
          const getDisplayName = () =>
            rowData.selectedGa4?.displayName ??
            rowData.linkedPropertyId?.displayName ??
            rowData.matchedGa4?.displayName;
          const getPropertyId = () =>
            rowData.selectedGa4?.propertyId ??
            rowData.linkedPropertyId?.PropertyId ??
            rowData.matchedGa4?.propertyId;
          const getAccountName = () =>
            rowData.selectedGa4?.accountName ??
            rowData.linkedPropertyId?.accountName ??
            rowData.matchedGa4?.accountName;
          const getAccountId = () =>
            rowData.selectedGa4?.accountId ??
            rowData.linkedPropertyId?.accountId ??
            rowData.matchedGa4?.accountId;

          // Case 1: No linked data but unmatched GA4 available - show dropdown to select
          if (!hasLinkedData && hasUnmatchedData) {
            const selectedPropertyId = rowData.selectedGa4?.propertyId || "";
            const selectedGa4 = rowData.selectedGa4 || unmatchedGa4.find(ga4 => ga4.propertyId === selectedPropertyId);

            return (
              <Select
                value={selectedPropertyId || undefined}
                onValueChange={(value) =>
                  handleGa4Change(rowData.siteUrl || "", value)
                }
              >
                <SelectTrigger className="w-full max-w-[300px] h-auto py-1.5 px-2  border rounded-md cursor-pointer hover:bg-muted/70 [&>svg]:hidden">
                  {selectedGa4 ? (
                    <div className="flex items-center justify-between w-full gap-2 ">
                      <TextWithPill
                        displayName={selectedGa4.displayName || selectedGa4.propertyDisplayName || ""}
                        propertyId={selectedGa4.propertyId}
                        accountName={selectedGa4.accountName}
                        accountId={selectedGa4.accountId}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <div
                          role="button"
                          tabIndex={0}
                          className="h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer pointer-events-auto"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleGa4Change(rowData.siteUrl || "", null);
                          }}
                        >
                          <X className="h-3 w-3 text-muted-foreground pointer-events-none" />
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-muted-foreground font-normal text-xs">Select GA4</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  )}
                </SelectTrigger>
                <SelectContent className="max-h-[500px]">
                  {unmatchedGa4.map((ga4, i) => (
                    <SelectItem key={i} value={ga4.propertyId} className="cursor-pointer">
                      <div className="flex flex-col gap-1 py-1.5">
                        <TextWithPill
                          displayName={ga4.displayName || ga4.propertyDisplayName || ""}
                          propertyId={ga4.propertyId}
                          accountName={ga4.accountName}
                          accountId={ga4.accountId}
                        />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          // Case 2: Has linked/matched data
          if (hasLinkedData) {
            // If multiple matches, wrap card in a Select dropdown
            if (hasMultipleMatches) {
              const ga4Options = rowData.matchedGa4Multiple || [];
              const isCleared = rowData.ga4Cleared === true;

              // Only show selected value if not cleared
              const displayGa4 = isCleared ? null : (rowData.selectedGa4 || rowData.matchedGa4 || rowData.linkedPropertyId);
              const selectedPropertyId = isCleared ? "" : (rowData.selectedGa4?.propertyId || getPropertyId() || "");

              // Show X button if there's a displayed value (either selectedGa4 or default matchedGa4)
              const showClearButton = !isCleared && (rowData.selectedGa4 || rowData.matchedGa4);

              return (
                <Select
                  value={selectedPropertyId || undefined}
                  onValueChange={(value) =>
                    handleGa4Change(rowData.siteUrl || "", value)
                  }
                >
                  <SelectTrigger className="w-full max-w-[300px] py-1.5 px-2  border rounded-md cursor-pointer hover:bg-muted/70 [&>svg]:hidden min-h-[60px]">
                    {displayGa4 ? (
                      <div className="flex items-center justify-between w-full gap-1 ">
                        <TextWithPill
                          displayName={displayGa4.displayName || displayGa4.propertyDisplayName || ""}
                          propertyId={displayGa4.propertyId || (displayGa4 as any).PropertyId}
                          accountName={displayGa4.accountName}
                          accountId={displayGa4.accountId}
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          {showClearButton && (
                            <div
                              role="button"
                              tabIndex={0}
                              className="h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer pointer-events-auto"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleGa4Change(rowData.siteUrl || "", null);
                              }}
                            >
                              <X className="h-3 w-3 text-muted-foreground pointer-events-none" />
                            </div>
                          )}
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-muted-foreground font-normal text-xs">Select GA4</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    )}
                  </SelectTrigger>
                  <SelectContent className="max-h-[500px]">
                    {ga4Options.map((ga4, i) => (
                      <SelectItem key={i} value={ga4.propertyId} className="cursor-pointer">
                        <div className="flex flex-col gap-1 py-1.5 ">
                          <TextWithPill
                            displayName={ga4.displayName || ga4.propertyDisplayName || ""}
                            propertyId={ga4.propertyId}
                            accountName={ga4.accountName}
                            accountId={ga4.accountId}
                          />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }

            // Single match - show as selectable card (can still be changed if needed)
            return (
              <div className="max-w-[300px] overflow-hidden">
                <div className="flex flex-col gap-1 py-1.5 px-2 border border-general-border rounded-md">
                  <TextWithPill
                    displayName={getDisplayName() || ""}
                    propertyId={getPropertyId()}
                    accountName={getAccountName()}
                    accountId={getAccountId()}
                  />
                </div>
              </div>
            );
          }

          return <span className="text-muted-foreground">Not Found</span>;
        },
      },
      {
        id: "gbps",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="GBPs" />
        ),
        enableSorting: true,
        accessorFn: (row) => {
          const selectedGbps = row.selectedGbp || row.gbps || [];
          return selectedGbps.length > 0 ? selectedGbps.map(g => g.title || g.location).join(", ") : (row.noLocation ? "No locations exist" : "");
        },
        cell: ({ row }) => {
          if ((row.original as any).isSummary) {
            return (
              <div className="text-xs font-mono text-general-muted-foreground">
                {totalGbps} total
              </div>
            );
          }
          const rowData = row.original;
          const rowIdx = filteredData.findIndex(
            (b) => b.siteUrl === rowData.siteUrl
          );
          const selectedGbps =
            localBusinesses[rowIdx]?.selectedGbp || rowData.selectedGbp || [];
          const selectedLocationIds = selectedGbps.map((gbp) => gbp.locationId);
          const hasNoLocation =
            localBusinesses[rowIdx]?.noLocation ?? rowData.noLocation ?? false;

          // Create options from allGBP, filtering out already selected by other businesses
          const availableGbps = allGBP.filter(
            (gbp) =>
              !localBusinesses.some(
                (business, i) =>
                  i !== rowIdx &&
                  business.selectedGbp?.some(
                    (selected) => selected.location === gbp.location
                  )
              )
          );

          // Create options including "No locations exist"
          const gbpOptions: CustomSelectOption[] = [
            {
              value: "no-location-exist",
              label: "No locations exist",
              locationId: "no-location-exist",
            },
            ...availableGbps.map((gbp) => ({
              value: gbp.locationId,
              label: `${gbp.title} (${gbp.locationId})`,
              locationId: gbp.locationId,
            })),
          ];

          const currentValues = hasNoLocation
            ? ["no-location-exist"]
            : selectedLocationIds;

          const handleValueChange = (values: string[]) => {
            handleGbpChange(rowData.siteUrl || "", values);
          };

          return (
            <CustomSelect
              options={gbpOptions}
              value={currentValues}
              onChange={handleValueChange}
              placeholder="Select GBPs"
              searchPlaceholder="Search locations..."
              emptyMessage="No options available"
              maxWidth="300px"
            />
          );
        },
      },
      {
        id: "actions",
        header: "Suggested Matches",
        enableSorting: false,
        cell: ({ row }) => {
          if ((row.original as any).isSummary) {
            return (
              <Button
                onClick={handleAcceptAll}
                value={'default'}
                disabled={
                  filter === "unmatched" ||
                  filteredData.length === 0 ||
                  isMutating
                }
                className="w-full"
              >
                {createBusinessMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Accept all
              </Button>
            );
          }
          const rowData = row.original;
          const hasBusinessProfile = !!rowData.businessProfile?.Id;
          const hasGsc = !!rowData.siteUrl || !!rowData.displayName;

          // Check if GA4 has been edited (user selected a different GA4 than what's saved)
          const checkGa4Edited = () => {
            if (!hasBusinessProfile) return false;

            // Determine the original GA4 property ID (from linkedPropertyId or matchedGa4)
            const originalGa4Id = rowData.linkedPropertyId?.PropertyId ||
              rowData.linkedPropertyId?.propertyId ||
              rowData.matchedGa4?.propertyId;

            // If GA4 was cleared and there was an original, it's a change
            if (rowData.ga4Cleared && originalGa4Id) {
              return true;
            }

            // If there's a selectedGa4, compare with original
            if (rowData.selectedGa4 && originalGa4Id) {
              return rowData.selectedGa4.propertyId !== originalGa4Id;
            }

            // If there's a selectedGa4 but no original, it means user selected one for the first time
            if (rowData.selectedGa4 && !originalGa4Id) {
              return true;
            }
            return false;
          };

          // Check if GBP has been edited (compare current selection with backend locations)
          const checkGbpEdited = () => {
            if (!hasBusinessProfile) return false;

            // Check NoLocationExist status change
            const backendNoLocationExist =
              rowData.businessProfile?.NoLocationExist === true;
            const currentNoLocation = rowData.noLocation === true;

            if (backendNoLocationExist !== currentNoLocation) return true;

            // If both are "no location", no changes
            if (currentNoLocation && backendNoLocationExist) return false;

            // Compare selected GBP locations with backend locations
            const selectedGbpLocations = (rowData.selectedGbp || [])
              .filter((gbp: any) => !gbp.isNoLocationOption)
              .map((gbp: any) => gbp.location);
            const businessLocations =
              rowData.businessProfile?.Locations?.map((loc: any) => loc.Name) ||
              [];
            if (selectedGbpLocations.length !== businessLocations.length)
              return true;

            const selectedSet = new Set(selectedGbpLocations);
            for (const loc of businessLocations) {
              if (!selectedSet.has(loc)) return true;
            }

            return false;
          };
          const hasChanges = checkGa4Edited() || checkGbpEdited();

          if (hasBusinessProfile && hasChanges) {
            return (
              <Button
                variant="outline"
                onClick={() => handleSaveChanges(rowData)}
                className="w-full"
              >
                Save Changes
              </Button>
            );
          }

          if (!hasBusinessProfile && hasGsc) {
            return (
              <Button
                variant="outline"

                onClick={() => handleAccept(rowData)}
                className="w-full"
              >
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
            );
          }

          return null;
        },
      },
    ],
    [allGBP, localBusinesses, unmatchedGa4, loadingRowId]
  );

  // Create summary row data
  const summaryRow = useMemo(() => ({
    id: "summary",
    displayName: "",
    siteUrl: "",
    isSummary: true,
  } as LinkedBusiness & { isSummary: boolean }), []);

  // Add summary row as first row
  const tableData = useMemo(() => {
    return [summaryRow, ...filteredData];
  }, [summaryRow, filteredData]);

  const { table } = useLocalDataTable({
    data: tableData,
    columns,
    getRowId: (row) => {
      if ((row as any).isSummary) return "summary";
      return (row as LinkedBusiness).siteUrl || (row as LinkedBusiness).id || String(Math.random());
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 100,
      },
    },
  });

  // Create a table proxy that always returns summary row first
  const sortingState = table.getState().sorting;
  const tableWithFixedSummary = useMemo(() => {
    const originalGetRowModel = table.getRowModel.bind(table);
    return {
      ...table,
      getRowModel: () => {
        // Get the current sorted rows from the table
        const originalModel = originalGetRowModel();
        const originalRows = originalModel.rows;

        // Separate summary row from other rows
        const summaryRow = originalRows.find((row) => (row.original as any).isSummary);
        const otherRows = originalRows.filter((row) => !(row.original as any).isSummary);

        // Always put summary row first, then the sorted other rows
        const sortedRows = summaryRow ? [summaryRow, ...otherRows] : originalRows;

        return {
          ...originalModel,
          rows: sortedRows,
          flatRows: sortedRows,
        };
      },
    };
  }, [table, sortingState]);

  const totalActive = filteredData.filter(
    (row) => row.businessProfile?.IsActive
  ).length;
  const totalBusinesses = filteredData.length;
  const totalGa4 = filteredData.filter(
    (row) => row.matchedGa4 || row.linkedPropertyId
  ).length;
  const totalGbps = filteredData.filter(
    (row) => (row.gbps?.length ?? 0) > 0 || row.noLocation
  ).length;

  return (
    <Card variant="profileCard" className="p-4 bg-white border-none">
      <CardHeader>
        <CardTitle className="pb-6">
          <Typography variant="h4">Linked Businesses</Typography>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">


        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter} >
          <TabsList className="bg-general-border rounded-lg">
            {FILTERS.map((tab) => {
              const count =
                tab.value === "all"
                  ? localBusinesses.length
                  : tab.value === "matched"
                    ? localBusinesses.filter((b) => b.matchedGa4).length
                    : localBusinesses.filter((b) => !b.matchedGa4).length;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="font-normal">
                  {tab.label} • {count}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Search Bar */}
        <div className="relative w-1/3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Business Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>


        {/* Loading State */}
        {isLoading ? (
          <div className="border rounded-lg p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading businesses...
              </p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <TableElement>
                <TableHeader>
                  {tableWithFixedSummary.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className="p-0"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {tableWithFixedSummary.getRowModel().rows?.length ? (
                    tableWithFixedSummary.getRowModel().rows.map((row) => {
                      const isSummary = (row.original as any).isSummary;
                      return (
                        <TableRow
                          key={row.id}
                          className={cn(
                            isSummary && "bg-foreground-light"
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                "px-2 py-1.5",

                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={tableWithFixedSummary.getVisibleLeafColumns().length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </TableElement>
            </div>
          </div>
        )}
      </CardContent>

      {/* Confirm link/unlink (mirrors old UI warning) */}
      <AlertDialog
        open={confirmToggleOpen}
        onOpenChange={(open) => {
          setConfirmToggleOpen(open);
          if (!open) setConfirmToggleRow(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggleRow?.businessProfile?.IsActive
                ? "Unlink Business"
                : "Link Business"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggleRow?.businessProfile?.IsActive
                ? "Unlinking this business will deactivate it, cancel any associated subscription, and remove it from your profile along with all linked accounts (GSC, GA4, GBP). This impacts your strategy and execution. Only do this if your business goals have significantly changed."
                : "Linking this business will add it and all linked accounts (GSC, GA4, GBP) to your profile. This impacts your strategy and execution. Only do this if your business goals have significantly changed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleStatusMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant={
                  confirmToggleRow?.businessProfile?.IsActive
                    ? "destructive"
                    : "default"
                }
                onClick={handleConfirmToggle}
                disabled={toggleStatusMutation.isPending}
              >
                {toggleStatusMutation.isPending
                  ? "Please wait..."
                  : confirmToggleRow?.businessProfile?.IsActive
                    ? "Unlink"
                    : "Link"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
