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

const imageLibraryItemSchema = z.union([
  z.string().trim().min(1),
  z.object({
    alt: z.string().optional(),
    url: z.string().trim().min(1),
  }),
]);

export const businessInfoSchema = z.object({
  website: z
    .string()
    .min(1, "Website is required")
    .refine(
      (val) => isValidWebsiteUrl(val),
      { message: "Please enter a valid website URL (e.g., example.com, www.example.com, or https://example.com)" }
    ),
  businessName: z.string().min(1, "Business Name is required"),
  businessCategory: z.string().optional(),
  foundingDate: z.string().optional(),
  logoUrl: z.string().optional(),
  businessDescription: z.string(),
  primaryLocation: z.string().min(1, "Primary Location is required"),
  serviceAreaType: z.string().optional(),
  serviceAreas: z.array(z.string().trim().min(1)).optional(),
  serviceType: z.enum(["physical", "online", "both"]),
  lifetimeValue: z
    .union([z.enum(["high", "low"]), z.literal("")])
    .optional(),
  b2bB2c: z.string().optional(),
  offerings: z.enum(["products", "services", "both"]),
  offeringsList: z
    .array(
      z
        .object({
          // IMPORTANT:
          // Offerings tables often contain an extra blank row (e.g. user pressed Enter / clicked Add).
          // A fully-empty row should NOT block saving, but a partially-filled row still must have a name.
          name: z.string().optional(),
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
          pricePositioning: z.string().optional(),
          offeringType: z.string().optional(),
          priceRange: z.string().optional(),
          duration: z.string().optional(),
          inclusions: z.union([z.array(z.string()), z.string()]).optional(),
        })
        .superRefine((row, ctx) => {
          const name = String(row.name ?? "").trim();
          const hasAnyOtherValue = Boolean(
            String(row.description ?? "").trim() ||
              String(row.link ?? "").trim() ||
              String(row.pricePositioning ?? "").trim() ||
              String(row.offeringType ?? "").trim() ||
              String(row.priceRange ?? "").trim() ||
              String(row.duration ?? "").trim() ||
              (Array.isArray(row.inclusions)
                ? row.inclusions.some((v) => Boolean(String(v ?? "").trim()))
                : String(row.inclusions ?? "").trim())
          );

          // If the row has any data, require a name.
          if (hasAnyOtherValue && !name) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Name is required",
              path: ["name"],
            });
          }
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
          .refine((val) => isValidCtaUrl(val), {
            message: "Please enter a valid URL",
          }),
      })
    )
    .optional(),
  brandTerms: z.array(z.string().trim().min(1)).optional(),
  stakeholders: z
    .array(
      z.object({
        name: z.string().optional(),
        title: z.string().optional(),
        bio: z.string().optional(),
      })
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
      })
    )
    .optional(),
  detailedLocations: z
    .array(
      z.object({
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
      })
    )
    .optional(),
  keyPeople: z
    .array(
      z.object({
        name: z.string().optional(),
        role: z.string().optional(),
        bio: z.string().optional(),
      })
    )
    .optional(),
  licensesCompliance: z.array(z.string().trim().min(1)).optional(),
  awardsCertifications: z.array(z.string().trim().min(1)).optional(),
  colorsFontsCss: z.string().optional(),
  imagePhotoLibrary: z.array(imageLibraryItemSchema).optional(),
  socialProfiles: z
    .array(
      z.object({
        url: z.string().optional(),
      })
    )
    .optional(),
  directoryProfiles: z
    .array(
      z.object({
        url: z.string().optional(),
      })
    )
    .optional(),
  supportEmail: z.string().optional(),
  commsEmail: z.string().optional(),
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
