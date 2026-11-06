"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  Download,
  FileText,
  Loader2,
  Paperclip,
  RotateCcw,
  X,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiErrorMessage } from "@/lib/api-error";
import {
  AGENT_FILE_ACCEPT,
  AGENT_FILE_TYPES,
  MAX_AGENT_FILES,
  getAgentFileUrls,
  loadAgentFilePreview,
  type AgentAttachment,
  type AgentPreviewFile,
  type PendingAttachment,
} from "./agent-uploads";
import styles from "./agent.module.css";

const AttachmentContext = createContext<
  ((file: AgentAttachment) => void) | null
>(null);

/** One preview surface per chat workspace, shared by draft and message chips. */
export function AgentAttachmentsProvider({
  business,
  children,
}: {
  business: string;
  children: ReactNode;
}) {
  const [file, setFile] = useState<AgentAttachment | null>(null);
  return (
    <AttachmentContext.Provider value={setFile}>
      {children}
      <AgentFilePreviewDialog
        business={business}
        file={file}
        onClose={() => setFile(null)}
      />
    </AttachmentContext.Provider>
  );
}

export function AgentFilePreviewDialog({
  business,
  file,
  getFileUrls = getAgentFileUrls,
  variant = "chat",
  onClose,
  onCloseAutoFocus,
}: {
  business: string;
  file: AgentPreviewFile | null;
  getFileUrls?: typeof getAgentFileUrls;
  variant?: "chat" | "knowledge";
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const [attempt, setAttempt] = useState(0);

  return (
    <Dialog
      open={!!file}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="flex h-[80dvh] min-h-0 flex-col overflow-hidden sm:max-w-3xl"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="shrink-0 pr-6 text-left">
          <DialogTitle className="break-all font-medium">{file?.filename}</DialogTitle>
          <DialogDescription>
            Attached file{file?.size_bytes != null && ` · ${formatFileSize(file.size_bytes)}`}
          </DialogDescription>
        </DialogHeader>
        {file && (
          <AgentFilePreview
            key={`${business}:${file.file_id}:${file.content_type}:${attempt}`}
            business={business}
            file={file}
            getFileUrls={getFileUrls}
            variant={variant}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AgentFilePreview({
  business,
  file,
  getFileUrls,
  variant,
  onRetry,
}: {
  business: string;
  file: AgentPreviewFile;
  getFileUrls: typeof getAgentFileUrls;
  variant: "chat" | "knowledge";
  onRetry: () => void;
}) {
  const { file_id: id, content_type: contentType } = file;
  const [url, setUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    blobUrl?: string;
    docxHtml?: string;
    text?: string;
    truncated?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let objectUrl: string | undefined;
    void (async () => {
      try {
        const urls = await getFileUrls(business, [id], signal);
        const signed = urls.find((item) => item.file_id === id);
        if (!signed) throw new Error("This file is unavailable.");
        if (signal.aborted) return;
        setUrl(signed.url);
        const { blob, docx, text, truncated } = await loadAgentFilePreview(
          contentType,
          signed.url,
          signal,
          variant === "knowledge",
        );
        if (signal.aborted) return;
        const docxHtml = docx ? await renderDocxPreview(docx, signal) : undefined;
        if (signal.aborted) return;
        if (blob) objectUrl = URL.createObjectURL(blob);
        setPreview({ blobUrl: objectUrl, docxHtml, text, truncated });
      } catch (error) {
        if (signal.aborted) return;
        const requestError = error as { response?: { status?: number }; code?: string } | null;
        const status = requestError?.response?.status;
        const fallback = "Couldn't load the file preview.";
        if (status === 404 || status === 422) {
          setError("This file is unavailable.");
        } else if (variant === "knowledge" && (
          (status != null && status >= 500) || requestError?.code === "ERR_NETWORK" ||
          requestError?.code === "ECONNABORTED" || error instanceof TypeError
        )) {
          setError(fallback);
        } else {
          setError(apiErrorMessage(error, fallback));
        }
      }
    })();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [business, id, contentType, getFileUrls, variant]);
  return (
    <>
      {!preview && !error ? (
        <p
          role="status"
          className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading file…
        </p>
      ) : preview?.blobUrl ? (
        <iframe
          title={`Preview ${file.filename}`}
          src={preview.blobUrl}
          className="min-h-0 w-full flex-1 rounded-md border"
        />
      ) : preview?.docxHtml ? (
        <iframe
          title={`Preview ${file.filename}`}
          sandbox=""
          srcDoc={preview.docxHtml}
          className="min-h-0 w-full flex-1 rounded-md border"
        />
      ) : preview?.text !== undefined ? (
        <AgentTextPreview file={file} text={preview.text} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
          <FileText className="size-8" aria-hidden="true" />
          <p role={error ? "alert" : undefined}>
            {error ?? "Download this file to view it."}
          </p>
          {error && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
      {url && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {preview?.truncated && (
            <p className="mr-auto text-xs text-muted-foreground">This preview shows the beginning of the file.</p>
          )}
          {variant === "knowledge" ? (
            <DownloadOriginalButton url={url} filename={file.filename} />
          ) : (
            <Button asChild variant="outline">
              <a href={url} target="_blank" rel="noreferrer">Open / download</a>
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function DownloadOriginalButton({ url, filename }: { url: string; filename: string }) {
  const [downloading, setDownloading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function download() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setDownloading(true);
    try {
      const response = await fetch(url, { credentials: "omit", signal: controller.signal });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      controller.signal.throwIfAborted();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      // Let the browser start reading the blob before revoking the URL.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    } catch {
      if (!controller.signal.aborted) toast.error("Couldn't download the file. Try again.");
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      title="Download"
      aria-label={downloading ? "Downloading file" : "Download"}
      disabled={downloading}
      onClick={() => void download()}
    >
      {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
    </Button>
  );
}

async function renderDocxPreview(blob: Blob, signal: AbortSignal) {
  const { renderAsync } = await import("docx-preview");
  signal.throwIfAborted();

  // Render into a detached document. Only the sandboxed frame receives its HTML.
  const preview = document.implementation.createHTMLDocument("Word document");
  const styles = preview.createElement("div");
  const policy = preview.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
  preview.head.prepend(policy);

  try {
    await renderAsync(blob, preview.body, styles, {
      ignoreWidth: true,
      renderAltChunks: false,
      useBase64URL: true,
    });
    if (!preview.body.querySelector("section.docx")) throw new Error();
  } catch {
    throw new Error("This Word file couldn't be previewed. You can download it.");
  }
  signal.throwIfAborted();

  // Prevent document links from navigating the frame. Escape CSS raw-text end tags.
  for (const link of preview.body.querySelectorAll("a")) {
    link.removeAttribute("href");
    link.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
  }
  for (const style of styles.querySelectorAll("style")) {
    style.textContent = style.textContent?.replaceAll("<", "\\3c ") ?? "";
    preview.head.append(style);
  }
  return `<!doctype html>${preview.documentElement.outerHTML}`;
}

export function AgentTextPreview({
  file,
  text,
}: {
  file: AgentPreviewFile;
  text: string;
}) {
  const markdown =
    file.content_type === AGENT_FILE_TYPES.md || /\.md$/i.test(file.filename);
  if (!markdown) {
    return (
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-4 text-xs">
        {text}
      </pre>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30 p-4">
      <div
        className={`${styles.markdown} break-words text-sm [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_.task-list-item>input]:mr-2`}
      >
        <Markdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          components={{
            a: ({ children, href }) => (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            img: ({ src, alt }) => (
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                className="max-w-full rounded-md"
              />
            ),
            pre: ({ children }) => (
              <pre className="rounded-md border bg-muted">{children}</pre>
            ),
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto rounded-md border">
                <table className="w-full border-collapse">{children}</table>
              </div>
            ),
            th: ({ children, style }) => (
              <th
                style={style}
                className="border-b bg-muted px-3 py-2 text-left font-medium"
              >
                {children}
              </th>
            ),
            td: ({ children, style }) => (
              <td style={style} className="border-b px-3 py-2">
                {children}
              </td>
            ),
          }}
        >
          {text}
        </Markdown>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function AgentAttachmentChips({ files }: { files: AgentAttachment[] }) {
  const open = useContext(AttachmentContext);
  if (!files.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file) => (
        <button
          key={file.file_id}
          type="button"
          disabled={!open}
          onClick={() => open?.(file)}
          title={`View ${file.filename}`}
          className="flex max-w-full cursor-pointer items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
        >
          <FileText className="size-4 shrink-0" />
          <span className="min-w-0 truncate">{file.filename}</span>
          <span className="shrink-0 text-muted-foreground">
            {formatFileSize(file.size_bytes)}
          </span>
        </button>
      ))}
    </div>
  );
}

export function AgentAttachmentControls({
  files,
  disabled,
  leadingControl,
  onAdd,
  onRemove,
  onRetry,
}: {
  files: PendingAttachment[];
  disabled?: boolean;
  leadingControl?: ReactNode;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const open = useContext(AttachmentContext);
  return (
    <div className="px-3 pb-2">
      {!!files.length && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Attached files">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex max-w-full flex-col gap-1 rounded-md border bg-muted/30 px-2 py-1.5 text-xs"
            >
              <div className="flex min-w-0 items-center gap-2">
                {file.status === "uploading" || file.status === "finalizing" ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : file.status === "ready" ? (
                  <Check className="size-3.5 shrink-0" />
                ) : (
                  <FileText className="size-3.5 shrink-0 text-destructive" />
                )}
                <button
                  type="button"
                  className="min-w-0 truncate text-left enabled:cursor-pointer enabled:underline-offset-2 enabled:hover:underline"
                  disabled={!file.attachment || !open}
                  onClick={() => file.attachment && open?.(file.attachment)}
                  title={file.file.name}
                >
                  {file.file.name}
                </button>
                <span role="status" className="shrink-0 text-muted-foreground">
                  {file.status === "ready"
                    ? "Ready"
                    : file.status === "error"
                      ? "Failed"
                      : file.status === "finalizing"
                        ? "Processing…"
                        : "Uploading…"}
                </span>
                {file.status === "error" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6"
                    disabled={disabled}
                    onClick={() => onRetry(file.id)}
                    aria-label={`Retry ${file.file.name}`}
                  >
                    <RotateCcw className="size-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-6"
                  disabled={disabled}
                  onClick={() => onRemove(file.id)}
                  aria-label={`Remove ${file.file.name}`}
                >
                  <X className="size-3" />
                </Button>
              </div>
              {file.error && (
                <p
                  role="alert"
                  className="max-w-sm break-words text-destructive"
                >
                  {file.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {leadingControl}
        <input
          ref={input}
          type="file"
          multiple
          accept={AGENT_FILE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          disabled={disabled || files.length >= MAX_AGENT_FILES}
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []).slice(
              0,
              Math.max(0, MAX_AGENT_FILES - files.length),
            );
            if (selected.length) onAdd(selected);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Attach files"
          title="Attach files"
          disabled={disabled || files.length >= MAX_AGENT_FILES}
          onClick={() => input.current?.click()}
        >
          <Paperclip className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
