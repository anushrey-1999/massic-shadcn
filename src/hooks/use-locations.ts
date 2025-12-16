import { useQuery } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useMemo } from "react";

const LOCATIONS_KEY = "locations";
const MAX_LOCATIONS = 1000; // Limit to prevent freezing

interface LocationsResponse {
  locations: string[];
}

export function useLocations(country: string = "us") {
  const {
    data: locations = [],
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
          `/locations?country=${country}`,
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

  // Limit locations to prevent freezing - only show first MAX_LOCATIONS
  const limitedLocations = useMemo(() => {
    return locations.slice(0, MAX_LOCATIONS);
  }, [locations]);

  // Transform limited locations to options format for GenericInput
  const locationOptions = useMemo(() => {
    const options = limitedLocations.map((location) => ({
      value: location,
      label: location,
    }));

    // Add placeholder option at the beginning
    return [
      { value: "", label: "Location", disabled: true },
      ...options,
    ];
  }, [limitedLocations]);

  return {
    locations: limitedLocations,
    locationOptions,
    isLoading,
    isFetching,
    error,
  };
}

