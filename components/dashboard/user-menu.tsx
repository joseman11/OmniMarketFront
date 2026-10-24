"use client";

import Link from "next/link";
import { ChevronsUpDown, Home, LogOut } from "lucide-react";
import { useTransition } from "react";
import { signOutAction } from "@/app/dashboard/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { avatarDataUri } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export type ShellUser = { name: string; email?: string | null; image?: string | null; role: string };

export function UserAvatar({ user, className }: { user: ShellUser; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.image || avatarDataUri(user.name)}
      alt=""
      referrerPolicy="no-referrer"
      className={cn("size-8 shrink-0 rounded-full border border-white/10 object-cover", className)}
    />
  );
}

export function UserMenu({ user, collapsed }: { user: ShellUser; collapsed?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="user-menu"
        aria-label={`Menú de ${user.name}`}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2 text-left transition hover:bg-white/[0.05]",
          collapsed && "justify-center border-transparent bg-transparent p-1",
        )}
      >
        <span className="relative">
          <UserAvatar user={user} />
          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-sidebar bg-success" />
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{user.name}</span>
              <span className="block truncate text-xs text-white/45">{user.role}</span>
            </span>
            <ChevronsUpDown className="size-4 text-white/40" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium text-white">{user.name}</div>
          {user.email && <div className="truncate text-xs text-white/50">{user.email}</div>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <Home className="size-4" /> Ir a la landing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          data-testid="sign-out"
          disabled={pending}
          onSelect={() => startTransition(() => signOutAction())}
        >
          <LogOut className="size-4" /> {pending ? "Cerrando sesión…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
