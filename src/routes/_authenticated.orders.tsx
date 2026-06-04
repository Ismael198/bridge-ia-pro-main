import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { orders, salesChart } from "@/lib/mock-data";
import { ShoppingBag, DollarSign, TrendingUp, Package } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/orders")({
  component: Orders,
  head: () => ({ meta: [{ title: "Vendas — Gerencie Pedido Connect" }] }),
});

function Orders() {
  return (
    <AppShell title="Vendas & Pedidos" subtitle="Acompanhe os pedidos de todos os marketplaces.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pedidos hoje" value="23" delta={18} icon={ShoppingBag} />
        <StatCard label="Receita hoje" value="R$ 4.218" delta={22} icon={DollarSign} accent="success" />
        <StatCard label="Ticket médio" value="R$ 183" delta={5} icon={TrendingUp} accent="accent" />
        <StatCard label="A enviar" value="9" delta={-3} icon={Package} accent="warning" />
      </div>

      <div className="rounded-xl border border-border bg-gradient-card p-5 shadow-card">
        <h3 className="font-display font-semibold">Evolução de vendas</h3>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesChart}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="ml" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="shopee" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-gradient-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-semibold">Últimos pedidos</h3>
          <select className="h-9 rounded-lg bg-input border border-border px-3 text-sm">
            <option>Últimos 7 dias</option><option>Últimos 30 dias</option><option>Este mês</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-background/40">
            <tr>
              <th className="text-left font-medium px-5 py-3">Pedido</th>
              <th className="text-left font-medium px-5 py-3">Cliente</th>
              <th className="text-left font-medium px-5 py-3">Marketplace</th>
              <th className="text-right font-medium px-5 py-3">Valor</th>
              <th className="text-left font-medium px-5 py-3">Status</th>
              <th className="text-left font-medium px-5 py-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-background/30">
                <td className="px-5 py-3 font-mono text-xs">{o.id}</td>
                <td className="px-5 py-3">{o.customer}</td>
                <td className="px-5 py-3 text-muted-foreground">{o.marketplace}</td>
                <td className="px-5 py-3 text-right font-medium">R$ {o.amount}</td>
                <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-5 py-3 text-muted-foreground">{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
