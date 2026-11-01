import type { JobWriteFields } from "@/types/profile-v2";
import { normalizeJobServiceAreas } from "@/utils/profile-service-areas";

// One contract in every environment. Undefined means preserve; null means clear.
export function serializeJobRequest<T extends JobWriteFields>(request: T): T {
  return {
    ...request,
    ...(request.service_areas != null && {
      service_areas: normalizeJobServiceAreas(
        request.service_areas,
        request.service_area_type,
      ),
    }),
  };
}
