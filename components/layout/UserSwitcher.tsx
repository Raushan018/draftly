"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronsUpDown } from "lucide-react";
import { switchUser } from "@/actions/session";

type User = { id: string; name: string; email: string };

function SwitchButton({ user, isCurrent }: { user: User; isCurrent: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={isCurrent || pending}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink outline-none transition-colors hover:bg-accent-soft focus-visible:bg-accent-soft disabled:cursor-default disabled:text-ink-muted disabled:hover:bg-transparent"
    >
      {pending && (
        <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      )}
      {user.name}
    </button>
  );
}

export function UserSwitcher({
  currentUser,
  users,
}: {
  currentUser: User;
  users: User[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = currentUser.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-full overflow-hidden rounded-md border border-border bg-surface shadow-sm">
          {users.map((user) => (
            <form key={user.id} action={switchUser}>
              <input type="hidden" name="userId" value={user.id} />
              <SwitchButton user={user} isCurrent={user.id === currentUser.id} />
            </form>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left outline-none transition-colors hover:border-border hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{currentUser.name}</span>
          <span className="block truncate text-xs text-ink-muted">{currentUser.email}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-muted" />
      </button>
    </div>
  );
}
