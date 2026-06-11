"use client";

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";

import { ContentConverter } from "@/utils/content-converter";
import { cn } from "@/lib/utils";

interface InlineTipTapEditorProps {
  content: string;
  placeholder?: string;
  isEditable?: boolean;
  className?: string;
  editorClassName?: string;
  onEditorReady?: (editor: Editor | null) => void;
  onSave?: (markdown: string) => void | Promise<void>;
  autoSaveDelayMs?: number;
  onChange?: (markdown: string) => void;
  onFocus?: (editor: Editor) => void;
  onBlur?: () => void;
}

export function InlineTipTapEditor({
  content,
  placeholder = "Start writing...",
  isEditable = true,
  className,
  editorClassName,
  onEditorReady,
  onSave,
  autoSaveDelayMs,
  onChange,
  onFocus,
  onBlur,
}: InlineTipTapEditorProps) {
  const isInitializedRef = React.useRef(false);
  const lastSavedMarkdownRef = React.useRef<string>(content || "");
  const lastContentPropRef = React.useRef<string>(content || "");
  const isFocusedRef = React.useRef(false);
  const isDirtyRef = React.useRef(false);
  const isSavingRef = React.useRef(false);
  const saveAfterCurrentRef = React.useRef(false);
  const autoSaveTimeoutRef = React.useRef<number | null>(null);
  const editorRef = React.useRef<Editor | null>(null);

  const canonicalize = React.useCallback((value: string) => {
    return (value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u00A0/g, " ")
      .trimEnd();
  }, []);

  const syncLastSavedFromEditor = React.useCallback(
    (nextEditor: Editor | null) => {
      if (!nextEditor) return;
      const html = nextEditor.getHTML() || "";
      const markdown = canonicalize(ContentConverter.htmlToMarkdown(html));
      lastSavedMarkdownRef.current = markdown;
      isDirtyRef.current = false;
    },
    [canonicalize]
  );

  const clearPendingAutoSave = React.useCallback(() => {
    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, []);

  const saveIfNeeded = React.useCallback(async () => {
    if (!onSave) return;
    if (!isInitializedRef.current) return;

    if (isSavingRef.current) {
      saveAfterCurrentRef.current = true;
      return;
    }

    if (!isDirtyRef.current) return;

    const activeEditor = editorRef.current;
    if (!activeEditor) return;

    const html = activeEditor.getHTML() || "";
    const markdown = canonicalize(ContentConverter.htmlToMarkdown(html));
    const previous = canonicalize(lastSavedMarkdownRef.current);

    if (markdown === previous) {
      isDirtyRef.current = false;
      return;
    }

    isSavingRef.current = true;
    saveAfterCurrentRef.current = false;

    try {
      await onSave(markdown);
      lastSavedMarkdownRef.current = markdown;
    } finally {
      isSavingRef.current = false;

      const latestEditor = editorRef.current;
      const latestHtml = latestEditor?.getHTML() || "";
      const latestMarkdown = canonicalize(ContentConverter.htmlToMarkdown(latestHtml));
      isDirtyRef.current = latestMarkdown !== canonicalize(lastSavedMarkdownRef.current);

      if ((saveAfterCurrentRef.current || isDirtyRef.current) && !!autoSaveDelayMs && autoSaveDelayMs > 0) {
        clearPendingAutoSave();
        autoSaveTimeoutRef.current = window.setTimeout(() => {
          autoSaveTimeoutRef.current = null;
          void saveIfNeeded();
        }, autoSaveDelayMs);
      }
    }
  }, [autoSaveDelayMs, canonicalize, clearPendingAutoSave, onSave]);

  const scheduleAutoSave = React.useCallback(() => {
    if (!onSave) return;
    if (!autoSaveDelayMs || autoSaveDelayMs <= 0) return;

    clearPendingAutoSave();
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      autoSaveTimeoutRef.current = null;
      void saveIfNeeded();
    }, autoSaveDelayMs);
  }, [autoSaveDelayMs, clearPendingAutoSave, onSave, saveIfNeeded]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      BulletList.configure({ keepMarks: true, keepAttributes: false }),
      OrderedList.configure({ keepMarks: true, keepAttributes: false }),
      ListItem,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: "",
    editable: isEditable,
    onUpdate: ({ editor, transaction }) => {
      if (transaction.docChanged) {
        isDirtyRef.current = true;
        if (onChange && isInitializedRef.current) {
          const html = editor.getHTML() || "";
          const markdown = canonicalize(ContentConverter.htmlToMarkdown(html));
          onChange(markdown);
        }
        if (isInitializedRef.current) {
          scheduleAutoSave();
        }
      }
    },
    onFocus: ({ editor }) => {
      isFocusedRef.current = true;
      onFocus?.(editor);
    },
    onBlur: async () => {
      isFocusedRef.current = false;
      onBlur?.();

      if (!onSave) return;
      if (!isInitializedRef.current) return;
      if (autoSaveDelayMs && autoSaveDelayMs > 0) return;

      await saveIfNeeded();
    },
    editorProps: {
      attributes: {
        class: cn(
          "tiptap-content",
          "min-h-80 w-full rounded-md border bg-background p-3 text-sm outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          editorClassName
        ),
      },
    },
  });

  React.useEffect(() => {
    editorRef.current = editor;
    onEditorReady?.(editor);
    return () => {
      editorRef.current = null;
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  React.useEffect(() => {
    if (!editor) return;

    editor.setEditable(isEditable);
  }, [editor, isEditable]);

  React.useEffect(() => {
    if (!editor) return;

    const next = content || "";

    if (!isInitializedRef.current) {
      editor.commands.setContent(ContentConverter.normalizeForDisplay(next), { emitUpdate: false });
      isInitializedRef.current = true;
      syncLastSavedFromEditor(editor);
      lastContentPropRef.current = next;
      return;
    }

    if (isFocusedRef.current) return;
    if (next === lastContentPropRef.current) return;

    clearPendingAutoSave();
    lastContentPropRef.current = next;
    editor.commands.setContent(ContentConverter.normalizeForDisplay(next), { emitUpdate: false });
    syncLastSavedFromEditor(editor);
  }, [clearPendingAutoSave, editor, content, syncLastSavedFromEditor]);

  React.useEffect(() => {
    return () => {
      clearPendingAutoSave();
    };
  }, [clearPendingAutoSave]);

  React.useEffect(() => {
    return () => {
      if (!autoSaveDelayMs || autoSaveDelayMs <= 0) return;
      if (!isDirtyRef.current) return;

      clearPendingAutoSave();
      void saveIfNeeded();
    };
  }, [autoSaveDelayMs, clearPendingAutoSave, saveIfNeeded]);

  return (
    <div className={cn("w-full", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
