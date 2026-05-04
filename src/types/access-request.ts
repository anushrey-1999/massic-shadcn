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

export interface AccessRequest {
  id: string;
  token: string;
  agencyId: string;
  agencyEmail: string;
  products: Product[];
  roles: Partial<Record<Product, string>>;
  status: RequestStatus;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  steps: AccessRequestStep[];
  requestUrl?: string;
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

export interface CreateAccessRequestPayload {
  agencyEmail: string;
  products: Product[];
  roles: Partial<Record<Product, string>>;
  expiresInDays?: number;
}
