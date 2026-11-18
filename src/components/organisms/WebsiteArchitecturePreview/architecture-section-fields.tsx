"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Element, ElementContent, Root } from "hast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type {
  ArchitectureSectionField,
  ArchitectureSectionFields,
} from "@/types/website-architecture-content-types";

export const ArchitecturePreviewSite = createContext<string | undefined>(undefined);
export const ArchitectureExportMode = createContext(false);

function record(value: ArchitectureSectionField | undefined): ArchitectureSectionFields | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

export function textOf(fields: ArchitectureSectionFields, key: string) {
  const value = fields[key];
  return typeof value === "string" ? value : "";
}

export function boolOf(fields: ArchitectureSectionFields, key: string) {
  return fields[key] === true;
}

export function numberOf(fields: ArchitectureSectionFields, key: string) {
  const value = fields[key];
  return typeof value === "number" || typeof value === "string" ? String(value) : "";
}

export function records(fields: ArchitectureSectionFields, key: string) {
  const value = fields[key];
  return Array.isArray(value) ? value.map(record).filter((item) => item !== null) : [];
}

interface Cta {
  text: string;
  url: string;
}

interface LinkRef {
  url: string;
}

export interface Asset {
  url: string;
  alt: string;
  placeholder: boolean;
  need: string;
}

export function ctaOf(value: ArchitectureSectionField | undefined): Cta | null {
  const item = record(value);
  return item && typeof item.text === "string" ? { text: item.text, url: textOf(item, "url") } : null;
}

export function linkOf(value: ArchitectureSectionField | undefined): LinkRef | null {
  const item = record(value);
  return item ? { url: textOf(item, "final_url") } : null;
}

export function assetOf(value: ArchitectureSectionField | undefined): Asset | null {
  const item = record(value);
  return item ? {
    url: textOf(item, "url"),
    alt: textOf(item, "alt"),
    placeholder: boolOf(item, "placeholder"),
    need: textOf(item, "need"),
  } : null;
}

function resolveUrl(value: string, site: string | undefined, media = false) {
  const url = value.trim();
  if (!url) return undefined;
  if (!media && url.startsWith("#")) return url;
  try {
    const parsed = new URL(url, site);
    const protocols = media ? ["https:", "http:"] : ["https:", "http:", "mailto:", "tel:"];
    if (protocols.includes(parsed.protocol) && !parsed.username && !parsed.password) {
      return parsed.href;
    }
  } catch {
    return undefined;
  }
}

export function AssetView({
  asset,
  video = false,
  layout = "cover",
}: {
  asset: Asset | null;
  video?: boolean;
  layout?: "cover" | "contain" | "inline";
}) {
  const site = useContext(ArchitecturePreviewSite);
  const [failedUrl, setFailedUrl] = useState<string>();
  const url = asset?.url ? resolveUrl(asset.url, site, true) : undefined;
  if (!url || asset?.placeholder || failedUrl === url) {
    return (
      <span className={cn(
        "rounded-md bg-muted text-sm text-muted-foreground",
        layout === "inline"
          ? "inline-block max-w-full break-words px-2 py-1 align-middle"
          : "flex min-h-40 items-center justify-center px-4 py-3 text-center",
      )}>
        {asset?.need || asset?.alt || (video ? "Video unavailable" : "Image unavailable")}
      </span>
    );
  }
  if (video) {
    return (
      <video
        src={url}
        controls
        preload="none"
        aria-label={asset?.alt || undefined}
        onError={() => setFailedUrl(url)}
        className="h-auto max-h-[32rem] w-full rounded-md bg-foreground object-contain"
      />
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- generated assets can be hosted on any business's site */
    <img
      src={url}
      alt={asset?.alt ?? ""}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedUrl(url)}
      className={layout === "inline"
        ? "inline-block h-auto max-h-16 w-auto max-w-full rounded-md object-contain align-middle"
        : cn("h-auto max-h-[32rem] w-full rounded-md", layout === "contain" ? "object-contain" : "object-cover")}
    />
  );
}

export function PreviewLink({
  url, children, className, fallback = children,
}: {
  url?: string;
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
}) {
  const site = useContext(ArchitecturePreviewSite);
  const href = url ? resolveUrl(url, site) : undefined;
  if (!href) return fallback;
  const external = /^https?:/.test(href);
  return (
    <a href={href} className={className} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      {children}
    </a>
  );
}

export function CtaView({ cta }: { cta: Cta | null }) {
  if (!cta?.text.trim()) return null;
  const className = "inline-flex max-w-full items-center rounded-md px-4 py-2 text-sm font-medium";
  return (
    <PreviewLink
      url={cta.url}
      className={`${className} bg-primary text-primary-foreground`}
      fallback={<span className={`${className} bg-muted text-muted-foreground`}>{cta.text}</span>}
    >
      {cta.text}
    </PreviewLink>
  );
}

export function LinkView({ link, children }: { link: LinkRef | null; children: ReactNode }) {
  return <PreviewLink url={link?.url} className="underline underline-offset-2">{children}</PreviewLink>;
}

function isWhitespace(node: Root["children"][number]) {
  return node.type === "text" && !node.value.trim();
}

function isLinkedImage(node: ElementContent) {
  if (node.type !== "element" || node.tagName !== "a") return false;
  const content = node.children.filter((child) => !isWhitespace(child));
  return content.length === 1 && content[0].type === "element" && content[0].tagName === "img";
}

function layoutMarkdownImages() {
  return (tree: Root) => {
    const visit = (parent: Root | Element) => {
      let previousLinkedImages: Element | undefined;
      for (let index = 0; index < parent.children.length; index++) {
        const node = parent.children[index];
        if (isWhitespace(node)) continue;
        if (node.type !== "element") {
          previousLinkedImages = undefined;
          continue;
        }
        const content = node.children.filter((child) => !isWhitespace(child));
        const imagesOnly = node.tagName === "p" && content.length > 0 &&
          content.every((child) => (child.type === "element" && child.tagName === "img") || isLinkedImage(child));
        if (!imagesOnly) {
          previousLinkedImages = undefined;
          visit(node);
          continue;
        }

        const linkedImagesOnly = content.every(isLinkedImage);
        if (linkedImagesOnly && previousLinkedImages) {
          // Markdown exports often put each linked logo in its own adjacent paragraph.
          previousLinkedImages.children.push(...node.children);
          previousLinkedImages.properties["data-markdown-media"] = "group";
          parent.children.splice(index, 1);
          index--;
        } else {
          node.properties["data-markdown-media"] = content.length > 1 ? "group" : "standalone";
          previousLinkedImages = linkedImagesOnly ? node : undefined;
        }
      }
    };

    visit(tree);
  };
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const site = useContext(ArchitecturePreviewSite);
  if (!text.trim()) return null;
  return (
    <div className={cn(
      "min-w-0 space-y-4 text-base leading-7 [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h4]:font-medium [&_h1]:font-medium [&_h2]:font-medium [&_h3]:font-medium [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-6",
      className,
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[layoutMarkdownImages]}
        skipHtml
        urlTransform={(url, key) => resolveUrl(url, site, key === "src") ?? ""}
        components={{
          a: ({ href, children }) => (
            <PreviewLink url={href} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {children}
            </PreviewLink>
          ),
          p: ({ node, children }) => {
            const media = node?.properties["data-markdown-media"];
            return (
              <p
                data-markdown-media={media === "group" || media === "standalone" ? media : undefined}
                className={cn(
                  media === "group" && "flex flex-wrap items-center gap-2 [&_img]:block [&_img]:h-12 [&_img]:w-24 [&_img]:object-scale-down sm:gap-3 sm:[&_img]:h-14 sm:[&_img]:w-28",
                  media === "standalone" && "[&_img]:block [&_img]:max-h-96",
                )}
              >
                {children}
              </p>
            );
          },
          img: ({ src, alt }) => (
            <AssetView layout="inline" asset={{ url: typeof src === "string" ? src : "", alt: alt ?? "", placeholder: false, need: "" }} />
          ),
          table: ({ children }) => <div className="overflow-x-auto"><table>{children}</table></div>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
