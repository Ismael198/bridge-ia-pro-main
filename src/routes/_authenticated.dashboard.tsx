import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Plug, KeyRound, Package, MessageSquare, ShoppingBag, Plus, ArrowRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { marketplaces, recentEvents, salesChart, questions } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Gerencie Pedido Connect" }] }),
});

function Dashboard() {
  return (
    <AppShell title="Visão geral" subtitle="Olá Gabriel, aqui está o resumo do seu negócio hoje.">
      <div className="flex flex-wrap gap-3">
        <Link to="/marketplaces" className="px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-medium text-sm shadow-glow inline-flex items-center gap-2">
          <Plus className="size-4" /> Conectar marketplace
        </Link>
        <Link to="/agents" className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium inline-flex items-center gap-2">
          <KeyRound className="size-4" /> Gerar chave de agente
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Marketplaces" value="2" delta={0} icon={Plug} accent="primary" />
        <StatCard label="Agentes ativos" value="3" delta={50} icon={KeyRound} accent="accent" />
        <StatCard label="Anúncios ativos" value="211" delta={8} icon={Package} accent="success" />
        <StatCard label="Perguntas pendentes" value="7" delta={-12} icon={MessageSquare} accent="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Vendas da semana</h3>
              <p className="text-xs text-muted-foreground">Comparativo por marketplace</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: "var(--color-chart-1)" }} />Mercado Livre</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: "var(--color-chart-3)" }} />Shopee</span>
            </div>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChart}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="ml" stroke="var(--color-chart-1)" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="shopee" stroke="var(--color-chart-3)" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5 shadow-card">
          <h3 className="font-display font-semibold">Eventos recentes</h3>
          <ul className="mt-4 space-y-3">
            {recentEvents.map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <div className={`size-8 shrink-0 rounded-lg grid place-items-center ${
                  e.type === "sale" ? "bg-success/15 text-success" :
                  e.type === "agent" ? "bg-accent/15 text-accent" :
                  e.type === "key" ? "bg-primary/15 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {e.type === "sale" ? <ShoppingBag className="size-4" /> :
                   e.type === "agent" ? <MessageSquare className="size-4" /> :
                   e.type === "key" ? <KeyRound className="size-4" /> :
                   <Plug className="size-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{e.text}</p>
                  <p className="text-xs text-muted-foreground">{e.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Status das integrações</h3>
            <Link to="/marketplaces" className="text-xs text-primary inline-flex items-center gap-1">Ver tudo <ArrowRight className="size-3" /></Link>
          </div>
          <ul className="mt-4 space-y-3">
            {marketplaces.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/40">
                <div className="size-10 rounded-lg grid place-items-center font-semibold text-sm" style={{ background: `${m.color}22`, color: m.color }}>{m.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.account ?? "Não conectado"}{m.lastSync ? ` · ${m.lastSync}` : ""}</div>
                </div>
                <StatusBadge status={m.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Perguntas pendentes</h3>
            <Link to="/chat" className="text-xs text-primary inline-flex items-center gap-1">Responder com IA <ArrowRight className="size-3" /></Link>
          </div>
          <ul className="mt-4 space-y-3">
            {questions.map((q) => (
              <li key={q.id} className="p-3 rounded-lg border border-border bg-background/40">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{q.customer} · {q.product}</span>
                  <span>{q.time}</span>
                </div>
                <p className="mt-1 text-sm">{q.question}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
