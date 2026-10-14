export type ServiceAreaType =
  | "international"
  | "national"
  | "state_regional"
  | "city_local";

export type ProfileStatus = "processing" | "success" | "abandoned" | "error";

export type OrchestrationStatus =
  | "build_running"
  | "strategies_running"
  | "completed"
  | "error";

export type OfferingExtractionStatus =
  | "processing"
  | "success"
  | "error"
  | null;

export interface JobOffering {
  name: string;
  description?: string;
  category?: string;
  existing_urls?: string[];
}

export interface JobCta {
  text: string;
  url: string;
}

export interface JobServiceArea {
  name: string;
  kind: "city" | "state" | "region" | "colloquial" | "island";
  rank: number;
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
  hours?: Array<{ dayOfWeek: string; opens: string; closes: string }>;
  map_url?: string;
  primary?: boolean;
}

export interface JobKeyPerson {
  name: string;
  role?: string;
  title?: string;
}

export interface JobWriteFields {
  business_name?: string | null;
  location?: string | null;
  country?: string | null;
  business_url?: string | null;
  ctas?: JobCta[] | null;
  differentiators?: string[] | null;
  web_brand_voice?: string[] | null;
  social_brand_voice?: string[] | null;
  user_defined_business_description?: string | null;
  recurring_flag?: string | null;
  brand_terms?: string[] | null;
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
  licenses?: string[] | null;
  awards?: string[] | null;
  key_people?: JobKeyPerson[] | null;
}

export interface CreateJobRequest extends JobWriteFields {
  business_id: string;
}

export type UpdateJobRequest = JobWriteFields;

export interface WorkflowStatus {
  status?: "pending" | "processing" | "success" | "error" | null;
  workflows?: Record<string, string | null>;
  [key: string]: unknown;
}

export interface JobResponse extends Omit<JobWriteFields, "service_areas"> {
  job_id: string;
  business_id: string;
  created_at: string;
  profile_id?: string | null;
  profile_status?: ProfileStatus | null;
  orchestration_status?: OrchestrationStatus | null;
  has_build_completed?: boolean;
  document_synced?: boolean;
  offering_extraction?: OfferingExtractionStatus;
  key_people?: JobKeyPerson[] | null;
  service_areas?: Array<JobServiceArea | string> | null;
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

export interface ProfileResponse {
  profile_id: string;
  status: ProfileStatus;
  mode: "build" | "update" | "manual" | "restore";
  data: JobWriteFields & { business_model?: string | null };
  document?: string | null;
  document_synced: boolean;
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
