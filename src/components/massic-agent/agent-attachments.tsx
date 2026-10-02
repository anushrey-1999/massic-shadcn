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
  FileText,
  Loader2,
  Paperclip,
  RotateCcw,
  X,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AGENT_FILE_ACCEPT,
  AGENT_FILE_TYPES,
  MAX_AGENT_FILES,
  getAgentFileUrls,
  loadAgentFilePreview,
  uploadErrorMessage,
  type AgentAttachment,
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
  const [url, setUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setUrl(null);
    setBlobUrl(null);
    setText(null);
    setError(null);
    if (!file) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setLoading(true);
    void (async () => {
      try {
        const urls = await getAgentFileUrls(
          business,
          [file.file_id],
          controller.signal,
        );
        const signed = urls.find((item) => item.file_id === file.file_id);
        if (!signed)
          throw new Error("This file is unavailable. Please try again.");
        if (controller.signal.aborted) return;
        setUrl(signed.url);
        const preview = await loadAgentFilePreview(
          file,
          signed.url,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (preview.blob) {
          objectUrl = URL.createObjectURL(preview.blob);
          setBlobUrl(objectUrl);
        }
        if (preview.text !== undefined) setText(preview.text);
      } catch (error) {
        if (!controller.signal.aborted) setError(uploadErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [business, file, attempt]);
  return (
    <AttachmentContext.Provider value={setFile}>
      {children}
      <Dialog
        open={!!file}
        onOpenChange={(open) => {
          if (!open) setFile(null);
        }}
      >
        <DialogContent className="flex h-[80dvh] min-h-0 flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader className="shrink-0 pr-6 text-left">
            <DialogTitle className="break-all font-medium">
              {file?.filename}
            </DialogTitle>
            <DialogDescription>
              Attached file · {file ? formatFileSize(file.size_bytes) : ""}
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <p
              role="status"
              className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" />
              Loading file…
            </p>
          ) : blobUrl ? (
            <iframe
              title={`Preview ${file?.filename}`}
              src={blobUrl}
              className="min-h-0 w-full flex-1 rounded-md border"
            />
          ) : text !== null && file ? (
            <AgentTextPreview file={file} text={text} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <FileText className="size-8" />
              <p role={error ? "alert" : undefined}>
                {error ?? "Open or download this file to view it."}
              </p>
              {error && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  Retry
                </Button>
              )}
            </div>
          )}
          {url && (
            <div className="flex shrink-0 justify-end">
              <Button asChild variant="outline">
                <a href={url} target="_blank" rel="noreferrer">
                  Open / download
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AttachmentContext.Provider>
  );
}

export function AgentTextPreview({
  file,
  text,
}: {
  file: AgentAttachment;
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
  onAdd,
  onRemove,
  onRetry,
}: {
  files: PendingAttachment[];
  disabled?: boolean;
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
