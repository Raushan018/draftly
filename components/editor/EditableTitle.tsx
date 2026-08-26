"use client";

import { useEffect, useRef, useState } from "react";

const FALLBACK_TITLE = "Untitled document";

export function EditableTitle({
  title,
  editable,
  onSave,
}: {
  title: string;
  editable: boolean;
  onSave: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function saveAndClose(rawValue: string) {
    handledRef.current = true;
    const trimmed = rawValue.trim();
    const finalTitle = trimmed.length > 0 ? trimmed : FALLBACK_TITLE;
    setEditing(false);
    setValue(finalTitle);
    if (finalTitle !== title) {
      onSave(finalTitle);
    }
  }

  function cancelEdit() {
    handledRef.current = true;
    setValue(title);
    setEditing(false);
  }

  function handleBlur() {
    if (handledRef.current) {
      handledRef.current = false;
      return;
    }
    saveAndClose(value);
  }

  if (!editable) {
    return (
      <h1 className="truncate font-serif text-base text-ink sm:text-lg">{title}</h1>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            saveAndClose(value);
          } else if (event.key === "Escape") {
            event.preventDefault();
            cancelEdit();
          }
        }}
        className="-mx-1 min-w-0 flex-1 rounded-md border border-accent bg-transparent px-1 font-serif text-base text-ink outline-none sm:text-lg"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(title);
        setEditing(true);
      }}
      title="Click to rename"
      className="-mx-1 min-w-0 truncate rounded-md px-1 text-left font-serif text-base text-ink outline-none transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-lg"
    >
      {title}
    </button>
  );
}
