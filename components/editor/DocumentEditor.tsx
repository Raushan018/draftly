"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft,
  Bold as BoldIcon,
  Heading1,
  Heading2,
  Italic as ItalicIcon,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { renameDocument, updateDocumentContent } from "@/actions/documents";
import { ShareDialog } from "@/components/editor/ShareDialog";
import { EditableTitle } from "@/components/editor/EditableTitle";
import type { ShareTarget } from "@/lib/documents";

type SaveStatus = "saved" | "saving" | "error";
const AUTOSAVE_DELAY_MS = 800;

export function DocumentEditor({
  documentId,
  title: initialTitle,
  content,
  ownerName,
  canEdit,
  isOwner,
  shareTargets,
}: {
  documentId: string;
  title: string;
  content: unknown;
  ownerName: string;
  canEdit: boolean;
  isOwner: boolean;
  shareTargets: ShareTarget[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<JSONContent | null>(null);
  type PendingRetry = { type: "content"; json: JSONContent } | { type: "title"; title: string };
  const pendingRetryRef = useRef<PendingRetry | null>(null);

  const saveContent = useCallback(
    async (json: JSONContent) => {
      setStatus("saving");
      try {
        const result = await updateDocumentContent(documentId, json);
        if (result.ok) {
          pendingRetryRef.current = null;
          setStatus("saved");
        } else {
          pendingRetryRef.current = { type: "content", json };
          setStatus("error");
        }
      } catch {
        pendingRetryRef.current = { type: "content", json };
        setStatus("error");
      }
    },
    [documentId],
  );

  const saveTitle = useCallback(
    async (newTitle: string) => {
      setStatus("saving");
      try {
        const result = await renameDocument(documentId, newTitle);
        if (result.ok) {
          pendingRetryRef.current = null;
          setTitle(newTitle);
          setStatus("saved");
        } else {
          pendingRetryRef.current = { type: "title", title: newTitle };
          setStatus("error");
        }
      } catch {
        pendingRetryRef.current = { type: "title", title: newTitle };
        setStatus("error");
      }
    },
    [documentId],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    extensions: [StarterKit],
    content: content as JSONContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      latestContentRef.current = json;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => saveContent(json), AUTOSAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const retrySave = useCallback(() => {
    const pending = pendingRetryRef.current;
    if (!pending) return;
    if (pending.type === "content") {
      saveContent(pending.json);
    } else {
      saveTitle(pending.title);
    }
  }, [saveContent, saveTitle]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-muted outline-none transition-colors hover:bg-bg hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </button>
          <span className="h-5 w-px shrink-0 bg-border" />
          <EditableTitle title={title} editable={canEdit} onSave={saveTitle} />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <SaveIndicator status={status} onRetry={retrySave} />
          {isOwner && (
            <ShareDialog documentId={documentId} ownerName={ownerName} targets={shareTargets} />
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:px-10">
        <p className="text-sm text-ink-muted">
          {isOwner
            ? `Owned by ${ownerName}`
            : canEdit
              ? `Shared by ${ownerName} · Can edit`
              : `Shared by ${ownerName} · View only`}
        </p>

        {!editor ? (
          <>
            <div className="mt-4 h-10 animate-pulse rounded-md border border-border bg-surface" />
            <div className="mt-4 h-[60vh] animate-pulse rounded-lg border border-border bg-surface" />
          </>
        ) : (
          <>
            {canEdit && <Toolbar editor={editor} />}

            <div className="mt-4 min-h-[60vh] rounded-lg border border-border bg-surface px-5 py-8 shadow-sm sm:px-12 sm:py-10">
              <EditorContent editor={editor} className="tiptap-content" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface p-1">
      <ToolbarButton
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
        label="Paragraph"
      >
        <Pilcrow className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        label="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      >
        <BoldIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      >
        <ItalicIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        label="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton
        active={false}
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
        label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={false}
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
        label="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`rounded-md p-2 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-bg hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "saving") {
    return <span className="shrink-0 text-xs text-ink-muted">Saving…</span>;
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-sm text-xs font-medium text-danger underline decoration-danger/40 underline-offset-2 outline-none transition-colors hover:decoration-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Error saving · Retry
      </button>
    );
  }

  return <span className="shrink-0 text-xs text-ink-muted">Saved</span>;
}
