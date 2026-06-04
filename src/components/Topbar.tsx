import { Bell, LogOut, Search } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const initial = (user?.user_metadata?.full_name || user?.email || "U")[0]?.toUpperCase();

  return (
    <header className="h-16 shrink-0 border-b border-border bg-background/60 backdrop-blur sticky top-0 z-10">
      <div className="h-full flex items-center gap-4 px-6">
        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-sm w-72">
            <Search className="size-4 text-muted-foreground" />
            <input className="bg-transparent outline-none flex-1 placeholder:text-muted-foreground" placeholder="Buscar pedidos, anúncios, agentes..." />
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5">⌘K</kbd>
          </div>
          <ThemeToggle />
          <button className="size-9 grid place-items-center rounded-lg border border-border hover:bg-muted" aria-label="Notificações">
            <Bell className="size-4" />
          </button>
          <button
            onClick={async () => { await signOut(); router.navigate({ to: "/login" }); }}
            className="size-9 grid place-items-center rounded-lg border border-border hover:bg-muted"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </button>
          <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm" title={user?.email ?? ""}>
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
