export type Product = "ga4" | "gbp" | "gtm" | "gsc";

export type RequestStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "partially_completed"
  | "expired"
  | "failed";

export type StepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "manual_required";

export interface AccessRequestStep {
  id: string;
  requestId: string;
  product: Product;
  status: StepStatus;
  selectedAssets: Record<string, unknown>[] | null;
  discoveredAssets: Record<string, unknown>[] | null;
  error: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessRequestShare {
  id: string;
  requestId: string;
  email: string;
  status: "pending" | "sent" | "opened" | "failed" | string;
  sendCount: number;
  lastSentAt: string | null;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessRequest {
  id: string;
  token: string;
  agencyId: string;
  agencyEmail: string;
  websiteUrl?: string | null;
  products: Product[];
  roles: Partial<Record<Product, string>>;
  status: RequestStatus;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  steps: AccessRequestStep[];
  requestUrl?: string;
  aggregate?: Partial<Record<Product, AccessProductAggregate>>;
 contributors?: AccessContributor[];
 accessEvents?: AccessEvent[];
 shares?: AccessRequestShare[];
}

export interface AccessRequestListResponse {
  requests: AccessRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AccessRequestStatusResponse {
  request: {
    id: string;
    agencyName?: string;
    agencyEmail: string;
    products: Product[];
    status: RequestStatus;
    expiresAt: string;
  };
  requestStatus: RequestStatus;
  summary: {
    completed: number;
    failed: number;
    pending: number;
    manualRequired: number;
    inProgress: number;
    total: number;
  };
  steps: AccessRequestStep[];
}

export interface AccessRequestStepsResponse {
  request: {
    id: string;
    agencyName?: string;
    agencyEmail: string;
    status: RequestStatus;
    expiresAt: string;
  };
  steps: AccessRequestStep[];
}

export interface DiscoverAssetsResponse {
  product: Product;
  assets: Record<string, unknown> | Record<string, unknown>[];
}

export interface VerifyStepResponse {
  verified: boolean;
  step: AccessRequestStep;
  message?: string;
}

export interface CreateAccessRequestPayload {
  agencyEmail: string;
  websiteUrl: string;
  products: Product[];
  roles: Partial<Record<Product, string>>;
  expiresInDays?: number;
}

export type AccessCheckStatus =
  | "connected"
  | "can_grant"
  | "partial_access"
  | "viewer_only"
  | "wrong_property"
  | "no_access_found"
  | "manual_required"
  | "multiple_possible_matches"
  | "manual_review"
  | "manual_match_selected"
  | "pending_acceptance"
  | "pending"
  | "failed";

export interface AccessCheck {
  id: string;
  requestId: string;
  contributorId: string;
  systemType: Product;
  status: AccessCheckStatus;
  matchedResourceId: string | null;
  matchedResourceName: string | null;
  matchedResourceUrl: string | null;
  permissionLevel: string | null;
  canGrantAccess: boolean;
  confidenceScore: string | number | null;
  matchType: string | null;
  discoveredAssets: Record<string, unknown> | null;
  selectedAssets: Record<string, unknown>[] | null;
  message: string | null;
  errorCode: string | null;
  errorMessageInternal: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessGrant {
  id: string;
  requestId: string;
  contributorId: string;
  systemType: Product;
  resourceId: string | null;
  resourceName: string | null;
  grantStatus: string;
  grantedToEmailOrAccount: string | null;
  selectedAssets: Record<string, unknown>[] | null;
  grantedAt: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessContributor {
  id: string;
  name: string | null;
  email?: string | null;
  googleAccountEmail: string | null;
  status: string;
  firstClickedAt?: string | null;
  oauthCompletedAt?: string | null;
  lastSeenAt?: string | null;
  checks?: AccessCheck[];
  grants?: AccessGrant[];
}

export interface AccessEvent {
  id: string;
  requestId: string;
  contributorId: string | null;
  eventType: string;
  systemType: Product | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AccessProductAggregate {
  product: Product;
  status: AccessCheckStatus;
  contributorId: string | null;
  checkCount: number;
  grantCount: number;
}

export interface AccessRequestVisitResponse {
  sessionToken: string;
  aggregate: Partial<Record<Product, AccessProductAggregate>>;
}

export interface ContributorStatusResponse {
  request: {
    id: string;
    agencyName?: string;
    agencyEmail: string;
    products: Product[];
    status: RequestStatus;
    websiteUrl?: string | null;
    expiresAt: string;
  };
  contributor: {
    id: string;
    name: string | null;
    googleAccountEmail: string | null;
    status: string;
  } | null;
  checks: AccessCheck[];
  aggregate: Partial<Record<Product, AccessProductAggregate>>;
}
