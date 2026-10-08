export type ServiceAreaType =
  | "international"
  | "national"
  | "state_regional"
  | "city_local";

export type ProfileStatus =
  | "processing"
  | "complete"
  | "needs_verification"
  | "error";

export type OrchestrationStatus =
  | "deep_running"
  | "strategies_running"
  | "completed"
  | "error";

export type ProvenanceStatus =
  | "confirmed"
  | "strongly_supported"
  | "likely"
  | "needs_verification";

export interface SourcedItem {
  status?: ProvenanceStatus;
  source_refs?: string[];
}

export interface JobOffering extends SourcedItem {
  name: string;
  description?: string;
  category?: string;
  existing_urls?: string[];
}

export interface JobDifferentiator extends SourcedItem {
  differentiator: string;
  why_it_matters?: string;
  proof?: unknown[];
}

export interface JobBrandTerm extends SourcedItem {
  term: string;
}

export interface JobValueItem extends SourcedItem {
  value: string;
}

export interface JobCta {
  text: string;
  url: string;
}

export interface JobServiceArea {
  name: string;
  kind: "city" | "state" | "region" | "colloquial" | "island";
  rank?: number;
}

export interface JobLocation {
  name: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  hours?: Array<Record<string, unknown>>;
  map_url?: string;
  primary?: boolean;
}

export interface JobKeyPerson extends SourcedItem {
  name: string;
  role?: string;
  bio?: string;
}

export interface JobKeyPersonWrite extends SourcedItem {
  name: string;
  role?: string;
}

export interface JobImageAsset {
  url: string;
  alt?: string;
}

export interface JobBrandAssets {
  stylesheets?: string[];
  image_library?: JobImageAsset[];
  [key: string]: unknown;
}

export interface JobWriteFields {
  business_name?: string | null;
  location?: string | null;
  country?: string | null;
  business_url?: string | null;
  ctas?: JobCta[] | null;
  differentiators?: JobDifferentiator[] | null;
  web_brand_voice?: string[] | null;
  social_brand_voice?: string[] | null;
  user_defined_business_description?: string | null;
  recurring_flag?: string | null;
  brand_terms?: JobBrandTerm[] | null;
  aov?: number | null;
  ltv?: string | null;
  customer_types?: string[] | null;
  competitors?: string[] | null;
  service_area_type?: ServiceAreaType | null;
  service_areas?: JobServiceArea[] | null;
  locations?: JobLocation[] | null;
  primary_category?: string | null;
  secondary_category?: string | null;
  categories_tagged?: string[] | null;
  offerings?: JobOffering[] | null;
  year_founded?: number | null;
  logo_url?: string | null;
  support_email?: string | null;
  comms_email?: string | null;
  primary_phone?: string | null;
  additional_phones?: string[] | null;
  social_profiles?: string[] | null;
  directory_profiles?: string[] | null;
  licenses?: JobValueItem[] | null;
  awards?: JobValueItem[] | null;
  key_people?: JobKeyPersonWrite[] | null;
  brand_assets?: JobBrandAssets | null;
}

export interface CreateJobRequest extends JobWriteFields {
  business_id: string;
  profile_id?: string;
}

export type UpdateJobRequest = JobWriteFields;

export interface WorkflowStatus {
  status?: "pending" | "processing" | "success" | "error" | null;
  workflows?: Record<string, string | null>;
  [key: string]: unknown;
}

export interface JobResponse extends JobWriteFields {
  job_id: string;
  business_id: string;
  created_at: string;
  updated_at?: string | null;
  profile_id?: string | null;
  profile_status?: ProfileStatus | null;
  orchestration_status?: OrchestrationStatus | null;
  key_people?: JobKeyPerson[] | null;
  serve?: "local" | "online" | "both" | null;
  sell?: "products" | "services" | "both" | null;
  segment?: number | null;
  business_description?: string | null;
  business_detailed_description?: string | null;
  naics_embedded_text?: string | null;
  vector_store_metadata?: Record<string, unknown> | null;
  workflow_status?: WorkflowStatus;
  tech_audit_task_id?: string | null;
  [key: string]: unknown;
}

export interface ProfileReadOnlyDetails {
  market: JobResponse["serve"];
  sellType: JobResponse["sell"];
  segment: number | null;
  generatedDescription: string;
  generatedDetailedDescription: string;
  naicsContext: string;
}

export interface IndustriesResponse {
  industries: string[];
}

export interface SpecialtiesResponse {
  industry?: string | null;
  specialties: string[];
}

export interface RequiredJobFieldState {
  businessName: boolean;
  website: boolean;
  offerings: boolean;
  country: boolean;
  location: boolean;
  serviceAreaType: boolean;
}

