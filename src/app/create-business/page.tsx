"use client";

import React from "react";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { useLocations } from "@/hooks/use-locations";
import {
  useCreateBusiness,
  useBusinessProfiles,
} from "@/hooks/use-business-profiles";
import { CreateBusinessTemplate } from "@/components/templates/CreateBusinessTemplate";

const formSchema = z.object({
  website: z
    .string()
    .min(1, "Website is required")
    .url("Please enter a valid URL"),
  businessName: z.string().min(1, "Business Name is required"),
  primaryLocation: z.string().min(1, "Primary Location is required"),
  serveCustomers: z
    .string()
    .min(1, "Please select where you serve your customers")
    .refine((val) => val === "local" || val === "online", {
      message: "Please select where you serve your customers",
    }),
  offerType: z
    .string()
    .min(1, "Please select what you offer")
    .refine((val) => val === "products" || val === "services", {
      message: "Please select what you offer",
    }),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateBusinessPage() {
  const router = useRouter();

  // Fetch locations using React Query (limited to 1000 for performance)
  const { locationOptions, isLoading: locationsLoading } = useLocations("us");

  // Business creation hook
  const createBusiness = useCreateBusiness();
  const { refetchBusinessProfiles } = useBusinessProfiles();

  const form = useForm({
    defaultValues: {
      website: "",
      businessName: "",
      primaryLocation: "",
      serveCustomers: "",
      offerType: "",
    },
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        // Create business using the hook
        const result = await createBusiness.mutateAsync({
          website: value.website,
          businessName: value.businessName,
          primaryLocation: value.primaryLocation,
          serveCustomers: value.serveCustomers as "local" | "online",
          offerType: value.offerType as "products" | "services",
        });

        // Refresh business profiles list
        await refetchBusinessProfiles();

        // Navigate to the created business analytics page if available
        if (result?.createdBusiness?.UniqueId) {
          router.push(`/business/${result.createdBusiness.UniqueId}/analytics`);
        } else {
          router.push("/");
        }
      } catch (error) {
        // Error is already handled in the hook's onError
        throw error;
      }
    },
  });

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <CreateBusinessTemplate
      form={form}
      locationOptions={locationOptions}
      locationsLoading={locationsLoading}
      isSubmitting={form.state.isSubmitting}
      isPending={createBusiness.isPending}
      onCancel={handleCancel}
    />
  );
}
