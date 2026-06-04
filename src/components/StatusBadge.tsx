export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    connected: { label: "Conectado", cls: "bg-success/15 text-success border-success/30" },
    disconnected: { label: "Desconectado", cls: "bg-muted text-muted-foreground border-border" },
    soon: { label: "Em breve", cls: "bg-warning/15 text-warning border-warning/30" },
    active: { label: "Ativo", cls: "bg-success/15 text-success border-success/30" },
    paused: { label: "Pausado", cls: "bg-warning/15 text-warning border-warning/30" },
    paid: { label: "Pago", cls: "bg-primary/15 text-primary border-primary/30" },
    shipped: { label: "Enviado", cls: "bg-accent/15 text-accent border-accent/30" },
    delivered: { label: "Entregue", cls: "bg-success/15 text-success border-success/30" },
    pending: { label: "Pendente", cls: "bg-warning/15 text-warning border-warning/30" },
    success: { label: "Sucesso", cls: "bg-success/15 text-success border-success/30" },
    error: { label: "Erro", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    high: { label: "Alto", cls: "bg-success/15 text-success border-success/30" },
    medium: { label: "Médio", cls: "bg-warning/15 text-warning border-warning/30" },
    low: { label: "Baixo", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${s.cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
