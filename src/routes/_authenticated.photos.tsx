import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Upload, Wand2, Download, ImageIcon, Trash2, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/photos")({
  component: Photos,
  head: () => ({ meta: [{ title: "Fotos com IA — Gerencie Pedido Connect" }] }),
});

const options = [
  { id: "bg", label: "Limpar fundo" },
  { id: "white", label: "Fundo branco realista" },
  { id: "light", label: "Ajuste de luz" },
  { id: "frame", label: "Enquadramento do produto" },
  { id: "standard", label: "Padronizar para marketplace" },
];

function Photos() {
  const [active, setActive] = useState<string[]>(["white", "light", "standard"]);
  const toggle = (id: string) => setActive((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);

  return (
    <AppShell title="Fotos com IA" subtitle="Transforme fotos de produto em imagens prontas para vender.">
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Panel label="Antes">
              <div className="aspect-square rounded-lg border-2 border-dashed border-border bg-background/40 grid place-items-center text-muted-foreground">
                <div className="text-center">
                  <Upload className="size-8 mx-auto" />
                  <p className="mt-3 text-sm">Arraste sua foto aqui</p>
                  <button className="mt-3 px-3 py-1.5 rounded-md text-xs border border-border hover:bg-muted">Selecionar arquivo</button>
                </div>
              </div>
            </Panel>
            <Panel label="Depois">
              <div className="aspect-square rounded-lg bg-gradient-card border border-border grid place-items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-hero opacity-50" />
                <ImageIcon className="size-12 text-primary relative" />
                <span className="absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">Otimizada</span>
              </div>
            </Panel>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-medium text-sm shadow-glow inline-flex items-center gap-2">
              <Wand2 className="size-4" /> Processar imagem
            </button>
            <button className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium inline-flex items-center gap-2">
              <Download className="size-4" /> Baixar imagem
            </button>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Histórico</h3>
              <span className="text-xs text-muted-foreground">8 processadas hoje</span>
            </div>
            <div className="mt-4 grid grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-background/60 border border-border relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-primary opacity-10" />
                  <button className="absolute top-1.5 right-1.5 size-6 rounded-md grid place-items-center bg-background/80 opacity-0 group-hover:opacity-100">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-gradient-card p-5 shadow-card space-y-4 h-fit">
          <div>
            <h3 className="font-display font-semibold">Opções</h3>
            <p className="text-xs text-muted-foreground">Selecione os ajustes para aplicar</p>
          </div>
          <div className="space-y-2">
            {options.map((o) => {
              const on = active.includes(o.id);
              return (
                <button key={o.id} onClick={() => toggle(o.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg border text-sm text-left ${on ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-background/40 text-muted-foreground hover:text-foreground"}`}>
                  <div className={`size-5 rounded-md grid place-items-center ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {on && <Check className="size-3" />}
                  </div>
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
            <p className="text-foreground font-medium">💡 Dica</p>
            <p className="mt-1">Padronize as fotos para aumentar conversão em até 27% no Mercado Livre.</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">{label}</div>
      {children}
    </div>
  );
}
