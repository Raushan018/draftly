"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Files, FileText, Menu, Users, X } from "lucide-react";
import { createDocument } from "@/actions/documents";
import { UserSwitcher } from "@/components/layout/UserSwitcher";
import { UploadDialog } from "@/components/layout/UploadDialog";
import { NewDocumentForm } from "@/components/layout/NewDocumentButton";

type User = { id: string; name: string; email: string };

const NAV_ITEMS = [
  { href: "/documents", label: "My Documents", icon: Files },
  { href: "/documents/shared", label: "Shared With Me", icon: Users },
];

export function AppShell({
  currentUser,
  users,
  children,
}: {
  currentUser: User;
  users: User[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col px-4">
      <div className="flex items-center gap-2 pb-6 pt-6">
        <FileText className="h-5 w-5 text-accent" />
        <span className="font-serif text-lg tracking-tight text-ink">Draftly</span>
      </div>

      <NewDocumentForm action={createDocument} />

      <nav className="mt-6 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:bg-surface hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        <UploadDialog />
      </nav>

      <div className="mt-auto border-t border-border py-3">
        <UserSwitcher currentUser={currentUser} users={users} />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-bg px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" />
          <span className="font-serif text-lg tracking-tight text-ink">Draftly</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-ink outline-none transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <aside className="hidden w-64 shrink-0 border-r border-border md:block">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/20" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-bg">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1.5 text-ink-muted outline-none transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="h-full min-w-0 flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
