import { AGENT_FILE_TYPES, putAgentUpload, type SignedFile } from "@/components/massic-agent/agent-uploads";
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
  let fallback = "Couldn't start the upload. Try again.";
  try {
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
    fallback = "Couldn't transfer the file. Try uploading it again.";
    await putAgentUpload(ticket, file, signal);
    onFinalizing();
    fallback = "The file uploaded, but we couldn't finish processing it. If it doesn't appear in the list, try uploading a freshly saved copy.";
    return await api.post<KnowledgeFile>(
      `${PATH}/files/${encodeURIComponent(ticket.source_id)}/finalize`,
      "python",
      undefined,
      options,
    );
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(knowledgeErrorMessage(error, fallback), { cause: error });
  }
}

export async function getKnowledgeFileUrls(businessId: string, fileIds: string[], signal?: AbortSignal) {
  const response = await api.post<{ files: SignedFile[] }>(
    `${PATH}/files/presigned-urls`,
    "python",
    { file_ids: fileIds },
    requestOptions(businessId, signal),
  );
  return response.files;
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
  no_text: "No readable text was found. Upload a file with selectable text.",
  unreadable: "This file couldn't be read. Save a new copy and upload it again.",
  embed_failed: "The source could not be indexed for search.",
  "too big": "This file is too large to process. Upload a smaller copy.",
  "too much text": "The file exceeds the limit of 2,600,000 extracted characters.",
  "size does not match": "The uploaded file size did not match. Choose the file again.",
  "missing file": "The upload could not be found. Choose the file again.",
  "no text": "No readable text was found. Upload a file with selectable text.",
};

export function knowledgeErrorMessage(error: unknown, fallback: string) {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  // Unhandled server failures may reach the browser without a readable response.
  if (!status || status >= 500) return fallback;
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 403) return "You don't have access to manage files for this business.";
  if (status === 413) return KNOWLEDGE_ERRORS["too big"];
  if (status === 429) return "Too many requests. Wait a moment and try again.";
  const message = apiErrorMessage(error, fallback);
  return KNOWLEDGE_ERRORS[message] ?? message;
}

export function knowledgeSourceError(error: string) {
  return KNOWLEDGE_ERRORS[error] ?? error;
}
