import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useMemo } from "react";
import { formatLocationLabel } from "@/utils/primary-location";
import type { LocationOption } from "@/store/business-store";

const LOCATIONS_KEY = "locations";
const EMPTY_LOCATIONS: string[] = [];

interface LocationsResponse {
  locations: string[];
}

export function useLocations(country: string = "us") {
  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery<string[]>({
    queryKey: [LOCATIONS_KEY, country],
    queryFn: async () => {
      if (!country) {
        return [];
      }

      try {
        const response = await api.get<LocationsResponse>(
          `/tools/locations?country=${country}`,
          "python"
        );

        // Filter out empty or invalid locations
        const validLocations = (response.locations || []).filter(
          (location) =>
            location && typeof location === "string" && location.trim().length > 0
        );

        return validLocations;
      } catch (error) {
        // Handle network errors gracefully - return empty array instead of throwing
        // This prevents the error from breaking the UI on first page load
        console.warn("Failed to fetch locations, using empty list:", error);
        return [];
      }
    },
    enabled: !!country,
    staleTime: 30 * 60 * 1000, // 30 minutes - locations don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1, // Only retry once for network errors
    retryDelay: 1000, // Wait 1 second before retry
  });

  const locations = data ?? EMPTY_LOCATIONS;

  // Transform all locations to options format for GenericInput.
  // Rendering/search are optimized in LocationSelect, so do not truncate here.
  const locationOptions = useMemo((): LocationOption[] => {
    const options: LocationOption[] = locations.map((location) => ({
      value: location,
      label: formatLocationLabel(location),
    }));

    // Add placeholder option at the beginning
    return [
      { value: "", label: "Location", disabled: true },
      ...options,
    ];
  }, [locations]);

  return {
    locations,
    locationOptions,
    isLoading,
    isFetching,
    error,
  };
}
