"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { flexRender } from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const handleGa4Change = (siteUrl: string, propertyId: string) => {
    setLocalBusinesses((prev) =>
      prev.map((b) => {
        if (b.siteUrl === siteUrl) {
          const selectedGa4 =
            b.matchedGa4Multiple?.find(
              (ga4) => ga4.propertyId === propertyId
            ) || unmatchedGa4.find((ga4) => ga4.propertyId === propertyId);
          return { ...b, selectedGa4 };
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
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.original.businessProfile?.IsActive;
          const rowId = row.original.siteUrl || row.original.id;
          const isRowLoading = loadingRowId === rowId;

          return (
            <div className="flex items-center justify-center">
              {isRowLoading ? (
                <div className="h-9 w-9 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-9 w-9 cursor-pointer ${
                    isActive
                      ? "border border-[#33848480] bg-[#2E7D3214]"
                      : "border border-[#D32F2F4D]"
                  }`}
                  onClick={() => openToggleConfirm(row.original)}
                >
                  {isActive ? (
                    <Link className="h-4 w-4 text-green-600" />
                  ) : (
                    <Link2Off className="h-4 w-4 text-red-600" />
                  )}
                </Button>
              )}
            </div>
          );
        },
      },
      {
        id: "gsc",
        header: "GSC",
        cell: ({ row }) => {
          return (
            <div className="max-w-[300px] truncate">
              {removeScDomainPrefix(row.original.displayName)}
            </div>
          );
        },
      },
      {
        id: "ga4",
        header: "GA4",
        cell: ({ row }) => {
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

            return (
              <Select
                value={selectedPropertyId || undefined}
                onValueChange={(value) =>
                  handleGa4Change(rowData.siteUrl || "", value)
                }
              >
                <SelectTrigger className="w-full max-w-[300px] h-10 cursor-pointer">
                  <SelectValue placeholder="choose option">
                    {rowData.selectedGa4 ? (
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium text-sm">
                          {rowData.selectedGa4.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ID: {rowData.selectedGa4.propertyId}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        choose option
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {unmatchedGa4.map((ga4, i) => (
                    <SelectItem key={i} value={ga4.propertyId}>
                      <div className="flex flex-col gap-1 py-1">
                        <span className="font-medium text-sm">
                          {ga4.displayName || ga4.propertyDisplayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ID: {ga4.propertyId}
                        </span>
                        <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-muted rounded border text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span>
                            {ga4.accountName} ({ga4.accountId})
                          </span>
                        </div>
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
              const selectedPropertyId =
                rowData.selectedGa4?.propertyId || getPropertyId() || "";

              return (
                <Select
                  value={selectedPropertyId || undefined}
                  onValueChange={(value) =>
                    handleGa4Change(rowData.siteUrl || "", value)
                  }
                >
                  <SelectTrigger className="w-full max-w-[300px] h-auto py-2 border-yellow-300 bg-yellow-50/50 cursor-pointer">
                    <div className="flex items-center gap-2 w-full">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-sm">
                              Multiple GA4 matches found (
                              {rowData.matchedGa4Multiple?.length || 0}{" "}
                              options). Click to select a different one.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="font-medium text-sm truncate">
                          {getDisplayName()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          ID: {getPropertyId()}
                        </p>
                        <div className="flex items-center gap-1 mt-1 px-2 py-0.5 bg-muted rounded border text-xs text-muted-foreground w-fit max-w-full">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {getAccountName()} ({getAccountId()})
                          </span>
                        </div>
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ga4Options.map((ga4, i) => (
                      <SelectItem key={i} value={ga4.propertyId}>
                        <div className="flex flex-col gap-1 py-1">
                          <span className="font-medium text-sm">
                            {ga4.displayName || ga4.propertyDisplayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ID: {ga4.propertyId}
                          </span>
                          <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-muted rounded border text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>
                              {ga4.accountName} ({ga4.accountId})
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }

            // Single match - show static card (no dropdown needed)
            return (
              <div className="max-w-[300px] overflow-hidden">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    ID: {getPropertyId()}
                  </p>
                  <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-muted rounded border text-xs text-muted-foreground w-fit max-w-full">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {getAccountName()} ({getAccountId()})
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          return <span className="text-muted-foreground">Not Found</span>;
        },
      },
      {
        id: "gbps",
        header: "GBPs",
        cell: ({ row }) => {
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
        cell: ({ row }) => {
          const rowData = row.original;
          const hasBusinessProfile = !!rowData.businessProfile?.Id;
          const hasGsc = !!rowData.siteUrl || !!rowData.displayName;

          // Check if GA4 has been edited (user selected a different GA4 than what's saved)
          const checkGa4Edited = () => {
            if (!hasBusinessProfile) return false;
            // If there's a selectedGa4 and it differs from linkedPropertyId
            if (rowData.selectedGa4 && rowData.linkedPropertyId) {
              return (
                rowData.selectedGa4.propertyId !==
                (rowData.linkedPropertyId.PropertyId ||
                  rowData.linkedPropertyId.propertyId)
              );
            }
            // If there's a selectedGa4 but no linkedPropertyId, it means user selected one for the first time
            if (rowData.selectedGa4 && !rowData.linkedPropertyId) {
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
                size="sm"
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
                size="sm"
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
    [filteredData, allGBP, localBusinesses, unmatchedGa4]
  );

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
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Business Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            {FILTERS.map((tab) => {
              const count =
                tab.value === "all"
                  ? localBusinesses.length
                  : tab.value === "matched"
                  ? localBusinesses.filter((b) => b.matchedGa4).length
                  : localBusinesses.filter((b) => !b.matchedGa4).length;
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label} • {count}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

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
          /* Table */
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column.id as string}>
                        {typeof column.header === "string"
                          ? column.header
                          : column.header
                          ? flexRender(column.header, {
                              column: { id: column.id as string },
                              header: column.header,
                            } as any)
                          : null}
                      </TableHead>
                    ))}
                  </TableRow>
                  {/* Summary Row */}
                  <TableRow className="bg-[#FAFBFB]">
                    <TableCell className="text-sm text-[#00000061] font-medium border-r border-[#00000014]">
                      {totalActive} total
                    </TableCell>
                    <TableCell className="text-sm text-[#00000061] font-medium">
                      {totalBusinesses} total
                    </TableCell>
                    <TableCell className="text-sm text-[#00000061] font-medium">
                      {totalGa4} total
                    </TableCell>
                    <TableCell className="text-sm text-[#00000061] font-medium">
                      {totalGbps} total
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={handleAcceptAll}
                        disabled={
                          filter === "unmatched" ||
                          filteredData.length === 0 ||
                          isMutating
                        }
                        className="bg-[#0F4343] hover:bg-[#0F4343]/90 text-white w-full"
                      >
                        {createBusinessMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Accept all
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow key="no-results">
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row, index) => (
                      <TableRow key={row.id ? `${row.id}-${index}` : index}>
                        {columns.map((column) => {
                          const cellContext = {
                            row: { original: row, id: row.id },
                            column: { id: column.id as string },
                            getValue: () =>
                              row[column.id as keyof LinkedBusiness],
                          };
                          return (
                            <TableCell key={column.id as string}>
                              {column.cell
                                ? flexRender(column.cell, cellContext as any)
                                : null}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </table>
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
