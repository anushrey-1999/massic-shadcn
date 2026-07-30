import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/hooks/use-api";
import { useBusinessStore, BusinessProfile, type LocationOption } from "@/store/business-store";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { parsePrimaryLocationForPayload } from "@/utils/primary-location";
import { cleanWebsiteUrl, normalizeDomainForFavicon } from "@/utils/utils";

const BUSINESS_PROFILES_KEY = "businessProfiles";

// Extract query function to reuse in mutation
//
// `strict` exists for the create flow. A silently-empty list there is dangerous:
// it makes every pre-existing business look "new", which is how a create can end
// up pointing at somebody else's business. Strict callers get an exception instead.
async function fetchBusinessProfiles(
  userUniqueId: string | undefined,
  isPitch?: boolean,
  options?: { strict?: boolean }
): Promise<BusinessProfile[]> {
  const strict = options?.strict === true;

  if (!userUniqueId) {
    if (strict) throw new Error("User not authenticated");
    return [];
  }

  let url = `/profile/get-user-business-profiles/?useruniqueId=${userUniqueId}`;
  if (isPitch !== undefined) {
    url += `&isPitch=${isPitch}`;
  }

  const response = await api.get<{ err: boolean; data: string; message?: string }>(
    url,
    "node"
  );

  if (response.err === true || response.data == null) {
    if (strict) {
      throw new Error(response.message || "Failed to load existing businesses");
    }
    return [];
  }

  if (response.data === "") {
    return [];
  }

  try {
    const parsedProfiles: BusinessProfile[] = JSON.parse(response.data);
    return Array.isArray(parsedProfiles) ? parsedProfiles : [];
  } catch (error) {
    if (strict) {
      throw new Error("Failed to read existing businesses");
    }
    return [];
  }
}

export async function fetchPitchBusinessProfiles(userUniqueId: string | undefined): Promise<BusinessProfile[]> {
  return fetchBusinessProfiles(userUniqueId, true);
}

export function useBusinessProfiles() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    expandedBusinessId,
    setBusinessProfiles,
    setError,
  } = useBusinessStore();

  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;

  const {
    data: profiles = [],
    isLoading: sidebarDataLoading,
    isFetching,
    refetch,
  } = useQuery<BusinessProfile[]>({
    queryKey: [BUSINESS_PROFILES_KEY, userUniqueId],
    queryFn: async () => {
      if (!userUniqueId) {
        console.warn("[useBusinessProfiles] No userUniqueId found. User object:", user);
        return [];
      }

      const parsedProfiles = await fetchBusinessProfiles(userUniqueId);
      setBusinessProfiles(parsedProfiles);
      return parsedProfiles;
    },
    enabled: isAuthenticated && !!userUniqueId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnReconnect: true, // Refetch when network reconnects
    structuralSharing: true, // Prevent unnecessary re-renders when data hasn't changed
  });

  return {
    profiles,
    sidebarDataLoading,
    isFetching,
    expandedBusinessId,
    refetchBusinessProfiles: refetch,
  };
}

export function usePitchBusinesses() {
  const { user, isAuthenticated } = useAuthStore();
  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;

  const {
    data: pitchBusinesses = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<BusinessProfile[]>({
    queryKey: ["pitchBusinesses", userUniqueId],
    queryFn: async () => {
      if (!userUniqueId) {
        return [];
      }

      return fetchBusinessProfiles(userUniqueId, true);
    },
    enabled: isAuthenticated && !!userUniqueId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    pitchBusinesses,
    isLoading,
    isFetching,
    refetch,
  };
}

export function useBusinessProfileById(businessUniqueId: string | null) {
  const { setProfileDataByUniqueID } = useBusinessStore();

  const {
    data: profileData,
    isLoading: profileDataLoading,
    refetch,
  } = useQuery<BusinessProfile | null>({
    queryKey: [BUSINESS_PROFILES_KEY, "detail", businessUniqueId],
    queryFn: async () => {
      if (!businessUniqueId) {
        return null;
      }

      const response = await api.get<{ err: boolean; data: string; message?: string }>(
        `/profile/get-business-profile/?uniqueId=${businessUniqueId}`,
        "node"
      );

      if (!response.err && response.data) {
        const parsedProfile: BusinessProfile = JSON.parse(response.data);
        setProfileDataByUniqueID(parsedProfile);
        return parsedProfile;
      }

      setProfileDataByUniqueID(null);
      return null;
    },
    enabled: !!businessUniqueId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnReconnect: true, // Refetch when network reconnects
    structuralSharing: true, // Prevent unnecessary re-renders when data hasn't changed
  });

  return {
    profileData,
    profileDataLoading,
    refetchProfile: refetch,
  };
}

const websiteKey = (url: string | null | undefined) =>
  normalizeDomainForFavicon(cleanWebsiteUrl(url || "")).toLowerCase();

/**
 * Best-effort read of the created record from the create response.
 *
 * The Node endpoint isn't contractually required to return it, so this probes
 * the shapes it may use and returns null otherwise. Callers must still validate
 * whatever comes back — this is a shortcut, not a source of trust.
 */
function extractCreatedBusinessFromResponse(
  response: any
): Partial<BusinessProfile> | null {
  const seen = new Set<any>();

  const normalize = (node: any): Partial<BusinessProfile> | null => {
    if (!node || typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);

    if (Array.isArray(node)) {
      // Only usable when the response describes exactly one created business.
      const records = node
        .map((item) => normalize(item))
        .filter((item): item is Partial<BusinessProfile> => item != null);
      return records.length === 1 ? (records[0] ?? null) : null;
    }

    const id = String(node.UniqueId ?? node.uniqueId ?? "").trim();
    if (id) {
      return {
        ...node,
        UniqueId: id,
        Website: node.Website ?? node.website,
        IsPitch: node.IsPitch ?? node.isPitch,
        LinkedAuthId: node.LinkedAuthId ?? node.linkedAuthId,
      } as Partial<BusinessProfile>;
    }

    for (const key of ["data", "businesses", "business", "created", "result"]) {
      const child = node[key];
      const parsed =
        typeof child === "string"
          ? (() => {
              try {
                return JSON.parse(child);
              } catch {
                return null;
              }
            })()
          : child;
      const found = normalize(parsed);
      if (found) return found;
    }

    return null;
  };

  return normalize(response);
}

/**
 * What a business record must look like for us to accept it as "the one we just
 * created". Every check is a *positive contradiction* check: unknown/absent
 * fields never block, so an unexpected backend shape can't lock users out.
 */
export interface CreatedBusinessExpectation {
  expectedWebsite?: string | null;
  expectedIsPitch?: boolean;
  /** Ids that already existed before the create call. */
  preExistingIds?: Set<string> | null;
}

/**
 * Returns a reason string when `candidate` cannot be the business we just
 * created, or null when it passes every check.
 *
 * This is the invariant that prevents the "wires crossed" class of bug: a
 * business that already existed, that belongs to another domain, or that already
 * has analytics linked, can never be adopted as a freshly created record.
 */
export function describeCreatedBusinessMismatch(
  candidate: Partial<BusinessProfile> | null | undefined,
  expectation: CreatedBusinessExpectation
): string | null {
  const id = String(candidate?.UniqueId || "").trim();
  if (!candidate || !id) return "no business id";

  if (expectation.preExistingIds?.has(id)) {
    return "business already existed before this create";
  }

  // A business created seconds ago cannot already have Search Console / GA linked.
  // wbu.edu-style records are rejected here even if every other check passed.
  if (String((candidate as any).LinkedAuthId || "").trim()) {
    return "business already has analytics linked";
  }

  const expectedDomain = websiteKey(expectation.expectedWebsite);
  const candidateDomain = websiteKey(candidate.Website);
  if (expectedDomain && candidateDomain && expectedDomain !== candidateDomain) {
    return `business belongs to ${candidateDomain}, not ${expectedDomain}`;
  }

  if (typeof expectation.expectedIsPitch === "boolean") {
    const candidateIsPitch = (candidate as any).IsPitch;
    if (
      typeof candidateIsPitch === "boolean" &&
      candidateIsPitch !== expectation.expectedIsPitch
    ) {
      return expectation.expectedIsPitch
        ? "target is a live business, not a pitch"
        : "target is a pitch, not a live business";
    }
  }

  return null;
}

/**
 * Last line of defence before a create flow writes into a business.
 *
 * Re-reads the target from the server and refuses the write if it isn't the
 * record we believe we created. Cheap (one GET) and only used where a wrong id
 * would silently destroy an existing profile.
 */
export async function assertSafeCreatedBusinessTarget(
  businessUniqueId: string,
  expectation: CreatedBusinessExpectation
): Promise<void> {
  const id = String(businessUniqueId || "").trim();
  if (!id) {
    throw new Error("Missing business id");
  }

  const response = await api.get<{ err: boolean; data: string; message?: string }>(
    `/profile/get-business-profile/?uniqueId=${id}`,
    "node"
  );

  if (response.err === true || !response.data) {
    throw new Error(response.message || "Couldn't verify the business before saving");
  }

  let profile: BusinessProfile;
  try {
    profile = JSON.parse(response.data);
  } catch {
    throw new Error("Couldn't verify the business before saving");
  }

  const profileId = String(profile?.UniqueId || "").trim();
  if (profileId && profileId !== id) {
    throw new Error("Refusing to save: the server returned a different business");
  }

  const mismatch = describeCreatedBusinessMismatch(
    { ...profile, UniqueId: profileId || id },
    expectation
  );
  if (mismatch) {
    throw new Error(`Refusing to save into an unrelated business (${mismatch})`);
  }
}

/**
 * Verified `POST /profile/update-business-profile` for create flows.
 * Never call the raw endpoint with an id derived from a create — use this.
 */
export async function updateCreatedBusinessProfileSafely(
  businessUniqueId: string,
  payload: Record<string, any>,
  expectation: CreatedBusinessExpectation
): Promise<void> {
  await assertSafeCreatedBusinessTarget(businessUniqueId, expectation);

  const response = await api.post<{ err?: boolean; status?: number; message?: string }>(
    "/profile/update-business-profile",
    "node",
    { ...payload, UniqueId: businessUniqueId }
  );

  const hasError =
    response?.err === true ||
    (response?.status !== undefined && response.status !== 200);

  if (hasError) {
    throw new Error(response?.message || "Failed to update business profile");
  }
}

interface CreateBusinessPayload {
  website: string;
  businessName: string;
  primaryLocation: string; // Format: "Location,Country" or just "Location"
  serveCustomers: "local" | "online" | "both";
  offerType: "products" | "services" | "both";
  isPitch?: boolean; // Set to true when created from /create-pitch
  locationOptions?: LocationOption[];
}

interface CreateBusinessResponse {
  status: number;
  data?: any;
  err?: boolean;
  message?: string;
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;

  return useMutation<
    { formData: CreateBusinessPayload; createdBusiness: BusinessProfile | null },
    Error,
    CreateBusinessPayload
  >({
    mutationFn: async (formData: CreateBusinessPayload) => {
      if (!userUniqueId) {
        throw new Error("User not authenticated");
      }

      // Capture the pre-create state so we can deterministically locate the newly created profile.
      // Matching by website (or "last item") is unsafe and can overwrite an unrelated business.
      //
      // This runs BEFORE the create call and is strict on purpose: if we can't
      // read the current businesses we must not create anything, because we'd
      // have no reliable way to tell the new record apart from existing ones.
      let beforeAll: BusinessProfile[];
      let beforePitch: BusinessProfile[] | null = null;
      try {
        beforeAll = await fetchBusinessProfiles(userUniqueId, undefined, { strict: true });
        if (formData.isPitch === true) {
          beforePitch = await fetchBusinessProfiles(userUniqueId, true, { strict: true });
        }
      } catch {
        throw new Error(
          "Couldn't load your existing businesses, so creation was cancelled. Please retry."
        );
      }

      const toIdSet = (profiles: BusinessProfile[]) =>
        new Set(
          profiles
            .map((p) => String(p?.UniqueId || "").trim())
            .filter(Boolean)
        );

      const beforeAllIds = toIdSet(beforeAll);
      const beforePitchIds = beforePitch ? toIdSet(beforePitch) : null;

      // Union of everything known to exist beforehand, used by the identity guard.
      const preExistingIds = new Set<string>([
        ...beforeAllIds,
        ...(beforePitchIds ? Array.from(beforePitchIds) : []),
      ]);

      const locationOptions =
        formData.locationOptions ??
        useBusinessStore.getState().profileForm.locationOptions;

      const { Location: location, Country: country } = parsePrimaryLocationForPayload(
        formData.primaryLocation,
        locationOptions
      );

      // Map form data to API payload structure
      const payload = {
        userUniqueId,
        accountUniqueId: null,
        businesses: [
          {
            name: formData.businessName,
            description: "",
            website: formData.website,
            displayName: formData.businessName,
            locationType: formData.offerType, // products/services
            propertyId: "",
            category: "",
            brandVoice: "",
            businessModel: "",
            productsServices: [],
            locations: null,
            customerPersonas: null,
            sellingPoints: null,
            businessObjective: formData.serveCustomers, // local/online
            competitors: null,
            uniqueId: "",
            isPitch: formData.isPitch === true ? true : false, // Set IsPitch flag based on payload
            primaryLocation: {
              Location: location,
              Country: country,
            },
            userUniqueId,
          },
        ],
      };

      let response: any;
      try {
        response = await api.post<any>(
          "/profile/create-agency-businesses",
          "node",
          payload
        );

        // Check if the API returned an error in the response body
        if (response.err === true || response.success === false) {
          throw new Error(response.message || "Failed to create business");
        }
      } catch (error: any) {
        // If axios error with response (status code error like 409)
        if (error.response?.data) {
          const errorData = error.response.data;
          throw new Error(errorData.message || errorData.error || "Failed to create business");
        }
        throw error;
      }

      // Invalidate and refetch business profiles to get the newly created one
      await queryClient.invalidateQueries({
        queryKey: [BUSINESS_PROFILES_KEY, userUniqueId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["pitchBusinesses", userUniqueId],
      });

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      const websiteInput = websiteKey(formData.website);

      const expectation: CreatedBusinessExpectation = {
        expectedWebsite: formData.website,
        expectedIsPitch: formData.isPitch === true,
        preExistingIds,
      };

      // Any candidate, from any source, must clear the same guard.
      const acceptCandidate = (
        candidate: Partial<BusinessProfile> | null | undefined
      ): BusinessProfile | null =>
        describeCreatedBusinessMismatch(candidate, expectation) === null
          ? (candidate as BusinessProfile)
          : null;

      // Best case: the server tells us what it created. Still guarded, never trusted blindly.
      const createdFromResponse = acceptCandidate(
        extractCreatedBusinessFromResponse(response)
      );

      // Refetch with retry: the create endpoint can be eventually consistent with list endpoints.
      let updatedProfiles: BusinessProfile[] = [];
      for (let attempt = 0; attempt < 4; attempt++) {
        updatedProfiles = await fetchBusinessProfiles(userUniqueId);
        const hasNew = updatedProfiles.some((p) => {
          const id = String(p?.UniqueId || "").trim();
          return Boolean(id) && !beforeAllIds.has(id);
        });
        if (hasNew) break;
        if (attempt < 3) await sleep(250 * (attempt + 1));
      }

      let updatedPitchProfiles: BusinessProfile[] | null = null;
      if (formData.isPitch === true) {
        updatedPitchProfiles = [];
        for (let attempt = 0; attempt < 4; attempt++) {
          updatedPitchProfiles = await fetchBusinessProfiles(userUniqueId, true);
          const beforeIds = beforePitchIds ?? new Set<string>();
          const hasNew = updatedPitchProfiles.some((p) => {
            const id = String(p?.UniqueId || "").trim();
            return Boolean(id) && !beforeIds.has(id);
          });
          if (hasNew) break;
          if (attempt < 3) await sleep(250 * (attempt + 1));
        }
      }

      // Update the store
      const { setBusinessProfiles } = useBusinessStore.getState();
      setBusinessProfiles(updatedProfiles);

      const pickCreatedFromLists = (
        after: BusinessProfile[] | null | undefined,
        beforeIds: Set<string> | null
      ): BusinessProfile | null => {
        if (!after || !Array.isArray(after) || after.length === 0) return null;
        if (!beforeIds) return null;

        const candidates = after.filter((p) => {
          const id = String(p?.UniqueId || "").trim();
          return Boolean(id) && !beforeIds.has(id);
        });

        if (candidates.length === 0) return null;
        if (candidates.length === 1) return acceptCandidate(candidates[0]);

        // If multiple new candidates exist, only proceed if we can uniquely disambiguate.
        if (!websiteInput) return null;

        const matches = candidates.filter((p) => websiteKey(p?.Website) === websiteInput);
        return matches.length === 1 ? acceptCandidate(matches[0]) : null;
      };

      // Prefer pitch-scoped diff when creating a pitch, then the all-business diff.
      const createdBusiness: BusinessProfile | null =
        createdFromResponse ??
        (formData.isPitch === true
          ? pickCreatedFromLists(updatedPitchProfiles, beforePitchIds)
          : null) ??
        pickCreatedFromLists(updatedProfiles, beforeAllIds);

      if (!createdBusiness?.UniqueId) {
        // Fail safe: returning the wrong business here can overwrite a real profile.
        throw new Error(
          "Business was created, but the app couldn't reliably identify it. Please refresh and open it from the list before editing."
        );
      }

      return { formData, createdBusiness };
    },
    onSuccess: () => {
      toast.success("Business is created");
    },
    onError: (error: Error) => {
      toast.error("Failed to create business", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

interface UpdateBusinessProfilePayload {
  [key: string]: any; // Flexible payload structure matching BusinessProfile
}

export function useUpdateBusinessProfile(businessUniqueId: string | null) {
  const queryClient = useQueryClient();
  const { setProfileDataByUniqueID } = useBusinessStore();

  return useMutation<
    BusinessProfile,
    Error,
    UpdateBusinessProfilePayload
  >({
    mutationFn: async (payload: UpdateBusinessProfilePayload) => {
      if (!businessUniqueId) {
        throw new Error("Business ID is required");
      }

      // Ensure uniqueId is in the payload
      const payloadWithId = {
        ...payload,
        UniqueId: businessUniqueId,
      };

      const response = await api.post<{
        status?: number;
        err?: boolean;
        data?: string;
        message?: string;
        response?: {
          data?: {
            message?: string;
          };
        };
      }>(
        `/profile/update-business-profile`,
        "node",
        payloadWithId
      );

      // Check for errors - API might return status 200 with err: true, or status !== 200
      const hasError = response.err === true ||
        (response.status !== undefined && response.status !== 200);

      if (hasError) {
        const errorMessage =
          response.message ||
          response.response?.data?.message ||
          "Failed to update business profile";
        throw new Error(errorMessage);
      }

      const updatedProfile = payloadWithId as BusinessProfile;

      // Optimistic update: Update React Query cache immediately
      queryClient.setQueryData<BusinessProfile>(
        [BUSINESS_PROFILES_KEY, "detail", businessUniqueId],
        updatedProfile
      );

      // Update the store with the payload data immediately
      setProfileDataByUniqueID(updatedProfile);

      // Update the profile in the list cache if it exists
      const { user } = useAuthStore.getState();
      const userUniqueId = user?.uniqueId || user?.UniqueId || user?.id;
      if (userUniqueId) {
        queryClient.setQueryData<BusinessProfile[]>(
          [BUSINESS_PROFILES_KEY, userUniqueId],
          (oldProfiles) => {
            if (!oldProfiles) return oldProfiles;
            return oldProfiles.map((profile) =>
              profile.UniqueId === businessUniqueId ? updatedProfile : profile
            );
          }
        );
      }

      // Invalidate queries in the background to sync with server (non-blocking)
      queryClient.invalidateQueries({
        queryKey: [BUSINESS_PROFILES_KEY, "detail", businessUniqueId],
        refetchType: "none", // Don't refetch immediately, just mark as stale
      });

      if (userUniqueId) {
        queryClient.invalidateQueries({
          queryKey: [BUSINESS_PROFILES_KEY, userUniqueId],
          refetchType: "none", // Don't refetch immediately, just mark as stale
        });
      }

      // Return the updated profile (optimistic update)
      return updatedProfile;
    },
    onSuccess: () => {
      toast.success("Business profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update business profile", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

