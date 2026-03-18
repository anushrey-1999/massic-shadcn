"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Save,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Blocks,
  Layers,
  Settings2,
} from "lucide-react";
import type { Editor } from "grapesjs";

import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { ensureMassicContentWrapper } from "@/utils/page-content-format";
import { sanitizePageHtml } from "@/utils/page-html-editor";

type Props = {
  html: string;
  cssUrl: string;
  onSave: (html: string) => Promise<void>;
};

type DeviceId = "desktop" | "tablet" | "mobile";
type SidePanel = "blocks" | "layers" | "traits";

const MASSIC_BLOCKS = [
  {
    id: "massic-section",
    label: "Section",
    category: "Layout",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/></svg>`,
    content: `<section class="massic-section"><div class="massic-container"><h2>Section Title</h2><p>Add your content here.</p></div></section>`,
  },
  {
    id: "massic-container",
    label: "Container",
    category: "Layout",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
    content: `<div class="massic-container"><p>Container content</p></div>`,
  },
  {
    id: "massic-grid-2",
    label: "2-Column Grid",
    category: "Layout",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="9" height="16" rx="1"/><rect x="13" y="4" width="9" height="16" rx="1"/></svg>`,
    content: `<div class="massic-container"><div class="massic-grid cols-2"><div><h3>Column 1</h3><p>Content for the first column.</p></div><div><h3>Column 2</h3><p>Content for the second column.</p></div></div></div>`,
  },
  {
    id: "massic-grid-3",
    label: "3-Column Grid",
    category: "Layout",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="4" width="6" height="16" rx="1"/><rect x="9" y="4" width="6" height="16" rx="1"/><rect x="17" y="4" width="6" height="16" rx="1"/></svg>`,
    content: `<div class="massic-container"><div class="massic-grid cols-3"><div><h3>Column 1</h3><p>Content here.</p></div><div><h3>Column 2</h3><p>Content here.</p></div><div><h3>Column 3</h3><p>Content here.</p></div></div></div>`,
  },
  {
    id: "massic-split",
    label: "Split (Text + Image)",
    category: "Layout",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="11" height="16" rx="1"/><rect x="15" y="6" width="7" height="12" rx="1"/><line x1="4" y1="8" x2="10" y2="8"/><line x1="4" y1="11" x2="11" y2="11"/><line x1="4" y1="14" x2="9" y2="14"/></svg>`,
    content: `<div class="massic-container"><div class="massic-split"><div><h2>Your Heading</h2><p>Describe your content here. This split layout places text alongside an image.</p></div><div><img src="https://placehold.co/600x400?text=Image" alt="Placeholder" style="width:100%;border-radius:8px;"/></div></div></div>`,
  },
  {
    id: "massic-card",
    label: "Card",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="15" y2="12"/></svg>`,
    content: `<div class="massic-card"><h3>Card Title</h3><p>Card description goes here.</p></div>`,
  },
  {
    id: "massic-hero",
    label: "Hero Section",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><rect x="9" y="15" width="6" height="3" rx="1"/></svg>`,
    content: `<section class="massic-hero massic-section"><div class="massic-container massic-center"><h1>Your Main Headline</h1><p class="massic-lead">A brief subtitle or description that tells visitors what you offer.</p><div class="massic-actions"><a href="#" class="massic-btn primary">Get Started</a><a href="#" class="massic-btn outline">Learn More</a></div></div></section>`,
  },
  {
    id: "massic-cta",
    label: "CTA Box",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><rect x="8" y="14" width="8" height="3" rx="1"/><line x1="7" y1="9" x2="17" y2="9"/></svg>`,
    content: `<div class="massic-cta massic-center"><h2>Ready to Get Started?</h2><p>Take the next step and contact us today.</p><div class="massic-actions"><a href="#" class="massic-btn primary">Contact Us</a></div></div>`,
  },
  {
    id: "massic-cta-band",
    label: "CTA Band",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="7" width="22" height="10" rx="2"/><rect x="8" y="12" width="8" height="3" rx="1"/><line x1="6" y1="9" x2="18" y2="9"/></svg>`,
    content: `<section class="massic-cta-band massic-section"><div class="massic-container massic-center"><h2>Don't Miss Out</h2><p>Sign up now and get started for free.</p><div class="massic-actions"><a href="#" class="massic-btn primary">Sign Up Free</a></div></div></section>`,
  },
  {
    id: "massic-feature",
    label: "Feature Card",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="3"/><line x1="5" y1="14" x2="19" y2="14"/><line x1="5" y1="18" x2="16" y2="18"/></svg>`,
    content: `<div class="massic-feature"><div class="massic-icon">&#9733;</div><h3>Feature Title</h3><p>Brief description of this feature and its benefits.</p></div>`,
  },
  {
    id: "massic-stats",
    label: "Stats Bar",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="8" y1="6" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="18"/></svg>`,
    content: `<div class="massic-stats"><div class="massic-stat"><span class="massic-stat-num">500+</span><span class="massic-stat-label">Customers</span></div><div class="massic-stat"><span class="massic-stat-num">98%</span><span class="massic-stat-label">Satisfaction</span></div><div class="massic-stat"><span class="massic-stat-num">24/7</span><span class="massic-stat-label">Support</span></div></div>`,
  },
  {
    id: "massic-steps",
    label: "Process Steps",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="3"/><line x1="11" y1="5" x2="21" y2="5"/><line x1="11" y1="8" x2="18" y2="8"/><circle cx="6" cy="16" r="3"/><line x1="11" y1="15" x2="21" y2="15"/><line x1="11" y1="18" x2="18" y2="18"/></svg>`,
    content: `<div class="massic-stack"><div class="massic-step"><span class="massic-num">1</span><div><h3>Step One</h3><p>Description of the first step.</p></div></div><div class="massic-step"><span class="massic-num">2</span><div><h3>Step Two</h3><p>Description of the second step.</p></div></div><div class="massic-step"><span class="massic-num">3</span><div><h3>Step Three</h3><p>Description of the third step.</p></div></div></div>`,
  },
  {
    id: "massic-faq",
    label: "FAQ",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><text x="12" y="17" text-anchor="middle" font-size="14" fill="currentColor" stroke="none">?</text></svg>`,
    content: `<div class="massic-faq massic-stack"><details><summary>What is your return policy?</summary><p>We offer a 30-day money-back guarantee on all purchases.</p></details><details><summary>How long does shipping take?</summary><p>Standard shipping takes 3-5 business days.</p></details><details><summary>Do you offer phone support?</summary><p>Yes, our support team is available 24/7.</p></details></div>`,
  },
  {
    id: "massic-testimonial",
    label: "Testimonial",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 10c0-3.3 2.7-6 6-6h0c3.3 0 6 2.7 6 6v0c0 3.3-2.7 6-6 6H8l-4 4V10z"/></svg>`,
    content: `<div class="massic-testimonial"><div class="massic-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><blockquote><p>"Excellent service and great results. Highly recommend to anyone looking for quality work."</p></blockquote><div class="massic-author-line"><strong>John D.</strong> <span class="massic-muted">Local Business Owner</span></div></div>`,
  },
  {
    id: "massic-image",
    label: "Image (URL)",
    category: "Media",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
    content: `<img src="https://placehold.co/600x400?text=Paste+Image+URL" alt="Image description" style="width:100%;max-width:600px;border-radius:8px;display:block;"/>`,
  },
  {
    id: "massic-video",
    label: "YouTube Video",
    category: "Media",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16"/></svg>`,
    content: `<div class="massic-video-wrap"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`,
  },
  {
    id: "massic-divider",
    label: "Divider",
    category: "Media",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
    content: `<hr class="massic-divider"/>`,
  },
  {
    id: "massic-heading",
    label: "Heading",
    category: "Text",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><text x="4" y="18" font-size="16" fill="currentColor" stroke="none" font-weight="bold">H</text></svg>`,
    content: `<h2>Your Heading</h2>`,
  },
  {
    id: "massic-paragraph",
    label: "Paragraph",
    category: "Text",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/><line x1="3" y1="18" x2="19" y2="18"/></svg>`,
    content: `<p>Add your paragraph text here. Click to edit this text and replace it with your own content.</p>`,
  },
  {
    id: "massic-button",
    label: "Button",
    category: "Text",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="8" width="16" height="8" rx="4"/></svg>`,
    content: `<a href="#" class="massic-btn primary">Click Here</a>`,
  },
  {
    id: "massic-list",
    label: "List",
    category: "Text",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="4" cy="6" r="1.5" fill="currentColor"/><line x1="8" y1="6" x2="20" y2="6"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><line x1="8" y1="12" x2="20" y2="12"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/><line x1="8" y1="18" x2="20" y2="18"/></svg>`,
    content: `<ul><li>List item one</li><li>List item two</li><li>List item three</li></ul>`,
  },
  {
    id: "massic-link",
    label: "Link",
    category: "Text",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
    content: `<a href="#">Edit this link</a>`,
  },
  {
    id: "massic-alert",
    label: "Alert / Callout",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="7" y1="5" x2="7" y2="19"/></svg>`,
    content: `<div class="massic-alert"><p><strong>Note:</strong> This is an important callout or alert message.</p></div>`,
  },
  {
    id: "massic-table",
    label: "Comparison Table",
    category: "Content",
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`,
    content: `<div class="massic-comparison-table"><table><thead><tr><th>Feature</th><th>Basic</th><th>Pro</th></tr></thead><tbody><tr><td>Storage</td><td>5 GB</td><td>100 GB</td></tr><tr><td>Support</td><td>Email</td><td>24/7 Phone</td></tr><tr><td>Price</td><td>Free</td><td>$29/mo</td></tr></tbody></table></div>`,
  },
];

function stripMassicDataAttributes(html: string): string {
  return html
    .replace(/\s*data-massic-text-id="[^"]*"/g, "")
    .replace(/\s*data-massic-link-id="[^"]*"/g, "")
    .replace(/\s*data-massic-spacing-id="[^"]*"/g, "")
    .replace(/\s*data-massic-section-id="[^"]*"/g, "")
    .replace(/\s*contenteditable="[^"]*"/g, "")
    .replace(/\s*class="massic-text-editable"/g, "")
    .replace(/\s*data-massic-layout-hovered="[^"]*"/g, "")
    .replace(/\s*data-massic-layout-selected="[^"]*"/g, "");
}

export function WebPageGrapesEditor({ html, cssUrl, onSave }: Props) {
  const editorRef = React.useRef<Editor | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [activeDevice, setActiveDevice] = React.useState<DeviceId>("desktop");
  const [activePanel, setActivePanel] = React.useState<SidePanel>("blocks");
  const [editorReady, setEditorReady] = React.useState(false);

  React.useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    const initEditor = async () => {
      const grapesjs = (await import("grapesjs")).default;

      if (destroyed || !containerRef.current) return;

      const cleanHtml = stripMassicDataAttributes(html);

      const editor = grapesjs.init({
        container: containerRef.current,
        height: "100%",
        width: "auto",
        fromElement: false,
        storageManager: false,
        panels: { defaults: [] },
        canvas: {
          styles: [cssUrl],
        },
        deviceManager: {
          devices: [
            { name: "Desktop", width: "" },
            { name: "Tablet", width: "768px", widthMedia: "992px" },
            { name: "Mobile", width: "375px", widthMedia: "480px" },
          ],
        },
        blockManager: { blocks: [] },
        selectorManager: { componentFirst: true, custom: true },
        styleManager: { sectors: [] },
        assetManager: {
          custom: true,
          uploadFile: undefined,
        },
        richTextEditor: {
          actions: ["bold", "italic", "underline", "strikethrough", "link"],
        },
      });

      const bm = editor.BlockManager;
      for (const block of MASSIC_BLOCKS) {
        bm.add(block.id, {
          label: block.label,
          category: block.category,
          media: block.media,
          content: block.content,
          activate: true,
        });
      }

      editor.DomComponents.addType("image", {
        model: {
          defaults: {
            traits: [
              { type: "text", name: "src", label: "Image URL", placeholder: "https://example.com/image.jpg" },
              { type: "text", name: "alt", label: "Alt Text", placeholder: "Describe the image" },
            ],
            resizable: {
              tl: 0, tc: 0, tr: 0, cl: 0,
              cr: 1, bl: 0, bc: 0, br: 1,
              keyWidth: "width",
              keyHeight: "height",
              currentUnit: 1,
              minDim: 50,
              step: 1,
            },
          },
        },
      });

      editor.DomComponents.addType("video", {
        model: {
          defaults: {
            traits: [
              { type: "text", name: "src", label: "Video Embed URL", placeholder: "https://www.youtube.com/embed/..." },
              { type: "text", name: "title", label: "Title" },
            ],
          },
        },
      });

      editor.DomComponents.addType("link", {
        model: {
          defaults: {
            traits: [
              { type: "text", name: "href", label: "URL", placeholder: "https://example.com" },
              {
                type: "select", name: "target", label: "Open in",
                options: [
                  { id: "", name: "Same tab" },
                  { id: "_blank", name: "New tab" },
                ],
              },
              { type: "text", name: "title", label: "Tooltip" },
            ],
          },
        },
      });

      editor.on("component:selected", () => {
        const selected = editor.getSelected();
        if (!selected) return;
        const tag = selected.get("tagName")?.toLowerCase();
        const type = selected.get("type");
        if (tag === "a" || type === "link" || tag === "img" || type === "image" || tag === "iframe" || type === "video") {
          setActivePanel("traits");
        }
      });

      const wrapper = editor.DomComponents.getWrapper();
      if (wrapper) {
        wrapper.set("attributes", { class: "massic-content" });
        editor.setComponents(cleanHtml);
      }

      editorRef.current = editor;
      if (!destroyed) setEditorReady(true);
    };

    void initEditor();

    return () => {
      destroyed = true;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      setEditorReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !editorReady) return;

    const blocksContainer = document.getElementById("gjs-panel-blocks");
    const layersContainer = document.getElementById("gjs-panel-layers");
    const traitsContainer = document.getElementById("gjs-panel-traits");

    if (blocksContainer) {
      const blocksEl = editor.BlockManager.render([]) as unknown as HTMLElement;
      blocksContainer.innerHTML = "";
      blocksContainer.appendChild(blocksEl);
    }
    if (layersContainer) {
      const layersEl = editor.LayerManager.render() as unknown as HTMLElement;
      layersContainer.innerHTML = "";
      layersContainer.appendChild(layersEl);
    }
    if (traitsContainer) {
      const traitsEl = editor.TraitManager.render() as unknown as HTMLElement;
      traitsContainer.innerHTML = "";
      traitsContainer.appendChild(traitsEl);
    }

    const handleSelection = () => {
      if (traitsContainer) {
        const traitsEl = editor.TraitManager.render() as unknown as HTMLElement;
        traitsContainer.innerHTML = "";
        traitsContainer.appendChild(traitsEl);
      }
    };
    editor.on("component:selected", handleSelection);
    return () => { editor.off("component:selected", handleSelection); };
  }, [editorReady]);

  const handleSave = React.useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    setIsSaving(true);
    try {
      const rawHtml = editor.getHtml() || "";
      const inlineCss = editor.getCss({ avoidProtected: true }) || "";

      let output = rawHtml;
      if (inlineCss.trim()) {
        output = `<style>${inlineCss}</style>\n${rawHtml}`;
      }

      const wrapped = ensureMassicContentWrapper(sanitizePageHtml(output));
      await onSave(wrapped);
      toast.success("Changes saved");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const handleUndo = React.useCallback(() => {
    editorRef.current?.UndoManager.undo();
  }, []);

  const handleRedo = React.useCallback(() => {
    editorRef.current?.UndoManager.redo();
  }, []);

  const handleDeviceChange = React.useCallback((device: DeviceId) => {
    const editor = editorRef.current;
    if (!editor) return;
    setActiveDevice(device);
    const deviceMap: Record<DeviceId, string> = {
      desktop: "Desktop",
      tablet: "Tablet",
      mobile: "Mobile",
    };
    editor.setDevice(deviceMap[device]);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-card px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Typography variant="muted" className="text-xs font-medium">
            Visual Builder
          </Typography>
          <div className="h-4 w-px bg-border" />
          <div className="inline-flex items-center rounded-md border border-border p-0.5">
            <Button
              type="button"
              size="sm"
              variant={activeDevice === "desktop" ? "default" : "ghost"}
              className="h-6 w-6 p-0"
              onClick={() => handleDeviceChange("desktop")}
              title="Desktop"
            >
              <Monitor className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeDevice === "tablet" ? "default" : "ghost"}
              className="h-6 w-6 p-0"
              onClick={() => handleDeviceChange("tablet")}
              title="Tablet"
            >
              <Tablet className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeDevice === "mobile" ? "default" : "ghost"}
              className="h-6 w-6 p-0"
              onClick={() => handleDeviceChange("mobile")}
              title="Mobile"
            >
              <Smartphone className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleUndo} disabled={!editorReady} title="Undo">
            <Undo2 className="h-3 w-3" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleRedo} disabled={!editorReady} title="Redo">
            <Redo2 className="h-3 w-3" />
          </Button>
          <div className="h-4 w-px bg-border mx-0.5" />
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 px-2.5 text-xs"
            onClick={() => void handleSave()}
            disabled={isSaving || !editorReady}
          >
            <Save className="h-3 w-3" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Main area: canvas + side panel */}
      <div className="relative flex flex-1 min-h-0">
        {/* GrapesJS canvas */}
        <div className="flex-1 min-w-0 relative">
          <div
            ref={containerRef}
            className="gjs-editor-wrap h-full w-full"
          />
          {!editorReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Typography variant="muted">Loading Visual Builder...</Typography>
            </div>
          )}
        </div>

        {/* Right side panel */}
        <div className="w-[260px] shrink-0 border-l bg-card flex flex-col">
          {/* Panel tabs */}
          <div className="flex border-b">
            {([
              { id: "blocks" as const, icon: Blocks, label: "Blocks" },
              { id: "layers" as const, icon: Layers, label: "Layers" },
              { id: "traits" as const, icon: Settings2, label: "Properties" },
            ]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActivePanel(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors border-b-2",
                  activePanel === id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            <div id="gjs-panel-blocks" className={cn("gjs-custom-panel p-2", activePanel !== "blocks" && "hidden")} />
            <div id="gjs-panel-layers" className={cn("gjs-custom-panel p-2", activePanel !== "layers" && "hidden")} />
            <div id="gjs-panel-traits" className={cn("gjs-custom-panel p-2", activePanel !== "traits" && "hidden")}>
              {activePanel === "traits" && editorReady && (
                <div className="text-[11px] text-muted-foreground px-1 pb-2">
                  Select an element on the canvas to edit its properties.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Theme overrides */}
      <link rel="stylesheet" href="https://unpkg.com/grapesjs/dist/css/grapes.min.css" />
      <style>{`
        /* ---- GrapesJS shadcn theme ---- */

        /* Hide ALL default GrapesJS panels (we render our own) */
        .gjs-editor-wrap .gjs-pn-panels,
        .gjs-editor-wrap .gjs-pn-views-container,
        .gjs-editor-wrap .gjs-pn-views,
        .gjs-editor-wrap .gjs-pn-options,
        .gjs-editor-wrap .gjs-pn-commands,
        .gjs-editor-wrap .gjs-pn-devices-c,
        .gjs-editor-wrap .gjs-cv-canvas__frames { /* let it size naturally */ }
        .gjs-editor-wrap .gjs-pn-panels { display: none !important; }

        /* Make canvas fill available space */
        .gjs-editor-wrap .gjs-editor { display: flex !important; flex-direction: column !important; }
        .gjs-editor-wrap .gjs-cv-canvas { flex: 1 !important; width: 100% !important; top: 0 !important; }

        /* Core backgrounds */
        .gjs-editor-wrap .gjs-one-bg,
        .gjs-editor-wrap .gjs-editor { background-color: hsl(var(--muted) / 0.3) !important; }
        .gjs-editor-wrap .gjs-three-bg { background-color: hsl(var(--muted)) !important; }

        /* Text colors */
        .gjs-editor-wrap .gjs-two-color { color: hsl(var(--foreground)) !important; }
        .gjs-editor-wrap .gjs-four-color,
        .gjs-editor-wrap .gjs-four-color-h:hover { color: hsl(var(--primary)) !important; }

        /* ---- Blocks panel ---- */
        .gjs-custom-panel .gjs-blocks-cs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .gjs-custom-panel .gjs-block-categories { display: contents; }
        .gjs-custom-panel .gjs-block-category { grid-column: 1 / -1; }
        .gjs-custom-panel .gjs-block-category .gjs-title {
          font-size: 11px;
          font-weight: 600;
          color: hsl(var(--foreground));
          background: transparent !important;
          padding: 6px 2px 4px;
          border-bottom: 1px solid hsl(var(--border));
          margin-bottom: 4px;
        }
        .gjs-custom-panel .gjs-block-category .gjs-blocks-c {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          padding: 0;
        }
        .gjs-custom-panel .gjs-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 4px;
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          font-size: 10px;
          font-weight: 500;
          cursor: grab;
          transition: border-color 0.15s, box-shadow 0.15s;
          min-height: 60px;
          width: auto !important;
        }
        .gjs-custom-panel .gjs-block:hover {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 1px hsl(var(--primary) / 0.2);
        }
        .gjs-custom-panel .gjs-block svg {
          width: 22px;
          height: 22px;
          stroke: hsl(var(--muted-foreground));
        }
        .gjs-custom-panel .gjs-block:hover svg {
          stroke: hsl(var(--primary));
        }
        .gjs-custom-panel .gjs-block__media { margin: 0 !important; line-height: 0; }

        /* ---- Layers panel ---- */
        .gjs-custom-panel .gjs-layers,
        .gjs-custom-panel .gjs-layer {
          background: transparent !important;
          color: hsl(var(--foreground)) !important;
          font-size: 11px;
        }
        .gjs-custom-panel .gjs-layer-title {
          background: transparent !important;
          border-bottom: 1px solid hsl(var(--border) / 0.5);
          padding: 5px 4px;
        }
        .gjs-custom-panel .gjs-layer.gjs-selected .gjs-layer-title,
        .gjs-custom-panel .gjs-layer-title:hover {
          background: hsl(var(--accent)) !important;
        }
        .gjs-custom-panel .gjs-layer-vis,
        .gjs-custom-panel .gjs-layer-caret {
          color: hsl(var(--muted-foreground)) !important;
        }

        /* ---- Traits panel (properties) ---- */
        .gjs-custom-panel .gjs-trt-traits {
          padding: 0;
        }
        .gjs-custom-panel .gjs-trt-trait {
          padding: 6px 2px;
          border-bottom: 1px solid hsl(var(--border) / 0.3);
          font-size: 11px;
          color: hsl(var(--foreground));
        }
        .gjs-custom-panel .gjs-trt-trait .gjs-label {
          font-weight: 600;
          color: hsl(var(--foreground));
          font-size: 11px;
          min-width: 70px;
        }
        .gjs-custom-panel .gjs-trt-trait input,
        .gjs-custom-panel .gjs-trt-trait select {
          background: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px !important;
          color: hsl(var(--foreground)) !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          height: 28px;
        }
        .gjs-custom-panel .gjs-trt-trait input:focus,
        .gjs-custom-panel .gjs-trt-trait select:focus {
          border-color: hsl(var(--ring)) !important;
          outline: none;
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
        }

        /* ---- Canvas selection & hover highlights ---- */
        .gjs-editor-wrap .gjs-selected {
          outline: 2px solid hsl(var(--primary)) !important;
          outline-offset: -1px;
        }
        .gjs-editor-wrap .gjs-hovered {
          outline: 1px dashed hsl(var(--primary) / 0.5) !important;
        }

        /* ---- Drop indicator (the big UX fix) ---- */
        .gjs-editor-wrap .gjs-placeholder,
        .gjs-editor-wrap .gjs-placeholder-int {
          background: hsl(var(--primary) / 0.15) !important;
          border: 2px dashed hsl(var(--primary)) !important;
          border-radius: 6px;
          min-height: 40px;
          transition: all 0.1s ease;
        }
        .gjs-editor-wrap .gjs-highlighter,
        .gjs-editor-wrap .gjs-highlighter-sel {
          outline: 2px solid hsl(var(--primary)) !important;
          outline-offset: 2px;
        }

        /* ---- Toolbar on selected element ---- */
        .gjs-editor-wrap .gjs-toolbar {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px;
          box-shadow: 0 2px 8px hsl(var(--foreground) / 0.08);
          padding: 2px;
        }
        .gjs-editor-wrap .gjs-toolbar-item {
          color: hsl(var(--foreground)) !important;
          padding: 3px 5px;
          border-radius: 4px;
          font-size: 12px;
        }
        .gjs-editor-wrap .gjs-toolbar-item:hover {
          background: hsl(var(--accent)) !important;
          color: hsl(var(--primary)) !important;
        }

        /* ---- Resize handles ---- */
        .gjs-editor-wrap .gjs-resizer-c {
          border: none !important;
        }
        .gjs-editor-wrap .gjs-resizer-h {
          width: 10px !important;
          height: 10px !important;
          background: hsl(var(--primary)) !important;
          border: 2px solid hsl(var(--background)) !important;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        /* ---- Badge (element type label) ---- */
        .gjs-editor-wrap .gjs-badge {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          border-radius: 4px;
          padding: 1px 6px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        /* ---- RTE toolbar ---- */
        .gjs-editor-wrap .gjs-rte-toolbar {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px;
          box-shadow: 0 4px 12px hsl(var(--foreground) / 0.08);
          padding: 2px 4px;
        }
        .gjs-editor-wrap .gjs-rte-action {
          color: hsl(var(--foreground)) !important;
          border-radius: 4px;
          font-size: 13px;
          padding: 2px 4px;
        }
        .gjs-editor-wrap .gjs-rte-active,
        .gjs-editor-wrap .gjs-rte-action:hover {
          background: hsl(var(--accent)) !important;
          color: hsl(var(--primary)) !important;
        }

        /* ---- Hide export/import/code/fullscreen default buttons ---- */
        .gjs-editor-wrap .gjs-pn-btn[title="Export"],
        .gjs-editor-wrap .gjs-pn-btn[title="Import"],
        .gjs-editor-wrap .gjs-pn-btn[title*="ode"],
        .gjs-editor-wrap .gjs-pn-btn[title="Fullscreen"] { display: none !important; }

        /* ---- Modal (if any opens) ---- */
        .gjs-editor-wrap .gjs-mdl-dialog {
          background: hsl(var(--card)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 8px;
          color: hsl(var(--foreground)) !important;
        }
        .gjs-editor-wrap .gjs-mdl-header {
          border-bottom: 1px solid hsl(var(--border)) !important;
          color: hsl(var(--foreground)) !important;
          font-weight: 600;
        }
        .gjs-editor-wrap .gjs-mdl-btn-close { color: hsl(var(--muted-foreground)) !important; }

        /* ---- Scrollbars ---- */
        .gjs-custom-panel::-webkit-scrollbar { width: 4px; }
        .gjs-custom-panel::-webkit-scrollbar-track { background: transparent; }
        .gjs-custom-panel::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 2px;
        }

        /* ---- Canvas frame ---- */
        .gjs-editor-wrap .gjs-frame-wrapper { background: hsl(var(--muted) / 0.15) !important; }
      `}</style>
    </div>
  );
}
