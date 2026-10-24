"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight, Menu, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { SidebarContent } from "@/components/dashboard/sidebar";
import { DashboardAccessProvider } from "@/components/dashboard/access-context";
import type { ShellUser } from "@/components/dashboard/user-menu";
import { titleFor } from "@/components/dashboard/nav";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { USE_MOCKS } from "@/lib/api/config";
import { useReturnFocus } from "@/lib/hooks/use-return-focus";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "omnimarket.sidebar.collapsed";

export function DashboardShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const paletteButtonRef = useRef<HTMLButtonElement>(null);
  const drawerReturnFocus = useReturnFocus(drawerOpen, menuButtonRef);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignorar */
      }
      return !c;
    });

  const section = titleFor(pathname);

  return (
    <DashboardAccessProvider canManageCatalog={user.canManageCatalog}>
    <div className="relative flex min-h-[100svh] bg-ink-2">
      <div aria-hidden="true" className="bg-grid pointer-events-none fixed inset-0 opacity-[0.35] [--grid-size:56px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />

      {/* Sidebar escritorio (≥1024 px) */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 264 }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        className="sticky top-0 z-30 hidden h-[100svh] shrink-0 border-r border-sidebar-border bg-sidebar/90 backdrop-blur-xl lg:block"
      >
        <SidebarContent user={user} collapsed={collapsed} onToggle={toggle} />
      </motion.aside>

      {/* Drawer tablet / móvil */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" onCloseAutoFocus={drawerReturnFocus} className="w-[280px] border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SheetDescription className="sr-only">Secciones del dashboard</SheetDescription>
          <SidebarContent user={user} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-2/70 px-4 backdrop-blur-xl md:px-6">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir navegación"
            className="grid size-9 place-items-center rounded-lg border border-white/10 text-white/70 hover:text-white lg:hidden"
          >
            <Menu className="size-4" />
          </button>
          <nav aria-label="Ruta de navegación" className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link href="/dashboard" className="text-subtle hover:text-white">
              OmniMarket
            </Link>
            <ChevronRight className="size-3.5 text-white/25" />
            <span aria-current="page" className="truncate font-medium text-white">
              {section}
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {USE_MOCKS && (
              <span
                title="NEXT_PUBLIC_USE_MOCKS=true: datos simulados en el navegador"
                className="hidden rounded-full border border-ember/30 bg-ember/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-ember sm:inline"
              >
                MOCK
              </span>
            )}
            <button
              ref={paletteButtonRef}
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Abrir paleta de comandos"
              className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-subtle transition hover:border-white/20 hover:text-white md:w-64"
            >
              <Search className="size-4" />
              <span className="hidden md:inline">Buscar o saltar a…</span>
              <kbd className="ml-auto hidden rounded border border-white/10 px-1.5 font-mono text-[10px] md:inline">⌘K</kbd>
            </button>
            <Link
              href="/dashboard/kanban?new=1"
              className={cn(
                "hidden h-9 items-center gap-1.5 rounded-lg border border-ember/40 bg-ember/10 px-3 text-sm font-medium text-ember transition hover:bg-ember/20 sm:flex",
              )}
            >
              <Plus className="size-4" /> Nueva orden
            </Link>
          </div>
        </header>

        <main id="contenido" className="relative min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} returnFocusRef={paletteButtonRef} />
    </div>
    </DashboardAccessProvider>
  );
}
