export interface ExistingBusinessSummary {
  UniqueId: string;
  Name: string | null;
  Website: string | null;
  IsPitch: boolean;
  IsActive: boolean;
  LinkedAuthId: string | null;
}

export interface ExistingBusinessConflict {
  code: "BUSINESS_ALREADY_EXISTS";
  existingBusiness: ExistingBusinessSummary;
  incomingBusiness?: {
    website?: string | null;
    authId?: string | null;
  };
}

export class CreateBusinessConflictError extends Error {
  readonly code = "BUSINESS_ALREADY_EXISTS" as const;
  readonly status = 409;
  readonly conflict: ExistingBusinessConflict;

  constructor(conflict: ExistingBusinessConflict, message?: string) {
    super(message || "Business already exists");
    this.name = "CreateBusinessConflictError";
    this.conflict = conflict;
  }
}

export function parseCreateBusinessConflict(
  payload: unknown
): CreateBusinessConflictError | null {
  if (!payload || typeof payload !== "object") return null;

  const response = payload as Record<string, any>;
  if (response.code !== "BUSINESS_ALREADY_EXISTS") return null;

  const existing = response.existingBusiness;
  const uniqueId = String(existing?.UniqueId || "").trim();
  if (!uniqueId) return null;

  return new CreateBusinessConflictError(
    {
      code: "BUSINESS_ALREADY_EXISTS",
      existingBusiness: {
        UniqueId: uniqueId,
        Name: existing?.Name ? String(existing.Name) : null,
        Website: existing?.Website ? String(existing.Website) : null,
        IsPitch: existing?.IsPitch === true,
        IsActive: existing?.IsActive !== false,
        LinkedAuthId: existing?.LinkedAuthId
          ? String(existing.LinkedAuthId)
          : null,
      },
      incomingBusiness:
        response.incomingBusiness &&
        typeof response.incomingBusiness === "object"
          ? {
              website: response.incomingBusiness.website
                ? String(response.incomingBusiness.website)
                : null,
              authId: response.incomingBusiness.authId
                ? String(response.incomingBusiness.authId)
                : null,
            }
          : undefined,
    },
    typeof response.message === "string" ? response.message : undefined
  );
}
