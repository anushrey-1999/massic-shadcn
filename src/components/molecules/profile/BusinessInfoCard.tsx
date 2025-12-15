"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GenericInput } from "@/components/ui/generic-input";
import { Typography } from "@/components/ui/typography";

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

interface BusinessInfoCardProps {
  form: any; // TanStack Form instance
}

const BusinessInfoCard = ({ form }: BusinessInfoCardProps) => {
  return (
    <Card
      id="business-info"
      variant="profileCard"
      className="py-6 px-4 bg-white border-none"
    >
      <CardHeader className="pb-4">
        <CardTitle>
          <Typography variant="h4">Business Info</Typography>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Row 1 */}
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="website"
                type="input"
                inputVariant="noBorder"
                label="Website"
                required={true}
                placeholder="Provide the official url of your business website"
              />
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="businessName"
                type="input"
                label="Business Name"
                inputVariant="noBorder"
                required
                placeholder="Provide the brand name of your business"
              />
            </CardContent>
          </Card>

          {/* Row 2 */}
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="businessDescription"
                type="textarea"
                inputVariant="noBorder"
                label="Business Description"
                placeholder="Add a short overview of your business, products, or services."
                rows={4}
              />
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="primaryLocation"
                type="select"
                label="Primary Location"
                required={true}
                inputVariant="noBorder"
                placeholder="Where are your customers primarily located?"
                options={[
                  {
                    value: "",
                    label: "Select a location",
                    disabled: true,
                  },
                  { value: "us", label: "United States" },
                  { value: "uk", label: "United Kingdom" },
                  { value: "ca", label: "Canada" },
                  { value: "au", label: "Australia" },
                  { value: "other", label: "Other" },
                ]}
              />
            </CardContent>
          </Card>

          {/* Row 3 */}
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="serviceType"
                type="radio-group"
                label="Where do you primarily serve your customers?"
                required={true}
                orientation="horizontal"
                options={[
                  { value: "physical", label: "Physical Location" },
                  { value: "online", label: "Online" },
                ]}
              />
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="recurringRevenue"
                type="select"
                inputVariant="noBorder"
                label="Recurring Revenue"
                required={true}
                placeholder="Is your revenue earned on a set schedule?"
                options={[
                  {
                    value: "",
                    label: "Select an option",
                    disabled: true,
                  },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "partial", label: "Partial" },
                ]}
              />
            </CardContent>
          </Card>

          {/* Row 4 */}
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="avgOrderValue"
                type="number"
                inputVariant="noBorder"
                label="Avg. Order Value ($)"
                placeholder="Total amount of a single order in USD"
              />
            </CardContent>
          </Card>
          <Card variant="profileCard">
            <CardContent>
              <GenericInput<BusinessInfoFormData>
                form={form as any}
                fieldName="lifetimeValue"
                type="number"
                inputVariant="noBorder"
                label="Lifetime Value ($)"
                placeholder="Total amount earned on all orders in USD"
              />
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessInfoCard;
