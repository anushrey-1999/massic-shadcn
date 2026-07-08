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
    .refine(
      (val) => isValidWebsiteUrl(val),
      { message: "Please enter a valid website URL (e.g., example.com, www.example.com, or https://example.com)" }
    ),
  legalName: z.string().optional(),
  businessName: z.string().min(1, "Business Name is required"),
  businessCategory: z.string().optional(),
  foundingDate: z.string().optional(),
  logoUrl: z.string().optional(),
  siteName: z.string().optional(),
  alternateName: z.string().optional(),
  siteSearchUrlPattern: z.string().optional(),
  businessDescription: z.string(),
  primaryLocation: z.string().min(1, "Primary Location is required"),
  serviceAreaType: z.string().optional(),
  serviceAreas: z.array(z.string().trim().min(1)).optional(),
  serviceType: z.enum(["physical", "online", "both"]),
  lifetimeValue: z
    .union([z.enum(["high", "low"]), z.literal("")])
    .optional(),
  b2bB2c: z.string().optional(),
  segment: z.string().optional(),
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
        pricePositioning: z.string().optional(),
        offeringType: z.string().optional(),
        priceRange: z.string().optional(),
        duration: z.string().optional(),
        inclusions: z.union([z.array(z.string()), z.string()]).optional(),
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
        holidayHours: z.string().optional(),
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
  reviewRating: z.string().optional(),
  reviewCount: z.string().optional(),
  testimonials: z.array(z.string().trim().min(1)).optional(),
  colorsFontsCss: z.string().optional(),
  imagePhotoLibrary: z.array(z.string().trim().min(1)).optional(),
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
