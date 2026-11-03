"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { LogoutButton } from "@/app/admin/logout-button";
import { iconButtonClassName } from "@/components/button";
import { cn } from "@/components/cn";
import { NavItem } from "@/components/nav-item";
import { Pill } from "@/components/pill";

/**
 * The admin shell below `lg`: the 264px sidebar becomes an off-canvas overlay
 * with a scrim. The open state lives here, in a client component, and the
 * closed default is encoded in the `lg:` classes below, so the first paint is
 * already correct — nothing is measured in JavaScript.
 */
const SIDEBAR_ID = "admin-sidebar";

type AdminSidebarState = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const SidebarContext = createContext<AdminSidebarState | null>(null);

export function useAdminSidebar(): AdminSidebarState {
  const value = useContext(SidebarContext);
  if (value === null) {
    throw new Error("The admin sidebar toggle must be rendered inside <AdminShell>.");
  }
  return value;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);

  // Below `lg` the sidebar is an overlay, so a navigation has to dismiss it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <SidebarContext value={{ open, toggle, close }}>
      <div className="min-h-screen lg:flex">
        <div
          aria-hidden="true"
          onClick={close}
          className={cn(
            "fixed inset-0 z-30 bg-canvas/80 lg:hidden",
            open ? "block" : "hidden",
          )}
        />

        <aside
          id={SIDEBAR_ID}
          aria-label="Navegación del panel"
          className={cn(
            "fixed left-0 top-0 z-40 flex h-screen w-[264px] shrink-0 flex-col overflow-y-auto border-r border-line bg-surface",
            "motion-safe:transition-[transform,visibility] motion-safe:duration-[240ms] motion-safe:ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            open ? "visible translate-x-0" : "invisible -translate-x-full",
            // From `lg` up it is the same in-flow sticky column as before.
            "lg:visible lg:sticky lg:left-auto lg:top-0 lg:z-auto lg:translate-x-0 lg:overflow-visible lg:transition-none",
          )}
        >
          <div className="flex h-[72px] shrink-0 items-center gap-2 px-6">
            <Link
              href="/admin"
              className="font-display text-title font-semibold tracking-[-0.03em] text-bone"
            >
              shorturl
            </Link>
            <Pill className="text-sage">v1</Pill>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-4 py-3">
            <NavItem href="/admin">Panel</NavItem>
            <NavItem href="/admin/links">Links</NavItem>
            <NavItem href="/admin/analytics">Analíticas</NavItem>
          </nav>

          {/* S16: there is no user model, so the footer names the role, not a
              person, and offers the only account action that exists. */}
          <div className="flex items-center justify-between border-t border-line px-6 py-5">
            <div className="flex flex-col">
              <span className="text-small font-semibold leading-tight text-bone">
                Dueño
              </span>
              <span className="mt-0.5 text-micro font-medium uppercase text-sage-dim">
                Sesión de 7 días
              </span>
            </div>
            <LogoutButton />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </SidebarContext>
  );
}

/** The top bar's menu button. Hidden from `lg` up, where the sidebar is always there. */
export function AdminSidebarToggle() {
  const { open, toggle } = useAdminSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? "Cerrar menú" : "Abrir menú"}
      aria-expanded={open}
      aria-controls={SIDEBAR_ID}
      className={iconButtonClassName("lg:hidden")}
    >
      {open ? <CloseIcon /> : <MenuIcon />}
    </button>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      className="size-4"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      className="size-4"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
