"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Pilcrow,
  Heading1,
  Heading2,
  PaintBucket,
  FileUp,
} from "lucide-react";
import {
  extractArticleText,
  normalizeArticleContent,
} from "@/lib/articleContent.shared";

const TOOLBAR_BUTTON =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700";

export default function ArticleRichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
}) {
  const editorRef = useRef(null);
  const importInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const normalized = normalizeArticleContent(value || "");
    if (editorRef.current.innerHTML !== normalized) {
      editorRef.current.innerHTML = normalized;
    }
  }, [value]);

  const syncEditorValue = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (command, commandValue = null) => {
    if (disabled) return;
    focusEditor();
    document.execCommand(command, false, commandValue);
    syncEditorValue();
  };

  const handleImportDocx = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const mammoth = await import("mammoth/mammoth.browser");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const importedHtml = result.value?.trim();

      if (editorRef.current) {
        editorRef.current.innerHTML = importedHtml || "";
      }

      onChange(importedHtml || "");
      focusEditor();
    } catch (error) {
      console.error("DOCX import failed:", error);
      window.alert("The Word file could not be imported. Please try pasting the content directly.");
    } finally {
      event.target.value = "";
      setImporting(false);
    }
  };

  const textLength = extractArticleText(value || "").length;

  return (
    <div className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-3">
        <button type="button" className={TOOLBAR_BUTTON} onClick={() => runCommand("bold")} disabled={disabled} title="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON} onClick={() => runCommand("italic")} disabled={disabled} title="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON} onClick={() => runCommand("underline")} disabled={disabled} title="Underline">
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON} onClick={() => runCommand("insertUnorderedList")} disabled={disabled} title="Bullet List">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON} onClick={() => runCommand("insertOrderedList")} disabled={disabled} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON} onClick={() => runCommand("formatBlock", "P")} disabled={disabled} title="Paragraph">
          <Pilcrow className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON} onClick={() => runCommand("formatBlock", "H1")} disabled={disabled} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </button>
        <button type="button" className={TOOLBAR_BUTTON} onClick={() => runCommand("formatBlock", "H2")} disabled={disabled} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </button>
        <label className={`${TOOLBAR_BUTTON} cursor-pointer`}>
          <PaintBucket className="h-4 w-4" />
          <input
            type="color"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => runCommand("foreColor", event.target.value)}
            title="Text Color"
          />
        </label>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            disabled={disabled || importing}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileUp className="h-4 w-4" />
            {importing ? "Importing..." : "Import .docx"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleImportDocx}
          />
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={syncEditorValue}
        className="article-editor min-h-[320px] px-4 py-4 text-gray-800 focus:outline-none"
        data-placeholder={placeholder}
      />

      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
        <span>Paste directly from Word to keep headings, bold text, lists, and colors.</span>
        <span>{textLength} visible characters</span>
      </div>
    </div>
  );
}
