import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Plug, KeyRound, MessageSquare, Image as ImageIcon,
  Package, ShoppingBag, ScrollText, Sparkles,
} from "lucide-react";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/marketplaces", label: "Marketplaces", icon: Plug },
  { to: "/agents", label: "Agentes & Chaves", icon: KeyRound },
  { to: "/listings", label: "Anúncios", icon: Package },
  { to: "/orders", label: "Vendas", icon: ShoppingBag },
  { to: "/chat", label: "Chat IA", icon: MessageSquare },
  { to: "/photos", label: "Fotos com IA", icon: ImageIcon },
  { to: "/logs", label: "Logs & Auditoria", icon: ScrollText },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
        <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
          <Sparkles className="size-4 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-sm font-semibold text-sidebar-foreground">Gerencie Pedido</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Connect</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="size-4" />
              {it.label}
              {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="rounded-xl bg-gradient-card border border-sidebar-border p-3">
          <div className="text-xs text-muted-foreground">Plano</div>
          <div className="text-sm font-medium text-sidebar-foreground">Starter</div>
          <button className="mt-2 w-full text-xs rounded-md bg-gradient-primary text-primary-foreground py-1.5 font-medium">
            Fazer upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}
