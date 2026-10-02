import { api } from "@/hooks/use-api";

export const MAX_AGENT_FILES = 5;
export const MAX_AGENT_FILE_BYTES = 10 * 1024 * 1024;
export const AGENT_FILE_TYPES: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export const AGENT_FILE_ACCEPT = Object.keys(AGENT_FILE_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");

export type AgentAttachment = {
  file_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  total_chars: number;
};
export type PendingAttachment = {
  id: string;
  file: File;
  status: "uploading" | "finalizing" | "ready" | "error";
  attachment?: AgentAttachment;
  error?: string;
};
export type UploadTicket = {
  file_id: string;
  upload_url: string;
  required_headers: Record<string, string>;
  expires_in: number;
};
export type SignedFile = { file_id: string; filename: string; url: string };

export function validateAgentFiles(files: File[], existingCount = 0): void {
  if (existingCount + files.length > MAX_AGENT_FILES)
    throw new Error("Attach up to 5 files per message.");
  for (const file of files) {
    if (!AGENT_FILE_TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""]) {
      throw new Error(`${file.name}: use TXT, MD, CSV, JSON, PDF, or DOCX.`);
    }
    if (file.size > MAX_AGENT_FILE_BYTES)
      throw new Error(`${file.name}: files must be 10 MB or smaller.`);
    if (!file.size) throw new Error(`${file.name}: this file is empty.`);
  }
}

export function uploadErrorMessage(error: unknown): string {
  const detail = (
    error as { response?: { data?: { detail?: unknown; message?: string } } }
  )?.response?.data;
  if (typeof detail?.detail === "string") return detail.detail;
  return (
    detail?.message ??
    (error instanceof Error
      ? error.message
      : "File upload failed. Please try again.")
  );
}

export function createAgentUpload(
  business: string,
  file: File,
  signal?: AbortSignal,
) {
  validateAgentFiles([file]);
  return api.post<UploadTicket>(
    "/agent/uploads",
    "python",
    {
      filename: file.name,
      content_type: AGENT_FILE_TYPES[file.name.split(".").pop()!.toLowerCase()],
      size_bytes: file.size,
    },
    { params: { business_id: business }, signal },
  );
}

export async function putAgentUpload(
  ticket: UploadTicket,
  file: File,
  signal?: AbortSignal,
) {
  // Content-Length is browser-controlled. A File body sends the exact original bytes.
  const headers = Object.fromEntries(
    Object.entries(ticket.required_headers).filter(
      ([key]) => key.toLowerCase() !== "content-length",
    ),
  );
  const response = await fetch(ticket.upload_url, {
    method: "PUT",
    headers,
    body: file,
    signal,
    credentials: "omit",
  });
  if (!response.ok)
    throw new Error(
      `Could not upload ${file.name} (${response.status}). Please try again.`,
    );
}

export function finalizeAgentUpload(
  business: string,
  fileId: string,
  signal?: AbortSignal,
) {
  return api.post<AgentAttachment>(
    `/agent/uploads/${encodeURIComponent(fileId)}/finalize`,
    "python",
    {},
    { params: { business_id: business }, signal },
  );
}

export async function uploadAgentFile(
  business: string,
  file: File,
  signal?: AbortSignal,
  onFinalizing?: () => void,
): Promise<AgentAttachment> {
  const ticket = await createAgentUpload(business, file, signal);
  await putAgentUpload(ticket, file, signal);
  onFinalizing?.();
  const finalized = await finalizeAgentUpload(business, ticket.file_id, signal);
  return { ...finalized, file_id: ticket.file_id };
}

export async function getAgentFileUrls(
  business: string,
  fileIds: string[],
  signal?: AbortSignal,
): Promise<SignedFile[]> {
  const response = await api.post<{ files: SignedFile[] }>(
    "/agent/uploads/presigned-urls",
    "python",
    {
      file_ids: [...new Set(fileIds)],
    },
    { params: { business_id: business }, signal },
  );
  return response.files;
}

export function attachmentsReady(files: PendingAttachment[]): boolean {
  return files.every((file) => file.status === "ready" && !!file.attachment);
}

export async function loadAgentFilePreview(
  file: AgentAttachment,
  url: string,
  signal?: AbortSignal,
): Promise<{ text?: string; blob?: Blob }> {
  if (file.content_type === AGENT_FILE_TYPES.docx) return {};
  const response = await fetch(url, { signal, credentials: "omit" });
  if (!response.ok)
    throw new Error("Preview unavailable. You can open or download this file.");
  if (file.content_type === AGENT_FILE_TYPES.pdf)
    return {
      blob: new Blob([await response.arrayBuffer()], {
        type: AGENT_FILE_TYPES.pdf,
      }),
    };
  return { text: (await response.text()).slice(0, 320_000) };
}
