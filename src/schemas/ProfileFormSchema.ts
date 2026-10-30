import * as z from "zod";
import { isValidWebsiteUrl } from "@/utils/utils";

const isValidCtaUrl = (val: string): boolean => {
  const s = String(val ?? "").trim();
  if (!s) return false;
  if (isValidWebsiteUrl(s)) return true;
  if (/^mailto:/i.test(s)) return true;
  if (/^tel:\s*\+?[0-9().\-\s]+$/i.test(s)) return true;
  return false;
};

export const businessInfoSchema = z.object({
  website: z
    .string()
    .min(1, "Website is required")
    .refine((value) => !value.trim() || isValidWebsiteUrl(value), {
      message: "Enter a valid website, such as example.com.",
    }),
  businessName: z.string().min(1, "Business Name is required"),
  primaryCategory: z.string().optional(),
  secondaryCategory: z.string().optional(),
  categoriesTagged: z.array(z.string().trim().min(1)).optional(),
  foundingDate: z
    .string()
    .optional()
    .refine(
      (value) =>
        !value ||
        (/^\d+$/.test(value.trim()) &&
          Number.isInteger(Number(value)) &&
          Number(value) >= 0),
      { message: "Year founded must be a whole number" },
    ),
  logoUrl: z.string().optional(),
  businessDescription: z.string(),
  primaryLocation: z.string().min(1, "Primary Location is required"),
  serviceAreaType: z.string().optional(),
  serviceAreas: z.array(z.string().trim().min(1)).optional(),
  serviceAreaDetails: z
    .array(
      z.object({
        name: z.string(),
        kind: z.enum(["city", "state", "region", "colloquial", "island"]),
        rank: z.number().optional(),
      }),
    )
    .optional(),
  serviceType: z
    .union([z.enum(["physical", "online", "both"]), z.literal("")])
    .optional(),
  lifetimeValue: z.union([z.enum(["high", "low"]), z.literal("")]).optional(),
  averageOrderValue: z
    .union([
      z.number().nonnegative("Average order value cannot be negative"),
      z.literal(""),
    ])
    .optional(),
  recurringFlag: z
    .union([z.enum(["yes", "no", "sometimes"]), z.literal(""), z.string()])
    .optional(),
  customerTypes: z.array(z.enum(["b2b", "b2c"])).optional(),
  offerings: z
    .union([z.enum(["products", "services", "both"]), z.literal("")])
    .optional(),
  offeringsList: z
    .array(
      z
        .object({
          // IMPORTANT:
          // Offerings tables often contain an extra blank row (e.g. user pressed Enter / clicked Add).
          // A fully-empty row should NOT block saving, but a partially-filled row still must have a name.
          name: z.string().optional(),
          clientId: z.string().optional(),
          description: z.string().optional(),
          link: z
            .string()
            .optional()
            .refine(
              (val) => !val || val.trim() === "" || isValidWebsiteUrl(val),
              { message: "Enter a valid URL, such as example.com." },
            ),
          offeringType: z.string().optional(),
          existingUrls: z.array(z.string()).optional(),
        })
        .superRefine((row, ctx) => {
          const name = String(row.name ?? "").trim();
          const hasAnyOtherValue = Boolean(
            String(row.description ?? "").trim() ||
              String(row.link ?? "").trim() ||
              String(row.offeringType ?? "").trim() ||
              (row.existingUrls ?? []).some((url) => Boolean(url.trim())),
          );

          // If the row has any data, require a name.
          if (hasAnyOtherValue && !name) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Name is required",
              path: ["name"],
            });
          }
        }),
    )
    .optional(),
  usps: z.string().optional(),
  differentiators: z
    .array(
      z.object({
        differentiator: z.string().trim().min(1),
      }),
    )
    .optional(),
  ctas: z
    .array(
      z.object({
        buttonText: z.string().min(1, "Button Text is required"),
        url: z
          .string()
          .min(1, "URL is required")
          .refine((val) => isValidCtaUrl(val), {
            message: "Please enter a valid URL",
          }),
      }),
    )
    .optional(),
  brandTerms: z.array(z.string().trim().min(1)).optional(),
  stakeholders: z
    .array(
      z.object({
        name: z.string().optional(),
        title: z.string().optional(),
        role: z.string().optional(),
      }),
    )
    .optional(),
  locations: z
    .array(
      z.object({
        // Carries the stable id of the stored physical location so edits keep their identity.
        id: z.string().optional(),
        name: z.string().optional(),
        address: z.string().optional(),
        timezone: z.string().optional(),
      }),
    )
    .optional(),
  detailedLocations: z
    .array(
      z.object({
        name: z.string().optional(),
        streetAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        mapLink: z.string().optional(),
        hours: z.string().optional(),
        primaryFlag: z.string().optional(),
      }),
    )
    .optional(),
  keyPeople: z
    .array(
      z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        title: z.string().optional(),
      }),
    )
    .optional(),
  licensesCompliance: z.array(z.string().trim().min(1)).optional(),
  awardsCertifications: z.array(z.string().trim().min(1)).optional(),
  socialProfiles: z
    .array(
      z.object({
        url: z.string().optional(),
      }),
    )
    .optional(),
  directoryProfiles: z
    .array(
      z.object({
        url: z.string().optional(),
      }),
    )
    .optional(),
  supportEmail: z.string().optional(),
  commsEmail: z.string().optional(),
  primaryPhone: z.string().optional(),
  additionalPhones: z.array(z.string().trim().min(1)).optional(),
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
            { message: "Please enter a valid URL" },
          ),
      }),
    )
    .optional(),
  brandToneSocial: z.array(z.string()).optional(),
  brandToneWeb: z.array(z.string()).optional(),
  calendarEvents: z
    .array(
      z.object({
        eventName: z.string().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
      })
    )
    .optional(),
});

export type BusinessInfoFormData = z.infer<typeof businessInfoSchema>;
