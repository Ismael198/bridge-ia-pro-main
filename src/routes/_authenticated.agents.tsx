import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { agents } from "@/lib/mock-data";
import { Plus, Copy, Trash2, Edit3, X, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agents")({
  component: Agents,
  head: () => ({ meta: [{ title: "Agentes & Chaves — Gerencie Pedido Connect" }] }),
});

function Agents() {
  const [open, setOpen] = useState(false);
  return (
    <AppShell title="Agentes & Chaves" subtitle="Gere e revogue chaves de acesso para seus agentes de IA.">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{agents.length} agentes conectados</p>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-medium text-sm shadow-glow inline-flex items-center gap-2">
          <Plus className="size-4" /> Nova chave
        </button>
      </div>

      <div className="rounded-xl border border-border bg-gradient-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-background/40">
            <tr>
              <th className="text-left font-medium px-5 py-3">Agente</th>
              <th className="text-left font-medium px-5 py-3">Tipo</th>
              <th className="text-left font-medium px-5 py-3">Marketplace</th>
              <th className="text-left font-medium px-5 py-3">Chave</th>
              <th className="text-left font-medium px-5 py-3">Permissões</th>
              <th className="text-left font-medium px-5 py-3">Criada</th>
              <th className="text-left font-medium px-5 py-3">Status</th>
              <th className="text-right font-medium px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-background/30">
                <td className="px-5 py-3 font-medium">{a.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{a.type}</td>
                <td className="px-5 py-3 text-muted-foreground">{a.marketplace}</td>
                <td className="px-5 py-3 font-mono text-xs">{a.key}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {a.scopes.map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{a.created}</td>
                <td className="px-5 py-3"><StatusBadge status={a.active ? "active" : "paused"} /></td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button className="size-8 grid place-items-center rounded-md hover:bg-muted" title="Copiar"><Copy className="size-3.5" /></button>
                    <button className="size-8 grid place-items-center rounded-md hover:bg-muted" title="Editar"><Edit3 className="size-3.5" /></button>
                    <button className="size-8 grid place-items-center rounded-md hover:bg-destructive/15 text-destructive" title="Revogar"><Trash2 className="size-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <NewKeyModal onClose={() => setOpen(false)} />}
    </AppShell>
  );
}

function NewKeyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary/15 text-primary grid place-items-center"><KeyRound className="size-4" /></div>
            <div>
              <div className="font-display font-semibold">Nova chave de agente</div>
              <div className="text-xs text-muted-foreground">Gere uma chave segura e revogável</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-md hover:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Nome do agente"><input defaultValue="Atendimento Pro" className="w-full h-10 rounded-lg bg-input border border-border px-3 text-sm outline-none" /></Field>
          <Field label="Marketplace">
            <select className="w-full h-10 rounded-lg bg-input border border-border px-3 text-sm outline-none">
              <option>Mercado Livre</option>
              <option>Shopee</option>
            </select>
          </Field>
          <Field label="Escopos de acesso">
            <div className="grid grid-cols-2 gap-2">
              {["read:orders", "write:orders", "read:listings", "write:listings", "read:messages", "write:messages"].map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm p-2 rounded-md border border-border bg-background/40">
                  <input type="checkbox" defaultChecked={s.startsWith("read")} className="accent-primary" />
                  <span className="font-mono text-xs">{s}</span>
                </label>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiração">
              <select className="w-full h-10 rounded-lg bg-input border border-border px-3 text-sm outline-none">
                <option>30 dias</option><option>90 dias</option><option>1 ano</option><option>Nunca</option>
              </select>
            </Field>
            <Field label="Observação">
              <input placeholder="Ex: Bot de atendimento WhatsApp" className="w-full h-10 rounded-lg bg-input border border-border px-3 text-sm outline-none" />
            </Field>
          </div>
        </div>
        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm">Cancelar</button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow">Gerar chave</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
