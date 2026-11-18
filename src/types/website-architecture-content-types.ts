export type ArchitectureRequestStatus = "processing" | "success" | "error";

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
  config?: Record<string, string | number | boolean> | null;
  fields: ArchitectureSectionFields;
  source_section_refs?: string[];
}

export interface ArchitectureContentArtifact {
  schema_version: number;
  page_id: string;
  request_status: ArchitectureRequestStatus;
  action?: "CREATE" | "OPTIMIZE" | "CONSOLIDATE" | null;
  assembly?: {
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
