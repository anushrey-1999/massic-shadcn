import * as z from "zod";
import { isValidWebsiteUrl } from "@/utils/utils";

export const businessInfoSchema = z.object({
  website: z
    .string()
    .min(1, "Website is required")
    .refine(
      (val) => isValidWebsiteUrl(val),
      { message: "Please enter a valid website URL (e.g., example.com, www.example.com, or https://example.com)" }
    ),
  businessName: z.string().min(1, "Business Name is required"),
  businessDescription: z.string(),
  primaryLocation: z.string().min(1, "Primary Location is required"),
  serviceType: z.enum(["physical", "online"]),
  recurringRevenue: z.string().optional(),
  avgOrderValue: z.union([z.string(), z.number()]).optional(),
  lifetimeValue: z
    .union([z.enum(["high", "low"]), z.literal("")])
    .optional(),
  offerings: z.enum(["products", "services", "both"]),
  offeringsList: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        link: z
          .string()
          .optional()
          .refine(
            (val) => {
              if (!val || val.trim() === "") return true;
              try {
                new URL(val);
                return true;
              } catch {
                return false;
              }
            },
            { message: "Please enter a valid URL" }
          ),
      })
    )
    .optional(),
  usps: z.string().optional(),
  ctas: z
    .array(
      z.object({
        buttonText: z.string().min(1, "Button Text is required"),
        url: z
          .string()
          .min(1, "URL is required")
          .refine((val) => isValidWebsiteUrl(val), {
            message: "Please enter a valid URL",
          }),
      })
    )
    .optional(),
  brandTerms: z.string().optional(),
  stakeholders: z
    .array(
      z.object({
        name: z.string().optional(),
        title: z.string().optional(),
      })
    )
    .optional(),
  locations: z
    .array(
      z.object({
        name: z.string().optional(),
        address: z.string().optional(),
        timezone: z.string().optional(),
      })
    )
    .optional(),
  competitors: z
    .array(
      z.object({
        url: z
          .string()
          .optional()
          .refine(
            (val) => {
              if (!val || val.trim() === "") return true;
              return isValidWebsiteUrl(val);
            },
            { message: "Please enter a valid URL" }
          ),
      })
    )
    .optional(),
  brandToneSocial: z
    .array(z.string())
    .max(3, "You can only select up to 3 options")
    .optional(),
  brandToneWeb: z
    .array(z.string())
    .max(3, "You can only select up to 3 options")
    .optional(),
});

export type BusinessInfoFormData = z.infer<typeof businessInfoSchema>;
