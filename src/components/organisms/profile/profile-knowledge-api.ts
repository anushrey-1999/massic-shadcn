import { AGENT_FILE_TYPES, putAgentUpload } from "@/components/massic-agent/agent-uploads";
import { api, getBaseURLByPlatform } from "@/hooks/use-api";
import { apiErrorMessage } from "@/lib/api-error";

export type KnowledgeFileKind = "file" | "internal_file";
export type KnowledgeStatus = "queued" | "processing" | "ready" | "failed" | "deleting";

export type KnowledgeFile = {
  id: string;
  kind: KnowledgeFileKind;
  status: KnowledgeStatus;
  error: string | null;
  searchable: boolean;
  created_at: string;
  filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  format_id: string | null;
  parsed_at: string | null;
};

type KnowledgeLimits = {
  kinds: Array<{ kind: KnowledgeFileKind | "page"; max: number; uploadable: boolean }>;
  max_upload_bytes: number;
  file_types: string[];
};

type KnowledgeList = { sources: KnowledgeFile[]; limits: KnowledgeLimits };
type KnowledgeListPage = {
  sources: Array<KnowledgeFile | { kind: "page" }>;
  limits: KnowledgeLimits;
  total_pages: number;
};
type KnowledgeUploadTicket = {
  source_id: string;
  upload_url: string;
  required_headers: Record<string, string>;
};

const PATH = "/agent/knowledge";

function requestOptions(businessId: string, signal?: AbortSignal) {
  return {
    // Some environments still configure the legacy Python API version.
    baseURL: getBaseURLByPlatform("python").replace(/\/v\d+\/?$/, "/v2"),
    params: { business_id: businessId },
    signal,
  };
}

export async function listKnowledge(businessId: string, signal: AbortSignal): Promise<KnowledgeList> {
  const options = requestOptions(businessId, signal);
  const getPage = (page: number) =>
    api.get<KnowledgeListPage>(PATH, "python", {
      ...options,
      params: { ...options.params, page, page_size: 100 },
    });
  const sources = new Map<string, KnowledgeFile>();
  let page = 1;
  let result: KnowledgeListPage;
  do {
    result = await getPage(page);
    for (const source of result.sources) {
      if (source.kind !== "page") sources.set(source.id, source);
    }
    page++;
  } while (page <= result.total_pages);
  return { sources: Array.from(sources.values()), limits: result.limits };
}

export async function uploadKnowledgeFile(
  businessId: string,
  kind: KnowledgeFileKind,
  file: File,
  onFinalizing: () => void,
  signal: AbortSignal,
) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const options = requestOptions(businessId, signal);
  const ticket = await api.post<KnowledgeUploadTicket>(
    `${PATH}/files`,
    "python",
    {
      filename: file.name,
      content_type: AGENT_FILE_TYPES[extension],
      size_bytes: file.size,
      kind,
    },
    options,
  );
  await putAgentUpload(ticket, file, signal);
  onFinalizing();
  return api.post<KnowledgeFile>(
    `${PATH}/files/${encodeURIComponent(ticket.source_id)}/finalize`,
    "python",
    undefined,
    options,
  );
}

export function updateKnowledgeSearchable(businessId: string, id: string, searchable: boolean) {
  return api.patch<KnowledgeFile>(
    `${PATH}/${encodeURIComponent(id)}`,
    "python",
    { searchable },
    requestOptions(businessId),
  );
}

export function deleteKnowledgeFile(businessId: string, id: string) {
  return api.delete<KnowledgeFile>(
    `${PATH}/${encodeURIComponent(id)}`,
    "python",
    requestOptions(businessId),
  );
}

const KNOWLEDGE_ERRORS: Record<string, string> = {
  gone: "The source is no longer available.",
  too_large: "The source is too large to process.",
  no_text: "No readable text was found.",
  unreadable: "This source could not be read.",
  embed_failed: "The source could not be indexed for search.",
  "too big": "This file exceeds the upload size limit.",
  "too much text": "The file exceeds the limit of 2,600,000 extracted characters.",
  "size does not match": "The uploaded file size did not match. Choose the file again.",
  "missing file": "The upload could not be found. Choose the file again.",
  "no text": "No readable text was found.",
};

export function knowledgeErrorMessage(error: unknown, fallback: string) {
  const message = apiErrorMessage(error, fallback);
  return KNOWLEDGE_ERRORS[message] ?? message;
}

export function knowledgeSourceError(error: string) {
  return KNOWLEDGE_ERRORS[error] ?? error;
}
