"use client";

import React, { forwardRef } from "react";
import { Column } from "@/components/organisms/CustomAddRowTable";
import BusinessInfoCard from "@/components/molecules/profile/BusinessInfoCard";
import OfferingsExtratorCard from "@/components/molecules/profile/OfferingsExtratorCard";
import ContentCuesCard from "@/components/molecules/profile/ContentCuesCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { FieldLabel } from "@/components/ui/field";
import { CustomAddRowTable } from "@/components/organisms/CustomAddRowTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OfferingRow = {
  name: string;
  description: string;
  link: string;
};

type CTARow = {
  buttonText: string;
  url: string;
};

type StakeholderRow = {
  name: string;
  title: string;
};

type LocationRow = {
  name: string;
  address: string;
  timezone: string;
};

type CompetitorRow = {
  url: string;
};

interface ProfileContentProps {
  form: any; // TanStack Form instance
  offeringsColumns: Column<OfferingRow>[];
  offeringsData: OfferingRow[];
  savedRowIndices: Set<number>;
  onAddOfferingRow: () => void;
  onRowChange: (rowIndex: number, field: string, value: string) => void;
  onDeleteRow: (rowIndex: number) => void;
  onSaveRow: (rowIndex: number, row: OfferingRow) => void;
  ctaColumns: Column<CTARow>[];
  ctasData: CTARow[];
  ctasSavedRowIndices: Set<number>;
  onAddCTARow: () => void;
  onCTARowChange: (rowIndex: number, field: string, value: string) => void;
  onCTADeleteRow: (rowIndex: number) => void;
  onCTASaveRow: (rowIndex: number, row: CTARow) => void;
  stakeholdersColumns: Column<StakeholderRow>[];
  stakeholdersData: StakeholderRow[];
  stakeholdersSavedRowIndices: Set<number>;
  onAddStakeholderRow: () => void;
  onStakeholderRowChange: (rowIndex: number, field: string, value: string) => void;
  onStakeholderDeleteRow: (rowIndex: number) => void;
  onStakeholderSaveRow: (rowIndex: number, row: StakeholderRow) => void;
  locationsColumns: Column<LocationRow>[];
  locationsData: LocationRow[];
  locationsSavedRowIndices: Set<number>;
  onAddLocationRow: () => void;
  onLocationRowChange: (rowIndex: number, field: string, value: string) => void;
  onLocationDeleteRow: (rowIndex: number) => void;
  onLocationSaveRow: (rowIndex: number, row: LocationRow) => void;
  competitorsColumns: Column<CompetitorRow>[];
  competitorsData: CompetitorRow[];
  competitorsSavedRowIndices: Set<number>;
  onAddCompetitorRow: () => void;
  onCompetitorRowChange: (rowIndex: number, field: string, value: string) => void;
  onCompetitorDeleteRow: (rowIndex: number) => void;
  onCompetitorSaveRow: (rowIndex: number, row: CompetitorRow) => void;
}

export const ProfileContent = forwardRef<HTMLDivElement, ProfileContentProps>(
  function ProfileContent({
    form,
    offeringsColumns,
    offeringsData,
    savedRowIndices,
    onAddOfferingRow,
    onRowChange,
    onDeleteRow,
    onSaveRow,
    ctaColumns,
    ctasData,
    ctasSavedRowIndices,
    onAddCTARow,
    onCTARowChange,
    onCTADeleteRow,
    onCTASaveRow,
    stakeholdersColumns,
    stakeholdersData,
    stakeholdersSavedRowIndices,
    onAddStakeholderRow,
    onStakeholderRowChange,
    onStakeholderDeleteRow,
    onStakeholderSaveRow,
    locationsColumns,
    locationsData,
    locationsSavedRowIndices,
    onAddLocationRow,
    onLocationRowChange,
    onLocationDeleteRow,
    onLocationSaveRow,
    competitorsColumns,
    competitorsData,
    competitorsSavedRowIndices,
    onAddCompetitorRow,
    onCompetitorRowChange,
    onCompetitorDeleteRow,
    onCompetitorSaveRow,
  }: ProfileContentProps, ref) {

    return (
      <div ref={ref} className="flex-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <BusinessInfoCard form={form} />

          <OfferingsExtratorCard
            form={form}
            offeringsColumns={offeringsColumns}
            offeringsData={offeringsData}
            savedRowIndices={savedRowIndices}
            onAddRow={onAddOfferingRow}
            onRowChange={onRowChange}
            onDeleteRow={onDeleteRow}
            onSaveRow={onSaveRow}
          />

          <ContentCuesCard
            form={form}
            ctaColumns={ctaColumns}
            ctasData={ctasData}
            ctasSavedRowIndices={ctasSavedRowIndices}
            onAddCTARow={onAddCTARow}
            onCTARowChange={onCTARowChange}
            onCTADeleteRow={onCTADeleteRow}
            onCTASaveRow={onCTASaveRow}
            stakeholdersColumns={stakeholdersColumns}
            stakeholdersData={stakeholdersData}
            stakeholdersSavedRowIndices={stakeholdersSavedRowIndices}
            onAddStakeholderRow={onAddStakeholderRow}
            onStakeholderRowChange={onStakeholderRowChange}
            onStakeholderDeleteRow={onStakeholderDeleteRow}
            onStakeholderSaveRow={onStakeholderSaveRow}
          />

          <Card
            id="locations-addresses"
            variant="profileCard"
            className="py-6 px-4 bg-white border-none mt-6"
          >
            <CardHeader className="pb-4">
              <CardTitle>
                <Typography variant="h4">Locations & Addresses</Typography>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card variant="profileCard">
                <CardHeader className="">
                  <CardTitle>
                    <FieldLabel className="gap-0">
                      Addresses from which your business operates
                    </FieldLabel>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomAddRowTable
                    columns={locationsColumns}
                    data={locationsData}
                    onAddRow={onAddLocationRow}
                    onRowChange={onLocationRowChange}
                    onDeleteRow={onLocationDeleteRow}
                    onSaveRow={onLocationSaveRow}
                    savedRowIndices={locationsSavedRowIndices}
                    addButtonText="Add Location"
                  />
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card
            id="competitors"
            variant="profileCard"
            className="py-6 px-4 bg-white border-none mt-6"
          >
            <CardHeader className="pb-4">
              <CardTitle>
                <Typography variant="h4">Competitors</Typography>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card variant="profileCard">
                <CardHeader className="">
                  <CardTitle>
                    <FieldLabel className="gap-0">
                      Websites of businesses that have similar offerings
                    </FieldLabel>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomAddRowTable
                    columns={competitorsColumns}
                    data={competitorsData}
                    onAddRow={onAddCompetitorRow}
                    onRowChange={onCompetitorRowChange}
                    onDeleteRow={onCompetitorDeleteRow}
                    onSaveRow={onCompetitorSaveRow}
                    savedRowIndices={competitorsSavedRowIndices}
                    addButtonText="Add URL"
                  />
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </form>
      </div>
    );
  }
);

export default ProfileContent;
