"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FileText, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FileDropzone } from "@/components/molecules/FileDropzone";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { MassicAmoebaLoader } from "@/components/ui/massic-amoeba-loader";
import { Textarea } from "@/components/ui/textarea";
import { FieldRow } from "./controls";
import { Section } from "./Section";

const FILE_EXTENSIONS = ["pdf", "docx", "txt", "md", "csv"] as const;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DOCUMENTS_MAX = 20;
const CONTEXT_MAX = 2000;
const SIMULATED_CRAWL_MS = 2500;
const SIMULATED_UPLOAD_STEP_MS = 150;
const SIMULATED_SAVE_MS = 600;

type LocalDocument = { id: string; name: string; sizeBytes: number; addedAt: Date; progress: number | null };

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Timers that are cleared when the tab unmounts, so simulated work never updates a gone component. */
function useTimers() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);
  return useCallback((callback: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      callback();
    }, ms);
    timers.current.add(id);
  }, []);
}

/**
 * Knowledge controls in preview: crawl, extra context and documents behave as they will once
 * knowledge sync ships, but live only in this page and reset on reload.
 */
export function KnowledgeTab({ businessId }: { businessId: string }) {
  const schedule = useTimers();

  return (
    <div className="max-w-[752px] space-y-4 pb-6">
      <Alert variant="info">
        <AlertTitle>Knowledge sync is coming soon</AlertTitle>
        <AlertDescription>You can try these controls now. Changes here aren&apos;t saved yet.</AlertDescription>
      </Alert>
      <WebsiteSection schedule={schedule} />
      <ContextSection schedule={schedule} />
      <DocumentsSection schedule={schedule} />
      <Section
        title="Key facts"
        description="Your agent answers from your Profile details first. Edit them in one place, on your Profile."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/business/${businessId}/profile`}>Edit in Profile</Link>
          </Button>
        }
      >
        <p className="text-sm text-general-muted-foreground">
          Keep your hours, services and service area up to date so the agent can answer accurately.
        </p>
      </Section>
    </div>
  );
}

type Schedule = ReturnType<typeof useTimers>;

function WebsiteSection({ schedule }: { schedule: Schedule }) {
  const [crawling, setCrawling] = useState(false);
  const [lastCrawledAt, setLastCrawledAt] = useState<Date | null>(null);

  const recrawl = () => {
    setCrawling(true);
    schedule(() => {
      setCrawling(false);
      setLastCrawledAt(new Date());
      toast.success("Site read", { description: "Preview only. Your pages will be indexed once knowledge sync ships." });
    }, SIMULATED_CRAWL_MS);
  };

  return (
    <Section
      title="Website"
      description="Your agent reads the public pages on your site."
      action={
        <Button variant="outline" size="sm" onClick={recrawl} disabled={crawling}>
          {crawling ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Re-crawl
        </Button>
      }
    >
      {crawling ? (
        <div className="relative flex items-center gap-3 rounded-lg border border-general-border bg-general-primary-foreground px-3 py-3">
          <BorderBeam durationSeconds={4} />
          <MassicAmoebaLoader size={20} label="Reading your site" />
          <p className="text-sm font-medium text-general-foreground">Reading your site</p>
        </div>
      ) : (
        <p className="text-sm text-general-muted-foreground">
          {lastCrawledAt
            ? `Last read ${formatDistanceToNow(lastCrawledAt, { addSuffix: true })}`
            : "Not crawled yet"}
        </p>
      )}
    </Section>
  );
}

function ContextSection({ schedule }: { schedule: Schedule }) {
  const [saved, setSaved] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const isDirty = draft.trim() !== saved;

  const save = () => {
    setSaving(true);
    schedule(() => {
      setSaving(false);
      setSaved(draft.trim());
      setDraft(draft.trim());
      toast.success("Context updated", { description: "Preview only. It isn't saved yet." });
    }, SIMULATED_SAVE_MS);
  };

  return (
    <Section
      title="Extra context"
      description="Anything your website doesn't say: seasonal offers, policies, how you like to handle requests."
    >
      <FieldRow label="Context" htmlFor="knowledge-context" hint={`${draft.length}/${CONTEXT_MAX} characters`}>
        <Textarea
          id="knowledge-context"
          rows={5}
          maxLength={CONTEXT_MAX}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="We offer free estimates within 20 miles. Emergency calls are answered 24/7."
        />
      </FieldRow>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setDraft(saved)} disabled={!isDirty || saving}>
          Discard
        </Button>
        <Button size="sm" onClick={save} disabled={!isDirty || saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Saving…" : "Save context"}
        </Button>
      </div>
    </Section>
  );
}

function DocumentsSection({ schedule }: { schedule: Schedule }) {
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const slots = DOCUMENTS_MAX - documents.length;

  const setProgress = (id: string, progress: number | null) =>
    setDocuments((items) => items.map((item) => (item.id === id ? { ...item, progress } : item)));

  const simulateUpload = (id: string, progress = 0) => {
    if (progress >= 100) {
      setProgress(id, null);
      return;
    }
    setProgress(id, progress);
    schedule(() => simulateUpload(id, progress + 20), SIMULATED_UPLOAD_STEP_MS);
  };

  const addFiles = (files: File[]) => {
    const added = files.slice(0, Math.max(0, slots)).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      sizeBytes: file.size,
      addedAt: new Date(),
      progress: 0,
    }));
    setDocuments((items) => [...added, ...items]);
    added.forEach((document) => simulateUpload(document.id));
  };

  return (
    <Section title="Documents" description="Price lists, FAQs and policies your website doesn't cover.">
      <FileDropzone
        accept={FILE_EXTENSIONS}
        maxBytes={MAX_FILE_BYTES}
        onFiles={addFiles}
        disabled={slots <= 0}
        hint={slots <= 0 ? `You've reached ${DOCUMENTS_MAX} documents. Remove one to add another.` : undefined}
      />

      {documents.length > 0 && (
        <ul className="mt-3 divide-y divide-general-border rounded-lg border border-general-border">
          {documents.map((document) => (
            <li key={document.id} className="flex min-h-12 items-center gap-3 px-3 py-2">
              {document.progress === null ? (
                <FileText className="size-4 shrink-0 text-general-muted-foreground" aria-hidden />
              ) : (
                <Loader2 className="size-4 shrink-0 animate-spin text-general-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-general-foreground">{document.name}</p>
                <p className="truncate text-xs text-general-muted-foreground tabular-nums">
                  {document.progress === null
                    ? `${formatSize(document.sizeBytes)} · added ${formatDistanceToNow(document.addedAt, { addSuffix: true })}`
                    : `Uploading ${document.progress}%`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${document.name}`}
                disabled={document.progress !== null}
                onClick={() => setDocuments((items) => items.filter((item) => item.id !== document.id))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
