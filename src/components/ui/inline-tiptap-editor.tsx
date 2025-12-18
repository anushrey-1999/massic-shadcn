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
  onFocus,
  onBlur,
}: InlineTipTapEditorProps) {
  const isInitializedRef = React.useRef(false);
  const lastSavedMarkdownRef = React.useRef<string>(content || "");
  const lastContentPropRef = React.useRef<string>(content || "");
  const isFocusedRef = React.useRef(false);
  const isDirtyRef = React.useRef(false);

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
    onUpdate: ({ transaction }) => {
      if (transaction.docChanged) {
        isDirtyRef.current = true;
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

      if (!isDirtyRef.current) return;

      const html = editor?.getHTML() || "";
      const markdown = canonicalize(ContentConverter.htmlToMarkdown(html));
      const previous = canonicalize(lastSavedMarkdownRef.current);

      if (markdown === previous) {
        isDirtyRef.current = false;
        return;
      }

      lastSavedMarkdownRef.current = markdown;
      isDirtyRef.current = false;
      await onSave(markdown);
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
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
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

    lastContentPropRef.current = next;
    editor.commands.setContent(ContentConverter.normalizeForDisplay(next), { emitUpdate: false });
    syncLastSavedFromEditor(editor);
  }, [editor, content]);

  return (
    <div className={cn("w-full", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
