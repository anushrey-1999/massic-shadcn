"use client";

import * as React from "react";
import {
  Image as ImageIcon,
  Video,
  Type,
  Minus,
  AlertCircle,
  Check,
  LayoutGrid,
  Columns2,
  Columns3,
  SplitSquareHorizontal,
  RectangleHorizontal,
  Star,
  BarChart3,
  ListOrdered,
  MessageSquareQuote,
  HelpCircle,
  Megaphone,
  Table2,
  AlertTriangle,
  Heading,
  Link2,
  List,
  Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildImageBlockHtml,
  buildVideoEmbedHtml,
  buildTextSectionHtml,
  buildDividerHtml,
  parseVideoUrl,
  type ImageAlignment,
} from "@/utils/page-html-editor";
import { cn } from "@/lib/utils";

type TopTab = "layouts" | "media" | "text";

export type InsertBlockMode = "section" | "inner";

interface InsertBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (blockHtml: string) => void;
  mode?: InsertBlockMode;
  insertHint?: string;
}

interface LayoutBlockDef {
  id: string;
  label: string;
  icon: React.ElementType;
  category: "Layout" | "Content" | "Sections";
  html: string;
}

const LAYOUT_BLOCKS: LayoutBlockDef[] = [
  {
    id: "section",
    label: "Section",
    icon: RectangleHorizontal,
    category: "Layout",
    html: `<section class="massic-section"><div class="massic-container"><h2>Section Title</h2><p>Add your content here.</p></div></section>`,
  },
  {
    id: "container",
    label: "Container",
    icon: Square,
    category: "Layout",
    html: `<section class="massic-section"><div class="massic-container"><p>Container content</p></div></section>`,
  },
  {
    id: "grid-2",
    label: "2-Column Grid",
    icon: Columns2,
    category: "Layout",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-grid cols-2"><div><h3>Column 1</h3><p>Content for the first column.</p></div><div><h3>Column 2</h3><p>Content for the second column.</p></div></div></div></section>`,
  },
  {
    id: "grid-3",
    label: "3-Column Grid",
    icon: Columns3,
    category: "Layout",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-grid cols-3"><div><h3>Column 1</h3><p>Content here.</p></div><div><h3>Column 2</h3><p>Content here.</p></div><div><h3>Column 3</h3><p>Content here.</p></div></div></div></section>`,
  },
  {
    id: "split",
    label: "Split (Text + Image)",
    icon: SplitSquareHorizontal,
    category: "Layout",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-split"><div><h2>Your Heading</h2><p>Describe your content here. This split layout places text alongside an image.</p></div><div><img src="https://placehold.co/600x400?text=Image" alt="Placeholder" loading="lazy" decoding="async" style="width:100%;border-radius:8px;"/></div></div></div></section>`,
  },
  {
    id: "card",
    label: "Card",
    icon: LayoutGrid,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-card"><h3>Card Title</h3><p>Card description goes here.</p></div></div></section>`,
  },
  {
    id: "cards-grid",
    label: "Card Grid (2x)",
    icon: LayoutGrid,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-grid cols-2"><div class="massic-card"><h3>Card One</h3><p>Card description goes here.</p></div><div class="massic-card"><h3>Card Two</h3><p>Card description goes here.</p></div></div></div></section>`,
  },
  {
    id: "cards-grid-3",
    label: "Card Grid (3x)",
    icon: LayoutGrid,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-grid cols-3"><div class="massic-card"><h3>Card One</h3><p>Description here.</p></div><div class="massic-card"><h3>Card Two</h3><p>Description here.</p></div><div class="massic-card"><h3>Card Three</h3><p>Description here.</p></div></div></div></section>`,
  },
  {
    id: "hero",
    label: "Hero Section",
    icon: Megaphone,
    category: "Sections",
    html: `<section class="massic-hero massic-section"><div class="massic-container massic-center"><h1>Your Main Headline</h1><p class="massic-lead">A brief subtitle or description that tells visitors what you offer.</p><div class="massic-actions"><a href="#" class="massic-btn primary">Get Started</a><a href="#" class="massic-btn outline">Learn More</a></div></div></section>`,
  },
  {
    id: "cta",
    label: "CTA Box",
    icon: Megaphone,
    category: "Sections",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-cta massic-center"><h2>Ready to Get Started?</h2><p>Take the next step and contact us today.</p><div class="massic-actions"><a href="#" class="massic-btn primary">Contact Us</a></div></div></div></section>`,
  },
  {
    id: "cta-band",
    label: "CTA Band",
    icon: Megaphone,
    category: "Sections",
    html: `<section class="massic-cta-band massic-section"><div class="massic-container massic-center"><h2>Don't Miss Out</h2><p>Sign up now and get started for free.</p><div class="massic-actions"><a href="#" class="massic-btn primary">Sign Up Free</a></div></div></section>`,
  },
  {
    id: "feature",
    label: "Feature Card",
    icon: Star,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-feature"><div class="massic-icon">&#9733;</div><h3>Feature Title</h3><p>Brief description of this feature and its benefits.</p></div></div></section>`,
  },
  {
    id: "features-grid",
    label: "Features Grid (3x)",
    icon: Star,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-grid cols-3"><div class="massic-feature"><div class="massic-icon">&#9733;</div><h3>Feature One</h3><p>Brief description.</p></div><div class="massic-feature"><div class="massic-icon">&#9733;</div><h3>Feature Two</h3><p>Brief description.</p></div><div class="massic-feature"><div class="massic-icon">&#9733;</div><h3>Feature Three</h3><p>Brief description.</p></div></div></div></section>`,
  },
  {
    id: "stats",
    label: "Stats Bar",
    icon: BarChart3,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-stats"><div class="massic-stat"><span class="massic-stat-num">500+</span><span class="massic-stat-label">Customers</span></div><div class="massic-stat"><span class="massic-stat-num">98%</span><span class="massic-stat-label">Satisfaction</span></div><div class="massic-stat"><span class="massic-stat-num">24/7</span><span class="massic-stat-label">Support</span></div></div></div></section>`,
  },
  {
    id: "steps",
    label: "Process Steps",
    icon: ListOrdered,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-stack"><div class="massic-step"><span class="massic-num">1</span><div><h3>Step One</h3><p>Description of the first step.</p></div></div><div class="massic-step"><span class="massic-num">2</span><div><h3>Step Two</h3><p>Description of the second step.</p></div></div><div class="massic-step"><span class="massic-num">3</span><div><h3>Step Three</h3><p>Description of the third step.</p></div></div></div></div></section>`,
  },
  {
    id: "testimonial",
    label: "Testimonial",
    icon: MessageSquareQuote,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-testimonial"><div class="massic-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><blockquote><p>"Excellent service and great results. Highly recommend to anyone looking for quality work."</p></blockquote><div class="massic-author-line"><strong>John D.</strong> <span class="massic-muted">Local Business Owner</span></div></div></div></section>`,
  },
  {
    id: "faq",
    label: "FAQ",
    icon: HelpCircle,
    category: "Sections",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-faq massic-stack"><details><summary>What is your return policy?</summary><p>We offer a 30-day money-back guarantee on all purchases.</p></details><details><summary>How long does shipping take?</summary><p>Standard shipping takes 3-5 business days.</p></details><details><summary>Do you offer phone support?</summary><p>Yes, our support team is available 24/7.</p></details></div></div></section>`,
  },
  {
    id: "alert",
    label: "Alert / Callout",
    icon: AlertTriangle,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-alert"><p><strong>Note:</strong> This is an important callout or alert message.</p></div></div></section>`,
  },
  {
    id: "table",
    label: "Comparison Table",
    icon: Table2,
    category: "Content",
    html: `<section class="massic-section"><div class="massic-container"><div class="massic-comparison-table"><table><thead><tr><th>Feature</th><th>Basic</th><th>Pro</th></tr></thead><tbody><tr><td>Storage</td><td>5 GB</td><td>100 GB</td></tr><tr><td>Support</td><td>Email</td><td>24/7 Phone</td></tr><tr><td>Price</td><td>Free</td><td>$29/mo</td></tr></tbody></table></div></div></section>`,
  },
];

const CATEGORIES: Array<{ id: LayoutBlockDef["category"]; label: string }> = [
  { id: "Layout", label: "Layout" },
  { id: "Content", label: "Content" },
  { id: "Sections", label: "Full Sections" },
];

// ---------------------------------------------------------------------------
//  Inner blocks: used when inserting content inside an existing element
//  (e.g. inside a card, empty container, grid column).
//  HTML here is WITHOUT section/container wrappers.
// ---------------------------------------------------------------------------

interface InnerBlockDef {
  id: string;
  label: string;
  icon: React.ElementType;
  category: "Layout" | "Content" | "Text";
  html: string;
}

const INNER_BLOCKS: InnerBlockDef[] = [
  {
    id: "inner-grid-2",
    label: "2-Column Grid",
    icon: Columns2,
    category: "Layout",
    html: `<div class="massic-grid cols-2"><div><h3>Column 1</h3><p>Content here.</p></div><div><h3>Column 2</h3><p>Content here.</p></div></div>`,
  },
  {
    id: "inner-grid-3",
    label: "3-Column Grid",
    icon: Columns3,
    category: "Layout",
    html: `<div class="massic-grid cols-3"><div><p>Column 1</p></div><div><p>Column 2</p></div><div><p>Column 3</p></div></div>`,
  },
  {
    id: "inner-split",
    label: "Split (Text + Image)",
    icon: SplitSquareHorizontal,
    category: "Layout",
    html: `<div class="massic-split"><div><h3>Your Heading</h3><p>Text content alongside an image.</p></div><div><img src="https://placehold.co/600x400?text=Image" alt="Placeholder" style="width:100%;border-radius:8px;"/></div></div>`,
  },
  {
    id: "inner-card",
    label: "Card",
    icon: LayoutGrid,
    category: "Layout",
    html: `<div class="massic-card"><h3>Card Title</h3><p>Card description goes here.</p></div>`,
  },
  {
    id: "inner-cards-2",
    label: "Two Cards",
    icon: LayoutGrid,
    category: "Layout",
    html: `<div class="massic-grid cols-2"><div class="massic-card"><h3>Card One</h3><p>Description here.</p></div><div class="massic-card"><h3>Card Two</h3><p>Description here.</p></div></div>`,
  },
  {
    id: "inner-container",
    label: "Container",
    icon: Square,
    category: "Layout",
    html: `<div class="massic-container"><p>Container content</p></div>`,
  },
  {
    id: "inner-heading",
    label: "Heading",
    icon: Heading,
    category: "Text",
    html: `<h3>Your Heading</h3>`,
  },
  {
    id: "inner-paragraph",
    label: "Paragraph",
    icon: Type,
    category: "Text",
    html: `<p>Add your paragraph text here. Click to edit.</p>`,
  },
  {
    id: "inner-image",
    label: "Image",
    icon: ImageIcon,
    category: "Content",
    html: `<img src="https://placehold.co/600x400?text=Image" alt="Image description" style="width:100%;max-width:600px;border-radius:8px;display:block;"/>`,
  },
  {
    id: "inner-video",
    label: "YouTube Video",
    icon: Video,
    category: "Content",
    html: `<div class="massic-video-wrap"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`,
  },
  {
    id: "inner-button",
    label: "Button",
    icon: RectangleHorizontal,
    category: "Text",
    html: `<div class="massic-actions"><a href="#" class="massic-btn primary">Click Here</a></div>`,
  },
  {
    id: "inner-button-pair",
    label: "Button Pair",
    icon: RectangleHorizontal,
    category: "Text",
    html: `<div class="massic-actions"><a href="#" class="massic-btn primary">Get Started</a><a href="#" class="massic-btn outline">Learn More</a></div>`,
  },
  {
    id: "inner-link",
    label: "Link",
    icon: Link2,
    category: "Text",
    html: `<p><a href="#">Edit this link</a></p>`,
  },
  {
    id: "inner-list",
    label: "List",
    icon: List,
    category: "Text",
    html: `<ul><li>List item one</li><li>List item two</li><li>List item three</li></ul>`,
  },
  {
    id: "inner-divider",
    label: "Divider",
    icon: Minus,
    category: "Text",
    html: `<hr class="massic-divider"/>`,
  },
  {
    id: "inner-feature",
    label: "Feature Card",
    icon: Star,
    category: "Content",
    html: `<div class="massic-feature"><div class="massic-icon">&#9733;</div><h3>Feature Title</h3><p>Brief description of this feature.</p></div>`,
  },
  {
    id: "inner-testimonial",
    label: "Testimonial",
    icon: MessageSquareQuote,
    category: "Content",
    html: `<div class="massic-testimonial"><div class="massic-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><blockquote><p>"Excellent service and great results."</p></blockquote><div class="massic-author-line"><strong>John D.</strong> <span class="massic-muted">Business Owner</span></div></div>`,
  },
  {
    id: "inner-alert",
    label: "Alert / Callout",
    icon: AlertTriangle,
    category: "Content",
    html: `<div class="massic-alert"><p><strong>Note:</strong> This is an important callout or alert message.</p></div>`,
  },
  {
    id: "inner-stats",
    label: "Stats Bar",
    icon: BarChart3,
    category: "Content",
    html: `<div class="massic-stats"><div class="massic-stat"><span class="massic-stat-num">500+</span><span class="massic-stat-label">Customers</span></div><div class="massic-stat"><span class="massic-stat-num">98%</span><span class="massic-stat-label">Satisfaction</span></div><div class="massic-stat"><span class="massic-stat-num">24/7</span><span class="massic-stat-label">Support</span></div></div>`,
  },
];

const INNER_CATEGORIES: Array<{ id: InnerBlockDef["category"]; label: string }> = [
  { id: "Layout", label: "Layout" },
  { id: "Content", label: "Content" },
  { id: "Text", label: "Text & Elements" },
];

function ImageTab({ onInsert }: { onInsert: (html: string) => void }) {
  const [url, setUrl] = React.useState("");
  const [alt, setAlt] = React.useState("");
  const [alignment, setAlignment] = React.useState<ImageAlignment>("center");
  const [error, setError] = React.useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = React.useState(false);

  const handleInsert = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter an image URL");
      return;
    }
    const html = buildImageBlockHtml(trimmed, alt, alignment);
    if (!html) {
      setError("Invalid or unsafe URL");
      return;
    }
    onInsert(html);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Typography className="text-xs font-medium">Image URL</Typography>
        <Input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
            setPreviewLoaded(false);
          }}
          placeholder="https://example.com/image.jpg"
          className="h-8 text-sm"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Typography className="text-xs font-medium">Alt text</Typography>
        <Input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image"
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Typography className="text-xs font-medium">Alignment</Typography>
        <div className="inline-flex items-center rounded-md border border-border p-0.5">
          {(["left", "center"] as const).map((a) => (
            <Button
              key={a}
              type="button"
              size="sm"
              variant={alignment === a ? "default" : "ghost"}
              className="h-7 px-3 text-xs capitalize"
              onClick={() => setAlignment(a)}
            >
              {a}
            </Button>
          ))}
        </div>
      </div>

      {url.trim() && (
        <div className="rounded-md border bg-muted/30 p-2 flex items-center justify-center min-h-[80px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url.trim()}
            alt={alt || "Preview"}
            className="max-h-[120px] max-w-full rounded object-contain"
            onLoad={() => setPreviewLoaded(true)}
            onError={() => setPreviewLoaded(false)}
            style={{ display: previewLoaded ? "block" : "none" }}
          />
          {!previewLoaded && (
            <Typography className="text-xs text-muted-foreground">Loading preview...</Typography>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <Typography className="text-xs">{error}</Typography>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" size="sm" className="h-8 gap-1.5" onClick={handleInsert}>
          <Check className="h-3.5 w-3.5" />
          Insert Image
        </Button>
      </div>
    </div>
  );
}

function VideoTab({ onInsert }: { onInsert: (html: string) => void }) {
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const parsed = React.useMemo(() => parseVideoUrl(url), [url]);

  const handleInsert = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a video URL");
      return;
    }
    const html = buildVideoEmbedHtml(trimmed);
    if (!html) {
      setError("Unsupported video URL. Paste a YouTube or Vimeo link.");
      return;
    }
    onInsert(html);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Typography className="text-xs font-medium">Video URL</Typography>
        <Input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          className="h-8 text-sm"
          autoFocus
        />
      </div>

      {parsed && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <Typography className="text-xs text-muted-foreground capitalize">
              {parsed.provider} detected
            </Typography>
          </div>
          <div className="rounded-md border overflow-hidden bg-muted/30">
            <iframe
              src={parsed.embedUrl}
              className="w-full aspect-video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video preview"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <Typography className="text-xs">{error}</Typography>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" size="sm" className="h-8 gap-1.5" onClick={handleInsert} disabled={!parsed}>
          <Check className="h-3.5 w-3.5" />
          Insert Video
        </Button>
      </div>
    </div>
  );
}

function LayoutsTab({ onInsert }: { onInsert: (html: string) => void }) {
  return (
    <div className="space-y-4">
      {CATEGORIES.map((cat) => {
        const blocks = LAYOUT_BLOCKS.filter((b) => b.category === cat.id);
        if (!blocks.length) return null;
        return (
          <div key={cat.id}>
            <Typography className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {cat.label}
            </Typography>
            <div className="grid grid-cols-2 gap-2">
              {blocks.map((block) => {
                const Icon = block.icon;
                return (
                  <button
                    key={block.id}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-left text-xs",
                      "hover:border-primary hover:bg-accent/50 transition-colors cursor-pointer"
                    )}
                    onClick={() => onInsert(block.html)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium leading-tight">{block.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InnerBlocksTab({ onInsert }: { onInsert: (html: string) => void }) {
  return (
    <div className="space-y-4">
      {INNER_CATEGORIES.map((cat) => {
        const blocks = INNER_BLOCKS.filter((b) => b.category === cat.id);
        if (!blocks.length) return null;
        return (
          <div key={cat.id}>
            <Typography className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {cat.label}
            </Typography>
            <div className="grid grid-cols-2 gap-2">
              {blocks.map((block) => {
                const Icon = block.icon;
                return (
                  <button
                    key={block.id}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-left text-xs",
                      "hover:border-primary hover:bg-accent/50 transition-colors cursor-pointer"
                    )}
                    onClick={() => onInsert(block.html)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium leading-tight">{block.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TextBlocksTab({ onInsert }: { onInsert: (html: string) => void }) {
  const quickBlocks = [
    { id: "text-section", label: "Text Section", icon: Type, action: () => onInsert(buildTextSectionHtml()) },
    { id: "heading", label: "Heading", icon: Heading, action: () => onInsert(`<section class="massic-section"><div class="massic-container"><h2>Your Heading</h2></div></section>`) },
    { id: "divider", label: "Divider", icon: Minus, action: () => onInsert(buildDividerHtml()) },
    { id: "button-primary", label: "Button (Primary)", icon: RectangleHorizontal, action: () => onInsert(`<section class="massic-section"><div class="massic-container massic-center"><div class="massic-actions"><a href="#" class="massic-btn primary">Click Here</a></div></div></section>`) },
    { id: "button-pair", label: "Button Pair", icon: RectangleHorizontal, action: () => onInsert(`<section class="massic-section"><div class="massic-container massic-center"><div class="massic-actions"><a href="#" class="massic-btn primary">Get Started</a><a href="#" class="massic-btn outline">Learn More</a></div></div></section>`) },
    { id: "link", label: "Link", icon: Link2, action: () => onInsert(`<section class="massic-section"><div class="massic-container"><p><a href="#">Edit this link</a></p></div></section>`) },
    { id: "list", label: "List", icon: List, action: () => onInsert(`<section class="massic-section"><div class="massic-container"><ul><li>List item one</li><li>List item two</li><li>List item three</li></ul></div></section>`) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {quickBlocks.map((block) => {
        const Icon = block.icon;
        return (
          <button
            key={block.id}
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-left text-xs",
              "hover:border-primary hover:bg-accent/50 transition-colors cursor-pointer"
            )}
            onClick={block.action}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium leading-tight">{block.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const TOP_TABS: Array<{ id: TopTab; label: string; icon: React.ElementType }> = [
  { id: "layouts", label: "Layouts", icon: LayoutGrid },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "text", label: "Text & More", icon: Type },
];

export function InsertBlockDialog({ open, onOpenChange, onInsert, mode = "section", insertHint }: InsertBlockDialogProps) {
  const [activeTab, setActiveTab] = React.useState<TopTab>("layouts");
  const [mediaSubTab, setMediaSubTab] = React.useState<"image" | "video">("image");
  const isInner = mode === "inner";

  const handleInsert = React.useCallback(
    (html: string) => {
      onInsert(html);
      onOpenChange(false);
    },
    [onInsert, onOpenChange]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-[360px]">
        <SheetHeader className="pb-0">
          <SheetTitle className="text-sm">{isInner ? "Add Content Inside" : "Insert Block"}</SheetTitle>
          {insertHint ? (
            <div className="rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              {insertHint}
            </div>
          ) : null}
        </SheetHeader>

        {isInner ? (
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <InnerBlocksTab onInsert={handleInsert} />
          </div>
        ) : (
          <>
            <div className="flex gap-1 border-b px-4 pb-2">
              {TOP_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    type="button"
                    size="sm"
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {activeTab === "layouts" && <LayoutsTab onInsert={handleInsert} />}
              {activeTab === "media" && (
                <div className="space-y-3">
                  <div className="inline-flex items-center rounded-md border border-border p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaSubTab === "image" ? "default" : "ghost"}
                      className="h-7 gap-1.5 px-3 text-xs"
                      onClick={() => setMediaSubTab("image")}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Image
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mediaSubTab === "video" ? "default" : "ghost"}
                      className="h-7 gap-1.5 px-3 text-xs"
                      onClick={() => setMediaSubTab("video")}
                    >
                      <Video className="h-3.5 w-3.5" />
                      Video
                    </Button>
                  </div>
                  {mediaSubTab === "image" && <ImageTab onInsert={handleInsert} />}
                  {mediaSubTab === "video" && <VideoTab onInsert={handleInsert} />}
                </div>
              )}
              {activeTab === "text" && <TextBlocksTab onInsert={handleInsert} />}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
