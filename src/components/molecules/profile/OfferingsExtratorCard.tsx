"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { Typography } from "@/components/ui/typography";
import { FieldLabel } from "@/components/ui/field";
import {
  CustomAddRowTable,
  Column,
} from "@/components/organisms/CustomAddRowTable";

type BusinessInfoFormData = {
  website: string;
  businessName: string;
  businessDescription: string;
  primaryLocation: string;
  serviceType: "physical" | "online";
  recurringRevenue: string;
  avgOrderValue: string;
  lifetimeValue: string;
  offerings: "products" | "services" | "both";
  offeringsList?: Array<{
    name: string;
    description: string;
    link: string;
  }>;
};

type OfferingRow = {
  name: string;
  description: string;
  link: string;
};

interface OfferingsExtratorCardProps {
  form: any; // TanStack Form instance
  offeringsColumns: Column<OfferingRow>[];
  offeringsData: OfferingRow[];
  savedRowIndices: Set<number>;
  onAddRow: () => void;
  onRowChange: (rowIndex: number, field: string, value: string) => void;
  onDeleteRow: (rowIndex: number) => void;
  onSaveRow: (rowIndex: number, row: OfferingRow) => void;
}

const OfferingsExtratorCard = ({
  form,
  offeringsColumns,
  offeringsData,
  savedRowIndices,
  onAddRow,
  onRowChange,
  onDeleteRow,
  onSaveRow,
}: OfferingsExtratorCardProps) => {
  return (
    <Card
      id="offerings"
      variant="profileCard"
      className="py-6 px-4 bg-white border-none mt-6"
    >
      <CardHeader className="pb-4">
        <CardTitle>
          <Typography variant="h4">Offerings</Typography>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Card variant="profileCard">
          <CardContent>
            <GenericInput<BusinessInfoFormData>
              form={form as any}
              fieldName="offerings"
              type="radio-group"
              label="What type of offerings do you provide your customers?"
              required={true}
              orientation="horizontal"
              options={[
                { value: "products", label: "Products" },
                { value: "services", label: "Services" },
                { value: "both", label: "Both" },
              ]}
            />
          </CardContent>
        </Card>
        <Card variant="profileCard">
          <CardHeader className="">
            <CardTitle>
              <FieldLabel className="gap-0">
                <span className="text-destructive mr-0.5">*</span>
                What products and services does your business sell?
              </FieldLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomAddRowTable
              columns={offeringsColumns}
              data={offeringsData}
              onAddRow={onAddRow}
              onRowChange={onRowChange}
              onDeleteRow={onDeleteRow}
              onSaveRow={onSaveRow}
              savedRowIndices={savedRowIndices}
              addButtonText="Add Product/Service"
            />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default OfferingsExtratorCard;
