"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "@tanstack/react-form";
import { toast } from "sonner";

import { normalizeWebsiteUrl } from "@/utils/utils";
import type { useOfferingsExtractor } from "@/hooks/use-offerings-extractor";

type ExtractionController = ReturnType<typeof useOfferingsExtractor>;

/**
 * Writes completed offerings extraction results into `offeringsList`.
 *
 * This deliberately lives outside the Offerings section. The profile shells
 * render one section at a time, so while this ran inside `OfferingsForm` an
 * extraction that finished on any other section was never applied: the form
 * kept an empty offerings list (and its "incomplete" marker) until the user
 * happened to open the Offerings tab and mount the effect.
 *
 * Exactly one caller per extractor instance should enable this, otherwise the
 * same task can be applied twice.
 */
export function useApplyExtractedOfferings({
  form,
  extractionController,
  enabled = true,
}: {
  form: any;
  extractionController: ExtractionController | undefined | null;
  enabled?: boolean;
}) {
  const website = useStore(form.store, (state: any) => state.values?.website || "");

  const normalizeOfferingLink = useCallback(
    (rawLink: unknown) => {
      const link = String(rawLink ?? "").replace(/^sc-domain:/i, "").trim();
      if (!link) return "";
      if (/^(mailto:|tel:)/i.test(link)) return link;

      if (/^https?:\/\//i.test(link)) {
        return link.replace(/^http:\/\//i, "https://");
      }

      if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(link)) {
        return `https://${link.replace(/^\/+/, "")}`;
      }

      const baseUrl = normalizeWebsiteUrl(String(website ?? ""));
      if (!baseUrl) return "";

      try {
        return new URL(link, baseUrl).toString();
      } catch {
        return "";
      }
    },
    [website]
  );

  // Track processed taskId to avoid duplicate processing
  const processedTaskIdRef = useRef<string | null>(null);

  const {
    extractionStatus,
    extractionData,
    extractedOfferings,
    taskId,
    clearExtraction,
  } = extractionController ?? ({} as Partial<ExtractionController>);

  useEffect(() => {
    if (!enabled || !extractionController) return;

    // Process when:
    // 1. Status is "completed" OR
    // 2. We have extractionData with offerings (API might return data without status field)
    const hasCompletedStatus = extractionStatus === "completed";
    const hasOfferingsData =
      extractionData?.offerings &&
      Array.isArray(extractionData.offerings) &&
      extractionData.offerings.length > 0;
    const shouldProcess = taskId && (hasCompletedStatus || hasOfferingsData);

    if (!shouldProcess) return;

    // Avoid processing the same extraction twice
    if (processedTaskIdRef.current === taskId) {
      return;
    }

    const currentOfferings = (form.state.values?.offeringsList || []) as Array<
      Record<string, any>
    >;
    const hasAnyOffering = currentOfferings.some((offering) =>
      Boolean(
        String(offering?.name ?? "").trim() ||
          String(offering?.description ?? "").trim() ||
          String(offering?.link ?? "").trim()
      )
    );

    // Get offerings from extractionData if available and has items, otherwise use extractedOfferings
    // Prefer extractionData.offerings as it's the raw API response
    const rawOfferings =
      extractionData?.offerings &&
      Array.isArray(extractionData.offerings) &&
      extractionData.offerings.length > 0
        ? extractionData.offerings
        : extractedOfferings && extractedOfferings.length > 0
          ? extractedOfferings
          : [];

    if (rawOfferings.length === 0) {
      toast.warning(
        hasAnyOffering
          ? "No additional offerings found on the website"
          : "No offerings found on the website"
      );
      processedTaskIdRef.current = taskId;
      clearExtraction?.();
      return;
    }

    const offeringsArray = Array.isArray(rawOfferings) ? rawOfferings : [rawOfferings];

    const transformedOfferings = offeringsArray
      .map((offering: any) => ({
        name: (offering.name || offering.offering || "").trim(),
        description: (offering.description || "").trim(),
        link: normalizeOfferingLink(offering.url || offering.link),
        pricePositioning: (offering.price_positioning || offering.priceRange || "").trim(),
        offeringType: (offering.offering_type || offering.offeringType || "").trim(),
        priceRange: (offering.price_range || offering.priceRange || "").trim(),
        duration: (offering.duration || "").trim(),
        inclusions: Array.isArray(offering.inclusions)
          ? offering.inclusions.map((item: unknown) => String(item).trim()).filter(Boolean)
          : typeof offering.inclusions === "string"
            ? offering.inclusions
            : [],
      }))
      .filter((offering) => offering.name !== "");

    if (transformedOfferings.length === 0) {
      toast.warning("No valid offerings found on the website");
      processedTaskIdRef.current = taskId;
      clearExtraction?.();
      return;
    }

    processedTaskIdRef.current = taskId;

    const uniqueOfferings = transformedOfferings.filter(
      (offering, index, self) =>
        index ===
        self.findIndex(
          (o) =>
            o.name.toLowerCase().trim() === offering.name.toLowerCase().trim() &&
            offering.name.trim() !== ""
        )
    );

    form.setFieldValue("offeringsList", uniqueOfferings);

    const duplicateCount = transformedOfferings.length - uniqueOfferings.length;

    if (duplicateCount > 0) {
      toast.success(
        `Updated offerings from website (${duplicateCount} duplicates skipped). Total: ${uniqueOfferings.length} offerings.`
      );
    } else {
      toast.success(
        `Updated offerings from website. Total: ${uniqueOfferings.length} offerings.`
      );
    }

    clearExtraction?.();
  }, [
    clearExtraction,
    enabled,
    extractedOfferings,
    extractionController,
    extractionData,
    extractionStatus,
    form,
    normalizeOfferingLink,
    taskId,
  ]);
}
