"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { createPortal, flushSync } from "react-dom";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/utils/clipboard";
import type {
  ArchitectureAssemblySection,
  ArchitectureContentArtifact,
  ArchitecturePackageSection,
} from "@/types/website-architecture-content-types";
import { ArchitectureExportMode, ArchitecturePreviewSite, Markdown, textOf } from "./architecture-section-fields";
import { hasSectionRenderer, SectionBlock } from "./architecture-sections";
import { websiteArchitectureHtml } from "./website-architecture-html";

interface RendererProps {
  artifact: ArchitectureContentArtifact;
  site?: string;
  pageTitle?: string;
}

function isAssemblySection(value: ArchitectureAssemblySection): boolean {
  return Boolean(value && typeof value.registry_id === "string" &&
    value.fields && typeof value.fields === "object" && !Array.isArray(value.fields));
}

function WrittenSection({ section }: { section: ArchitecturePackageSection }) {
  return (
    <section className="min-w-0 space-y-3 border-b py-6 last:border-b-0">
      {section.heading?.trim() && <h2 className="text-xl font-medium">{section.heading}</h2>}
      {section.markdown && <Markdown text={section.markdown} />}
    </section>
  );
}

export function WebsiteArchitectureRenderer({
  artifact,
  site,
  pageTitle,
  exportRef,
}: RendererProps & {
  exportRef?: Ref<HTMLElement>;
}) {
  const assembly = artifact.assembly;
  const sections = Array.isArray(assembly?.sections) ? assembly.sections.filter(isAssemblySection) : [];
  const showAssembly = sections.some(hasSectionRenderer);
  const legacyPackage = artifact.schema_version === 2 ? undefined : artifact.package;
  const draft = legacyPackage?.draft?.trim();
  const written = legacyPackage?.sections?.filter((section) => section.heading?.trim() || section.markdown?.trim()) ?? [];
  const writtenById = new Map(written.map((section) => [section.id, section]));
  if (!showAssembly && !draft && !written.length) {
    return (
      <section className="space-y-2 border-b pb-5">
        <h1 className="break-words text-2xl font-medium tracking-tight">{pageTitle || "Page preview"}</h1>
        <p role="status" className="text-sm text-muted-foreground">This request completed without page content to preview.</p>
      </section>
    );
  }

  const title = (showAssembly ? assembly?.page?.h1?.trim() : undefined) ||
    legacyPackage?.page?.h1?.trim() || legacyPackage?.page?.title_tag?.trim() || pageTitle;
  const firstSection = sections[0];
  const titleInAssembly = Boolean(showAssembly && title && firstSection && hasSectionRenderer(firstSection) &&
    /^(hero|header)\./.test(firstSection.registry_id) && textOf(firstSection.fields, "heading").trim() === title);
  const titleInDraft = !showAssembly && Boolean(draft && /^#\s/.test(draft));

  return (
    <ArchitecturePreviewSite.Provider value={site}>
      {!exportRef && <CopyArchitectureHtml artifact={artifact} site={site} pageTitle={pageTitle} />}
      <article
        ref={exportRef}
        aria-label="Generated website page"
        className={exportRef
          ? "@container mx-auto w-full max-w-4xl min-w-0 break-words text-neutral-900"
          : "w-full min-w-0 break-words rounded-lg border bg-background px-4 py-6 sm:px-8"}
      >
        {title && !titleInAssembly && !titleInDraft && (
          <h1 className="mb-4 text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
        )}
        {showAssembly ? sections.map((section, index) => {
          const key = section.instance_id || `${section.registry_id}-${index}`;
          if (!hasSectionRenderer(section) && Array.isArray(section.source_section_refs)) {
            const originals = section.source_section_refs.flatMap((id) => {
              const original = writtenById.get(id);
              return original ? [original] : [];
            });
            if (originals.length) {
              return <div key={key}>{originals.map((original) => <WrittenSection key={original.id} section={original} />)}</div>;
            }
          }
          return <SectionBlock key={key} section={section} title={index === 0 && titleInAssembly ? title : null} />;
        }) : draft ? <Markdown text={draft} /> : written.map((section, index) => (
          <WrittenSection key={section.id || index} section={section} />
        ))}
      </article>
    </ArchitecturePreviewSite.Provider>
  );
}

function CopyArchitectureHtml(props: RendererProps) {
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied">("idle");
  const [renderExport, setRenderExport] = useState(false);
  const exportRef = useRef<HTMLElement>(null);
  const copied = copyState === "copied";

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopyState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyHtml = async () => {
    if (copyState !== "idle") return;
    setCopyState("copying");
    try {
      flushSync(() => setRenderExport(true));
      if (!exportRef.current) throw new Error("No preview content to copy.");
      const html = websiteArchitectureHtml(exportRef.current);
      setRenderExport(false);

      let wroteClipboard = false;
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([html], { type: "text/plain" }),
          })]);
          wroteClipboard = true;
        } catch {
          // Editors and browsers with restricted rich clipboard access can use the HTML source.
        }
      }
      if (!wroteClipboard && !await copyToClipboard(html)) throw new Error("Couldn’t copy HTML");
      setCopyState("copied");
    } catch {
      setCopyState("idle");
      toast.error("Couldn’t copy HTML");
    } finally {
      setRenderExport(false);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copyHtml()}
          aria-disabled={copyState !== "idle"}
          className="min-w-28 transition-colors aria-disabled:cursor-default aria-disabled:hover:bg-background motion-reduce:transition-none"
        >
          {copied ? <Check aria-hidden className="text-general-primary" /> : <Copy aria-hidden />}
          {copied ? "Copied" : copyState === "copying" ? "Copying…" : "Copy HTML"}
        </Button>
        <span role="status" className="sr-only">{copied ? "HTML copied to clipboard" : ""}</span>
      </div>
      {renderExport && createPortal(
        <div aria-hidden className="invisible pointer-events-none fixed top-0 -left-[10000px] w-[56rem]">
          <ArchitectureExportMode.Provider value>
            <WebsiteArchitectureRenderer {...props} exportRef={exportRef} />
          </ArchitectureExportMode.Provider>
        </div>,
        document.body,
      )}
    </>
  );
}
