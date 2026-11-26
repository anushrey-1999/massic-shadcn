export type ArchitectureRequestStatus = "processing" | "success" | "error";
export type ArchitectureContentMode = "auto" | "guided";
export type ArchitectureContentStage = "adhoc" | "brief" | "writing" | "composition";
export type ArchitectureCurrentStatus = "pending" | "processing" | "needs_answers" | "success" | "no_change" | "failed";

export interface ArchitectureQuestion {
  text: string;
  required: boolean;
}

export interface ArchitectureQuestionRound {
  stage: ArchitectureContentStage;
  context: string | null;
  asked_at: string;
  questions: ArchitectureQuestion[];
}

export interface ArchitectureAnsweredRound extends ArchitectureQuestionRound {
  answered_at: string;
  questions: (ArchitectureQuestion & { answer: string })[];
}

export type ArchitectureSectionField =
  | string
  | number
  | boolean
  | null
  | ArchitectureSectionField[]
  | ArchitectureSectionFields;

export interface ArchitectureSectionFields {
  [key: string]: ArchitectureSectionField;
}

export interface ArchitectureAssemblySection {
  instance_id: string;
  registry_id: string;
  entry_version?: string;
  config?: Record<string, string | number | boolean> | null;
  fields: ArchitectureSectionFields;
  source_section_refs?: string[];
}

export interface ArchitectureContentArtifact {
  schema_version: number;
  page_id: string;
  request_status: ArchitectureRequestStatus;
  action?: "CREATE" | "OPTIMIZE" | "CONSOLIDATE" | null;
  mode?: ArchitectureContentMode;
  origin?: "website_architecture" | "ad_hoc" | "published_page";
  request?: {
    request?: string | null;
    instructions?: string | null;
    from_page_id?: string | null;
  } | null;
  current?: {
    stage: ArchitectureContentStage;
    status: ArchitectureCurrentStatus;
    reasons?: { code: string }[] | null;
  };
  questions?: ArchitectureQuestionRound | null;
  answered?: ArchitectureAnsweredRound[] | null;
  resolved_page_id?: string | null;
  assembly?: {
    schema_version?: number;
    registry_version?: string;
    page?: { h1?: string | null };
    sections: ArchitectureAssemblySection[];
  } | null;
  package?: {
    page?: { h1?: string | null; title_tag?: string | null };
    draft?: string | null;
    sections?: ArchitecturePackageSection[] | null;
  } | null;
}

export interface ArchitecturePackageSection {
  id?: string;
  heading?: string | null;
  markdown?: string | null;
}

export interface ArchitectureContentPostResponse {
  page_id: string;
  artifact: ArchitectureContentArtifact;
}

export type ArchitectureContentTagStatus =
  | "new"
  | "updated"
  | "update_required"
  | "stale"
  | "pending"
  | "processing"
  | "success"
  | "error";

export interface ArchitectureContentTag {
  url: string;
  page_id: string | null;
  status: ArchitectureContentTagStatus | null;
  proposed: boolean;
}

