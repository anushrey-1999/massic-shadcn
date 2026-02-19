"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bold,
  Copy,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
  Globe,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Typography } from "@/components/ui/typography";
import { useWebActionContentQuery, useWebPageActions, type WebActionType } from "@/hooks/use-web-page-actions";
import { copyToClipboard } from "@/utils/clipboard";
import { cleanEscapedContent } from "@/utils/content-cleaner";
import { InlineTipTapEditor } from "@/components/ui/inline-tiptap-editor";

function getTypeFromIntent(intent: string | null): WebActionType {
  return (intent || "").toLowerCase() === "informational" ? "blog" : "page";
}

export function WebBlogView({ businessId, pageId }: { businessId: string; pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const keyword = searchParams.get("keyword") || "";
  const type = getTypeFromIntent(intent);

  const { updateBlogContent, updatePageContent } = useWebPageActions();

  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const isInitialLoadRef = React.useRef(true);
  const lastStatusRef = React.useRef<string>("");
  const [pollingDisabled, setPollingDisabled] = React.useState(false);

  const [mainContent, setMainContent] = React.useState("");
  const [metaDescription, setMetaDescription] = React.useState("");
  const [citations, setCitations] = React.useState<string[]>([]);

  const lastSavedMainRef = React.useRef<string>("");
  const lastSavedMetaRef = React.useRef<string>("");

  const canonicalize = React.useCallback((value: string) => {
    return (value || "").replace(/\r\n/g, "\n").replace(/\u00A0/g, " ").trimEnd();
  }, []);

  const [mainEditor, setMainEditor] = React.useState<Editor | null>(null);

  const contentQuery = useWebActionContentQuery({
    type,
    businessId,
    pageId,
    enabled: !!businessId && !!pageId,
    pollingDisabled,
    pollingIntervalMs: 6000,
  });

  const data = contentQuery.data;

  React.useEffect(() => {
    if (!data) return;

    const status = (data?.status || "").toString().toLowerCase();
    const prevStatus = lastStatusRef.current;
    const wasPolling = prevStatus === "pending" || prevStatus === "processing";
    const isPolling = status === "pending" || status === "processing";
    const transitionedFromPollingToTerminal = wasPolling && !isPolling;

    const editorFocused = !!mainEditor?.isFocused;
    const shouldSyncFromServer =
      !editorFocused && (isInitialLoadRef.current || isPolling || transitionedFromPollingToTerminal);

    lastStatusRef.current = status;
    if (!shouldSyncFromServer) return;

    if (type === "blog") {
      const blogData = data?.output_data?.page?.blog;
      const rawBlog =
        typeof blogData === "string" ? blogData : (blogData?.blog_post || "");
      const rawMeta =
        typeof blogData === "object" && blogData !== null
          ? blogData?.meta_description || ""
          : "";
      const rawCitations =
        typeof blogData === "object" && blogData !== null && Array.isArray(blogData?.citations)
          ? blogData.citations
          : [];

      setMainContent(cleanEscapedContent(rawBlog));
      setMetaDescription(cleanEscapedContent(rawMeta));
      setCitations(Array.isArray(rawCitations) ? rawCitations : []);

      lastSavedMainRef.current = canonicalize(cleanEscapedContent(rawBlog));
      lastSavedMetaRef.current = canonicalize(cleanEscapedContent(rawMeta));
    } else {
      const rawPage = data?.output_data?.page?.page_content?.page_content || "";
      setMainContent(cleanEscapedContent(rawPage));
      setMetaDescription("");
      setCitations([]);

      lastSavedMainRef.current = canonicalize(cleanEscapedContent(rawPage));
      lastSavedMetaRef.current = "";
    }

    if (isInitialLoadRef.current) {
      window.setTimeout(() => {
        isInitialLoadRef.current = false;
        setIsInitialLoad(false);
      }, 250);
    }
  }, [data, type, mainEditor]);

  React.useEffect(() => {
    const status = (data?.status || "").toString().toLowerCase();
    if (status !== "pending") {
      setPollingDisabled(false);
    }
  }, [data?.status]);

  React.useEffect(() => {
    if (!data) return;
    const status = (data?.status || "").toString().toLowerCase();
    if (status !== "pending") return;

    const timeout = window.setTimeout(() => {
      setPollingDisabled(true);
      toast.warning("Generation seems to be stuck. Please try again.");
    }, 300000);

    return () => window.clearTimeout(timeout);
  }, [data?.status]);

  const status = (data?.status || "").toString().toLowerCase();
  const isProcessing = status === "pending" || status === "processing";

  const typeLabel = type === "blog" ? "blog" : "page";
  const outlineFromServer = cleanEscapedContent(data?.output_data?.page?.outline || "");
  const hasOutline = !!outlineFromServer && outlineFromServer.trim().length > 0;

  const handleCopyAll = async () => {
    if (mainEditor) {
      const htmlContent = mainEditor.getHTML();
      if (htmlContent && htmlContent.trim()) {
        try {
          if (typeof ClipboardItem !== "undefined") {
            const clipboardItem = new ClipboardItem({
              "text/html": new Blob([htmlContent], { type: "text/html" }),
              "text/plain": new Blob([mainEditor.getText()], { type: "text/plain" }),
            });
            await navigator.clipboard.write([clipboardItem]);
          } else {
            await navigator.clipboard.writeText(mainEditor.getText());
          }
          toast.success("Copied");
          return;
        } catch {
          try {
            await navigator.clipboard.writeText(mainEditor.getText());
            toast.success("Copied");
            return;
          } catch {
            toast.error("Copy failed");
            return;
          }
        }
      }
    }

    const ok = await copyToClipboard(mainContent || "");
    if (ok) toast.success("Copied");
    else toast.error("Copy failed");
  };

  const handleCopyMeta = async () => {
    const ok = await copyToClipboard(metaDescription || "");
    if (ok) toast.success("Copied");
    else toast.error("Copy failed");
  };

  const handleCopyCitations = async () => {
    const ok = await copyToClipboard((citations || []).join("\n"));
    if (ok) toast.success("Copied");
    else toast.error("Copy failed");
  };

  const handleSaveMainContent = async (markdown: string) => {
    if (isInitialLoad) return;

    const next = canonicalize(markdown);
    if (next === canonicalize(lastSavedMainRef.current)) return;

    try {
      if (type === "blog") {
        await updateBlogContent(businessId, pageId, {
          blog_post: next,
          meta_description: metaDescription,
        });
      } else {
        await updatePageContent(businessId, pageId, next);
      }
      lastSavedMainRef.current = next;
      setMainContent(next);
      toast.success("Changes Saved");
    } catch {
      toast.error("Failed to save changes to server");
    }
  };

  const handleMetaBlur = async () => {
    if (isInitialLoad) return;
    if (type !== "blog") return;

    const nextMeta = canonicalize(metaDescription);
    if (nextMeta === canonicalize(lastSavedMetaRef.current)) return;

    try {
      await updateBlogContent(businessId, pageId, {
        blog_post: mainContent,
        meta_description: nextMeta,
      });
      lastSavedMetaRef.current = nextMeta;
      toast.success("Changes Saved");
    } catch {
      toast.error("Failed to save changes to server");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Typography variant="muted" className="text-xs">
            {searchParams.get("totalPages") ? `${searchParams.get("totalPages")} total pages` : ""}
          </Typography>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Typography variant="h4">{type === "blog" ? "Blog" : "Page"}</Typography>
            {keyword ? (
              <Typography variant="muted" className="mt-1">
                {keyword}
              </Typography>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCopyAll} disabled={isProcessing}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            {/* <Button className="gap-2" type="button" disabled title="Coming soon" aria-disabled="true">
              <Globe className="h-4 w-4" />
              <span>Publish</span>
              <span className="ml-1 text-xs font-normal text-muted-foreground">Coming soon</span>
            </Button> */}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {isProcessing ? (
          <Card className="p-4">
            <Typography>
              We’re generating your content. This may take 1-3 minutes. Please wait
              <span className="dot-animate"> ...</span>
            </Typography>
            <style>{`
              .dot-animate { display: inline-block; width: 1.5em; text-align: left; }
              .dot-animate::after { content: ''; animation: dots 1.2s steps(3, end) infinite; }
              @keyframes dots { 0%, 20% { content: ''; } 40% { content: '.'; } 60% { content: '..'; } 80%, 100% { content: '...'; } }
            `}</style>
          </Card>
        ) : null}

        {status === "error" ? (
          <Card className="p-4">
            <Typography variant="h5" className="text-destructive">
              Error Loading Content
            </Typography>
            <Typography className="mt-2">{data?.message || "There was a problem loading the content."}</Typography>
          </Card>
        ) : null}

        {!isProcessing && status !== "error" ? (
          <>
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 border rounded-md px-2 py-1">
                {[Bold, Italic, Underline, Strikethrough, Quote, List, ListOrdered, Link2].map((Icon, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="icon"
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!mainEditor) return;

                      switch (idx) {
                        case 0:
                          mainEditor.chain().focus().toggleBold().run();
                          break;
                        case 1:
                          mainEditor.chain().focus().toggleItalic().run();
                          break;
                        case 2:
                          mainEditor.chain().focus().toggleUnderline().run();
                          break;
                        case 3:
                          mainEditor.chain().focus().toggleStrike().run();
                          break;
                        case 4:
                          mainEditor.chain().focus().toggleBlockquote().run();
                          break;
                        case 5:
                          mainEditor.chain().focus().toggleBulletList().run();
                          break;
                        case 6:
                          mainEditor.chain().focus().toggleOrderedList().run();
                          break;
                        case 7: {
                          const url = window.prompt("Enter URL:");
                          if (url) {
                            mainEditor.chain().focus().setLink({ href: url }).run();
                          }
                          break;
                        }
                      }
                    }}
                    disabled={!mainEditor}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>

              <InlineTipTapEditor
                content={mainContent}
                onEditorReady={setMainEditor}
                onSave={handleSaveMainContent}
                placeholder={type === "blog" ? "Write your blog content here..." : "Write your page content here..."}
              />
            </Card>

            {type === "blog" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Typography variant="h6">Meta Description</Typography>
                    <Button variant="ghost" size="icon" onClick={handleCopyMeta} type="button">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    onBlur={handleMetaBlur}
                    placeholder="Write your meta description here..."
                    className="min-h-[120px]"
                  />
                </Card>

                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Typography variant="h6">Suggested Citations</Typography>
                    <Button variant="ghost" size="icon" onClick={handleCopyCitations} type="button">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {(citations || []).length > 0 ? citations.map((c) => `• ${c}`).join("\n") : ""}
                  </div>
                </Card>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
