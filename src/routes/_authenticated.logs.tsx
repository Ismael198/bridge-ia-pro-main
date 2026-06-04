import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { auditLogs } from "@/lib/mock-data";
import { Search, Filter, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/logs")({
  component: Logs,
  head: () => ({ meta: [{ title: "Logs & Auditoria — Gerencie Pedido Connect" }] }),
});

function Logs() {
  return (
    <AppShell title="Logs & Auditoria" subtitle="Rastreio completo de todas as ações executadas pelos agentes.">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 rounded-lg bg-input border border-border px-3 h-10 flex-1 min-w-[240px]">
          <Search className="size-4 text-muted-foreground" />
          <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Buscar por agente, ação ou IP..." />
        </div>
        <button className="h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-sm inline-flex items-center gap-2">
          <Filter className="size-4" /> Filtros
        </button>
        <button className="h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-sm inline-flex items-center gap-2">
          <Download className="size-4" /> Exportar
        </button>
      </div>

      <div className="rounded-xl border border-border bg-gradient-card shadow-card overflow-hidden font-mono">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground uppercase tracking-wider bg-background/40">
            <tr>
              <th className="text-left font-medium px-5 py-3">Data/hora</th>
              <th className="text-left font-medium px-5 py-3">Agente</th>
              <th className="text-left font-medium px-5 py-3">Marketplace</th>
              <th className="text-left font-medium px-5 py-3">Ação</th>
              <th className="text-left font-medium px-5 py-3">Resultado</th>
              <th className="text-left font-medium px-5 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((l) => (
              <tr key={l.id} className="border-t border-border hover:bg-background/30">
                <td className="px-5 py-3 text-muted-foreground">{l.time}</td>
                <td className="px-5 py-3 font-sans font-medium">{l.agent}</td>
                <td className="px-5 py-3 font-sans text-muted-foreground">{l.marketplace}</td>
                <td className="px-5 py-3 text-primary">{l.action}</td>
                <td className="px-5 py-3"><StatusBadge status={l.result} /></td>
                <td className="px-5 py-3 text-muted-foreground">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
