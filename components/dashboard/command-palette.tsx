"use client";

import { useRouter } from "next/navigation";
import { LogOut, Plus } from "lucide-react";
import { useEffect, useTransition } from "react";
import { signOutAction } from "@/app/dashboard/actions";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/components/dashboard/nav";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Paleta de comandos"
      description="Busca una sección o acción"
      className="border-white/10 bg-[#0e0e15]/95 backdrop-blur-xl"
    >
      <CommandInput placeholder="Buscar sección o acción…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Navegar">
          {NAV_ITEMS.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem key={n.href} value={`${n.label} ${n.description}`} onSelect={() => go(n.href)}>
                <Icon className="size-4" />
                <span>{n.label}</span>
                <span className="ml-2 truncate text-xs text-white/40">{n.description}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Acciones">
          <CommandItem value="nueva orden crear" onSelect={() => go("/dashboard/kanban?new=1")}>
            <Plus className="size-4" /> Nueva orden
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="cerrar sesion salir"
            onSelect={() => {
              onOpenChange(false);
              startTransition(() => signOutAction());
            }}
          >
            <LogOut className="size-4" /> Cerrar sesión
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
