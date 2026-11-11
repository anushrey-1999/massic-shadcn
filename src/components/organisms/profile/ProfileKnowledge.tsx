"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, MoreHorizontal, Trash2, Upload, X } from "lucide-react";
import { AgentFilePreviewDialog } from "@/components/massic-agent/agent-attachments";
import { AGENT_FILE_TYPES } from "@/components/massic-agent/agent-uploads";
import { FileDropzone } from "@/components/molecules/FileDropzone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  deleteKnowledgeFile,
  getKnowledgeFileUrls,
  knowledgeErrorMessage,
  knowledgeSourceError,
  listKnowledge,
  updateKnowledgeSearchable,
  uploadKnowledgeFile,
  type KnowledgeFile,
  type KnowledgeFileKind,
} from "./profile-knowledge-api";

const FILE_SECTIONS = [
  {
    kind: "file",
    title: "All files",
    description: "Available to all customer-facing agents and Massic agents",
    emptyLabel: "No files yet",
  },
  {
    kind: "internal_file",
    title: "Internal files",
    description: "Available to Massic Agents only",
    emptyLabel: "No internal files yet",
  },
] as const;
const FILE_TYPE_LABELS = new Map([
  ["pdf", "PDF"],
  ["docx", "DOCX"],
  ["txt", "TXT"],
  ["md", "MD"],
  ["csv", "CSV"],
]);
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

type PendingUpload = {
  id: string;
  filename: string;
  status: "Waiting" | "Uploading" | "Finalizing" | "Failed";
  error?: string;
};
type FileAction = { searchable: boolean } | "delete";

function isProcessing(source: KnowledgeFile) {
  return source.status === "queued" || source.status === "processing" || source.status === "deleting";
}

function isAccessError(error: unknown) {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 401 || status === 403;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

function formatSize(bytes: number | null) {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function getFileName(source: KnowledgeFile) {
  return source.filename?.trim() || "Unnamed file";
}

function getFileExtension(source: KnowledgeFile) {
  return source.filename?.trim().match(/\.([^.]+)$/)?.[1]?.toLowerCase() ?? "";
}

function KnowledgeSection({ title, description, used, limit, children }: {
  title: string;
  description: string;
  used: number;
  limit?: number;
  children: ReactNode;
}) {
  const heading = useId();
  return (
    <section aria-labelledby={heading} className="min-w-0 space-y-3">
      <div className="space-y-1">
        <h3 id={heading} className="flex flex-wrap items-center gap-2 text-sm font-medium text-general-foreground">
          {title}
          {limit !== undefined && (
            <Badge variant="secondary" className="rounded-sm font-medium text-muted-foreground tabular-nums">
              {used} of {limit}
            </Badge>
          )}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function KnowledgeTable({ title, empty, children }: {
  title: string;
  empty?: string;
  children: ReactNode;
}) {
  if (empty) {
    return (
      <div className="rounded-lg border border-general-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  const headerClass = "h-9 bg-general-primary-foreground px-3 text-xs text-muted-foreground";
  return (
    <Table
      role="region"
      aria-label={`${title} table scroll area`}
      tabIndex={0}
      className="rounded-lg border border-general-border focus-visible:outline-ring"
    >
      <TableElement aria-label={title} className="min-w-[36rem] table-fixed">
        <colgroup>
          <col />
          <col className="w-16" />
          <col className="w-16" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-14" />
        </colgroup>
        <TableHeader>
          <TableRow>
            {["File", "Type", "Size", "Added", "Searchable"].map((column) => (
              <TableHead key={column} scope="col" className={headerClass}>{column}</TableHead>
            ))}
            <TableHead scope="col" className={headerClass}><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </TableElement>
    </Table>
  );
}

function KnowledgeFileRow({ businessId, source, onPreview, onUpdate, onSettled }: {
  businessId: string;
  source: KnowledgeFile;
  onPreview: (id: string, trigger: HTMLButtonElement) => void;
  onUpdate: (source: KnowledgeFile) => Promise<void>;
  onSettled: () => void;
}) {
  const name = getFileName(source);
  const fileType = FILE_TYPE_LABELS.get(getFileExtension(source)) ?? FILE_TYPE_LABELS.get(source.format_id ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const actionsButton = useRef<HTMLButtonElement>(null);
  const action = useMutation({
    mutationFn: (value: FileAction) => value === "delete"
      ? deleteKnowledgeFile(businessId, source.id)
      : updateKnowledgeSearchable(businessId, source.id, value.searchable),
    onSuccess: onUpdate,
    onSettled,
  });
  const deleting = source.status === "deleting";
  const saving = action.isPending && action.variables !== "delete";

  return (
    <TableRow className="h-11 hover:bg-muted/30">
      <TableCell className="px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {deleting || (action.isPending && action.variables === "delete") ? (
            <span className="min-w-0 wrap-anywhere font-medium text-general-foreground">{name}</span>
          ) : (
            <button
              type="button"
              aria-haspopup="dialog"
              className="min-w-0 cursor-pointer wrap-anywhere rounded-sm text-left font-medium text-general-foreground underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={(event) => onPreview(source.id, event.currentTarget)}
            >
              {name}
            </button>
          )}
        </div>
        {source.error && (
          <p className="mt-1 text-xs text-destructive">{knowledgeSourceError(source.error)}</p>
        )}
        {action.isError && (
          <p role="alert" className="max-w-56 text-xs text-destructive">
            {knowledgeErrorMessage(action.error, action.variables === "delete"
              ? "Couldn't delete this file. Try again."
              : "Couldn't update searchability for this file. Try again.")}
          </p>
        )}
      </TableCell>
      <TableCell className="px-3 py-2 text-xs text-muted-foreground">{fileType ?? "—"}</TableCell>
      <TableCell className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground tabular-nums">{formatSize(source.size_bytes)}</TableCell>
      <TableCell className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{formatDate(source.created_at)}</TableCell>
      <TableCell className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Switch
            aria-label={`Searchable ${name}`}
            checked={source.searchable}
            disabled={deleting || action.isPending}
            onCheckedChange={(searchable) => action.mutate({ searchable })}
            className="data-[state=checked]:bg-general-primary data-[state=unchecked]:bg-general-border"
          />
          {saving && (
            <span role="status" className="text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              <span className="sr-only">Saving searchability</span>
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="px-3 py-1.5 text-right">
        {!deleting && (
          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  ref={actionsButton}
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="border border-transparent bg-general-secondary text-general-unofficial-mid-alt hover:border-general-border hover:bg-general-border data-[state=open]:bg-general-border"
                  disabled={action.isPending}
                  aria-label={`Actions for ${name}`}
                >
                  {action.isPending && action.variables === "delete"
                    ? <Loader2 className="size-4 animate-spin" aria-label="Deleting file" />
                    : <MoreHorizontal className="size-4" aria-hidden="true" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-lg border-general-border">
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Delete file
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent onCloseAutoFocus={(event) => {
              event.preventDefault();
              actionsButton.current?.focus();
            }}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete file?</AlertDialogTitle>
                <AlertDialogDescription className="break-words">
                  {name} will be removed from Knowledge and its search results.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive" onClick={() => action.mutate("delete")}>Delete file</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </TableCell>
    </TableRow>
  );
}

function KnowledgeUploadDialog({ destinations, accept, maxBytes, busy, onUpload }: {
  destinations: Array<{ kind: KnowledgeFileKind; title: string; description: string; available: number }>;
  accept: string[];
  maxBytes: number;
  busy: boolean;
  onUpload: (kind: KnowledgeFileKind, files: File[], available: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectionError, setSelectionError] = useState("");
  const optionId = useId();
  const selected = destinations.find(({ kind }) => kind === destination);
  const available = selected?.available ?? 0;

  function changeDestination(kind: string) {
    setDestination(kind);
    setFiles([]);
    setSelectionError("");
  }

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) changeDestination("");
  }

  function addFiles(picked: File[]) {
    const remaining = available - files.length;
    if (picked.length > remaining) {
      setSelectionError(remaining > 0
        ? `You can add ${remaining} more ${remaining === 1 ? "file" : "files"}.`
        : "This selection fills the remaining slots.");
      return;
    }
    setSelectionError("");
    setFiles([...files, ...picked]);
  }

  function submit() {
    if (!selected || busy || files.length === 0 || files.length > available) return;
    onUpload(selected.kind, files, available);
    changeOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" disabled={busy} className="ml-auto">
          {busy
            ? <Loader2 className="size-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
            : <Upload className="size-4" strokeWidth={1.5} aria-hidden="true" />}
          {busy ? "Uploading…" : "Upload files"}
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-5 p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="text-base font-medium">Upload files</DialogTitle>
          <DialogDescription>Choose where the files should be available.</DialogDescription>
        </DialogHeader>
        <RadioGroup aria-label="Upload destination" value={destination} onValueChange={changeDestination} className="gap-2">
          {destinations.map(({ kind, title, description, available }) => (
            <label
              key={kind}
              className={cn(
                "flex items-start gap-3 rounded-md border border-general-border p-3",
                available ? "cursor-pointer hover:bg-muted/30" : "cursor-not-allowed opacity-60",
                destination === kind && "border-general-primary bg-general-primary/5",
              )}
            >
              <RadioGroupItem
                value={kind}
                disabled={available === 0}
                aria-labelledby={`${optionId}-${kind}-title`}
                aria-describedby={`${optionId}-${kind}-description`}
                className="mt-0.5"
              />
              <span className="min-w-0 space-y-0.5">
                <span id={`${optionId}-${kind}-title`} className="block text-sm font-medium">{title}</span>
                <span id={`${optionId}-${kind}-description`} className="block text-xs text-muted-foreground">
                  {description}{available === 0 && " · File limit reached"}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {selected && available > 0 && (
          <FileDropzone
            key={selected.kind}
            accept={accept}
            maxBytes={maxBytes}
            title={files.length ? "Add more files" : "Choose files"}
            onFiles={addFiles}
          />
        )}
        {selectionError && <p role="alert" className="text-xs text-destructive">{selectionError}</p>}
        {files.length > available && (
          <p role="alert" className="text-xs text-destructive">
            The available space changed. Remove files or choose another destination.
          </p>
        )}
        {files.length > 0 && (
          <ul aria-label="Selected files" className="divide-y rounded-md border border-general-border">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center gap-2 px-3 py-1.5">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 wrap-anywhere text-sm">{file.name}</span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => {
                    setFiles(files.filter((_, fileIndex) => fileIndex !== index));
                    setSelectionError("");
                  }}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter className="flex-row justify-end">
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="button" onClick={submit} disabled={busy || files.length === 0 || files.length > available}>
            <Upload className="size-4" strokeWidth={1.5} aria-hidden="true" />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileKnowledge({ businessId, active }: { businessId: string; active: boolean }) {
  const viewerId = useAuthStore(({ user }) => user?.uniqueId ?? user?.UniqueId ?? user?.id ?? user?.email);
  const queryClient = useQueryClient();
  const queryKey = ["profile-knowledge", businessId, viewerId] as const;
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => listKnowledge(businessId, signal),
    enabled: active,
    retry: false,
    refetchInterval: ({ state }) => active && !isAccessError(state.error) && state.data?.sources.some(isProcessing) ? 3000 : false,
  });
  const [uploads, setUploads] = useState<Partial<Record<KnowledgeFileKind, PendingUpload[]>>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const uploadController = useRef<AbortController | null>(null);
  useEffect(() => () => uploadController.current?.abort(), []);

  const data = query.data;
  const refresh = () => void queryClient.invalidateQueries({ queryKey });

  async function syncSource(source: KnowledgeFile) {
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<typeof data>(queryKey, (current) => {
      if (!current) return current;
      const exists = current.sources.some(({ id }) => id === source.id);
      return {
        ...current,
        sources: exists
          ? current.sources.map((row) => row.id === source.id ? source : row)
          : [...current.sources, source],
      };
    });
  }

  function updateUpload(kind: KnowledgeFileKind, id: string, next: Partial<PendingUpload> | null) {
    setUploads((current) => ({
      ...current,
      [kind]: current[kind]?.flatMap((item) => item.id !== id ? [item] : next ? [{ ...item, ...next }] : []),
    }));
  }

  async function uploadFiles(kind: KnowledgeFileKind, files: File[], available: number) {
    if (uploadController.current || available < 1) return;
    const controller = new AbortController();
    uploadController.current = controller;
    const selection = files.map((file, index) => ({
      file,
      item: {
        id: crypto.randomUUID(),
        filename: file.name,
        status: index < available ? "Waiting" as const : "Failed" as const,
        error: index < available ? undefined : "This section has reached its file limit.",
      },
    }));
    setUploads((current) => ({
      ...current,
      [kind]: [...(current[kind] ?? []), ...selection.map(({ item }) => item)],
    }));

    try {
      for (const { file, item } of selection.slice(0, available)) {
        if (controller.signal.aborted) break;
        updateUpload(kind, item.id, { status: "Uploading" });
        try {
          const source = await uploadKnowledgeFile(
            businessId,
            kind,
            file,
            () => updateUpload(kind, item.id, { status: "Finalizing" }),
            controller.signal,
          );
          await syncSource(source);
          updateUpload(kind, item.id, null);
        } catch (error) {
          if (controller.signal.aborted) break;
          updateUpload(kind, item.id, {
            status: "Failed",
            error: error instanceof Error ? error.message : "Couldn't upload the file. Try again.",
          });
        }
      }
    } finally {
      uploadController.current = null;
      refresh();
    }
  }

  const busy = Object.values(uploads).some((items) => items?.some((item) => item.status !== "Failed"));
  const canShowData = data && !isAccessError(query.error);
  const previewSource = active && canShowData
    ? data.sources.find(({ id, status }) => id === previewId && status !== "deleting")
    : undefined;
  const sections = FILE_SECTIONS.map((section) => {
    const rows = data?.sources.filter((source) => source.kind === section.kind) ?? [];
    const limit = data?.limits.kinds.find((limit) => limit.kind === section.kind);
    const used = rows.filter((source) => source.status !== "deleting").length;
    const available = limit?.uploadable ? Math.max(0, limit.max - used) : 0;
    return { ...section, rows, used, limit: limit?.max, available };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-general-border/30 pb-3">
        <h2 className="text-base font-medium">Knowledge</h2>
        {active && canShowData && (
          <KnowledgeUploadDialog
            destinations={sections}
            accept={data.limits.file_types}
            maxBytes={data.limits.max_upload_bytes}
            busy={busy}
            onUpload={(kind, files, available) => void uploadFiles(kind, files, available)}
          />
        )}
      </div>
      {query.isLoading && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading knowledge…
        </p>
      )}
      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 p-3 text-sm">
          <p>{knowledgeErrorMessage(query.error, "Couldn't load the Knowledge files. Try again.")}</p>
          <Button type="button" size="sm" variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
            {query.isFetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      )}
      {canShowData && (
        <>
          {sections.map(({ kind, title, description, rows, limit, used, emptyLabel }) => {
            const pending = uploads[kind] ?? [];
            return (
              <KnowledgeSection key={kind} title={title} description={description} used={used} limit={limit}>
                {pending.length > 0 && (
                  <ul aria-live="polite" className="space-y-1">
                    {pending.map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 rounded-md border border-general-border bg-background px-3 py-2 text-sm",
                          item.error && "border-destructive/30 bg-destructive/5",
                        )}
                      >
                        {item.error
                          ? <FileText className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                          : <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />}
                        <div className="min-w-0 flex-1">
                          <p className="wrap-anywhere font-medium">{item.filename}</p>
                          <p className={item.error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                            {item.error ?? `${item.status}…`}
                          </p>
                        </div>
                        {item.error && (
                          <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0"
                            onClick={() => updateUpload(kind, item.id, null)} aria-label={`Dismiss error for ${item.filename}`}>
                            <X className="size-4" aria-hidden="true" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <KnowledgeTable title={title} empty={!rows.length ? emptyLabel : undefined}>
                  {rows.map((source) => (
                    <KnowledgeFileRow key={source.id} businessId={businessId} source={source}
                      onPreview={(id, trigger) => {
                        previewTrigger.current = trigger;
                        setPreviewId(id);
                      }}
                      onUpdate={syncSource} onSettled={refresh} />
                  ))}
                </KnowledgeTable>
              </KnowledgeSection>
            );
          })}
        </>
      )}
      <AgentFilePreviewDialog
        business={businessId}
        file={previewSource ? {
          file_id: previewSource.id,
          filename: getFileName(previewSource),
          content_type: AGENT_FILE_TYPES[getFileExtension(previewSource)] ?? previewSource.content_type ?? "",
          size_bytes: previewSource.size_bytes,
        } : null}
        getFileUrls={getKnowledgeFileUrls}
        variant="knowledge"
        onClose={() => setPreviewId(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          previewTrigger.current?.focus();
          previewTrigger.current = null;
        }}
      />
    </div>
  );
}
