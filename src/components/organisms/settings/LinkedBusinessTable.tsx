"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { flexRender } from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Link, Link2Off, Search, AlertCircle, Building2 } from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "@/components/molecules/settings/CustomSelect";
import type { ColumnDef } from "@tanstack/react-table";

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

// Dummy data
const dummyBusinesses: BusinessData[] = [
  {
    id: "1",
    displayName: "example.com",
    siteUrl: "https://example.com",
    matchedGa4Multiple: [
      {
        displayName: "example.com - GA4",
        propertyId: "400010430",
        accountName: "Example Account",
        accountId: "987654321",
      },
      {
        displayName: "Example Property 2 - GA4",
        propertyId: "400010431",
        accountName: "Example Account 2",
        accountId: "987654322",
      },
    ],
    selectedGa4: {
      displayName: "example.com - GA4",
      propertyId: "400010430",
      accountName: "Example Account",
      accountId: "987654321",
    },
    gbps: [
      { title: "Main Location", locationId: "LOC001", location: "New York" },
      { title: "Branch Location", locationId: "LOC002", location: "Los Angeles" },
    ],
    selectedGbp: [
      { title: "Main Location", locationId: "LOC001", location: "New York", label: "Main Location (LOC001)" },
    ],
    businessProfile: {
      Id: "BP001",
      IsActive: true,
    },
  },
  {
    id: "2",
    displayName: "test-site.com",
    siteUrl: "https://test-site.com",
    matchedGa4Multiple: [
      {
        displayName: "test-site.com - GA4",
        propertyId: "259727439",
        accountName: "Test Account",
        accountId: "111111111",
      },
    ],
    gbps: [
      { title: "Test Location", locationId: "LOC003", location: "Chicago" },
      { title: "Test Location 2", locationId: "LOC004", location: "Boston" },
    ],
    selectedGbp: [],
    businessProfile: {
      Id: "BP002",
      IsActive: false,
    },
  },
  {
    id: "3",
    displayName: "demo-site.com",
    siteUrl: "https://demo-site.com",
    gbps: [],
    selectedGbp: [],
    noLocation: true,
  },
];

const removeScDomainPrefix = (url: string) => {
  return url.replace(/^sc-domain:/, "");
};

export default function LinkedBusinessTable() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [businesses, setBusinesses] = useState<BusinessData[]>(dummyBusinesses);
  const [editGa4Idx, setEditGa4Idx] = useState<number | null>(null);

  // Filter logic
  const filteredData = useMemo<BusinessData[]>(() => {
    return businesses.filter((row) => {
      if (search && !row.displayName?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (filter === "matched") return !!row.matchedGa4;
      if (filter === "unmatched") return !row.matchedGa4;
      return true;
    });
  }, [search, businesses, filter]);

  const handleToggleEdit = (rowIdx: number) => {
    setEditGa4Idx((prev) => (prev === rowIdx ? null : rowIdx));
  };

  const handleGa4Change = (rowId: string, propertyId: string) => {
    setBusinesses((prev) =>
      prev.map((b) => {
        if (b.id === rowId) {
          const selectedGa4 = b.matchedGa4Multiple?.find((ga4) => ga4.propertyId === propertyId);
          return { ...b, selectedGa4 };
        }
        return b;
      })
    );
  };

  const handleGbpChange = (rowId: string, selectedLocationIds: string[]) => {
    setBusinesses((prev) =>
      prev.map((b) => {
        if (b.id === rowId) {
          const hasNoLocation = selectedLocationIds.includes("no-location-exist");
          if (hasNoLocation) {
            return { ...b, selectedGbp: [], noLocation: true };
          }
          const selectedGbp = b.gbps
            ?.filter((gbp) => selectedLocationIds.includes(gbp.locationId))
            .map((gbp) => ({
              ...gbp,
              label: `${gbp.title} (${gbp.locationId})`,
            })) || [];
          return { ...b, selectedGbp, noLocation: false };
        }
        return b;
      })
    );
  };

  const handleAccept = (row: BusinessData) => {
    console.log("Accept business", row.id);
  };

  const handleSaveChanges = (row: BusinessData) => {
    console.log("Save changes for business", row.id);
  };

  const handleToggleLink = (row: BusinessData) => {
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === row.id
          ? {
              ...b,
              businessProfile: {
                ...b.businessProfile!,
                IsActive: !b.businessProfile?.IsActive,
              },
            }
          : b
      )
    );
  };

  const handleAcceptAll = () => {
    console.log("Accept all businesses");
  };

  const columns = useMemo<ColumnDef<BusinessData>[]>(
    () => [
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.original.businessProfile?.IsActive;
          return (
            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 ${
                  isActive
                    ? "border border-[#33848480] bg-[#2E7D3214]"
                    : "border border-[#D32F2F4D]"
                }`}
                onClick={() => handleToggleLink(row.original)}
              >
                {isActive ? (
                  <Link className="h-4 w-4 text-green-600" />
                ) : (
                  <Link2Off className="h-4 w-4 text-red-600" />
                )}
              </Button>
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
          const ga4Options = rowData.matchedGa4Multiple || [];
          const selectedPropertyId = rowData.selectedGa4?.propertyId || "";

          if (ga4Options.length === 0) {
            return <span className="text-muted-foreground">Not Found</span>;
          }

          return (
            <Select
              value={selectedPropertyId || undefined}
              onValueChange={(value) => handleGa4Change(rowData.id, value)}
            >
              <SelectTrigger className="w-full max-w-[300px] h-10">
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
                    <span className="text-muted-foreground">choose option</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {ga4Options.map((ga4, i) => (
                  <SelectItem key={i} value={ga4.propertyId}>
                    <div className="flex flex-col gap-1 py-1">
                      <span className="font-medium text-sm">
                        {ga4.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ID: {ga4.propertyId}
                      </span>
                      <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-muted rounded border text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{ga4.accountName} ({ga4.accountId})</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        id: "gbps",
        header: "GBPs",
        cell: ({ row }) => {
          const rowData = row.original;
          const selectedGbps = rowData.selectedGbp || [];
          const allGbps = rowData.gbps || [];
          const selectedLocationIds = selectedGbps.map((gbp) => gbp.locationId);
          const hasNoLocation = rowData.noLocation || false;

          // Create options including "No locations exist"
          const gbpOptions: CustomSelectOption[] = [
            { value: "no-location-exist", label: "No locations exist", locationId: "no-location-exist" },
            ...allGbps.map((gbp) => ({
              value: gbp.locationId,
              label: `${gbp.title} (${gbp.locationId})`,
              locationId: gbp.locationId,
            })),
          ];

          const currentValues = hasNoLocation
            ? ["no-location-exist"]
            : selectedLocationIds;

          const handleValueChange = (values: string[]) => {
            // CustomSelect already handles mutual exclusivity, just pass the values
            handleGbpChange(rowData.id, values);
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
          const hasChanges = !!rowData.selectedGa4;

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
    [editGa4Idx, filteredData]
  );

  const totalActive = filteredData.filter((row) => row.businessProfile?.IsActive).length;
  const totalBusinesses = filteredData.length;
  const totalGa4 = filteredData.filter((row) => row.ga4 || row.matchedGa4).length;
  const totalGbps = filteredData.filter((row) => (row.gbps?.length ?? 0) > 0 || row.noLocation).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Businesses</CardTitle>
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
                  ? businesses.length
                  : tab.value === "matched"
                  ? businesses.filter((b) => b.matchedGa4).length
                  : businesses.filter((b) => !b.matchedGa4).length;
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label} • {count}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Table */}
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
                  <TableCell className="text-right">
                    <Button
                      onClick={handleAcceptAll}
                      disabled={filter === "unmatched" || filteredData.length === 0}
                      className="bg-[#0F4343] hover:bg-[#0F4343]/90 text-white w-full"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Accept all
                    </Button>
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((column) => {
                        const cellContext = {
                          row: { original: row, id: row.id },
                          column: { id: column.id as string },
                          getValue: () => row[column.id as keyof BusinessData],
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
      </CardContent>
    </Card>
  );
}
