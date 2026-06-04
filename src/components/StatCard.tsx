import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatCard({
  label, value, delta, icon: Icon, accent = "primary",
}: {
  label: string; value: string; delta?: number; icon: LucideIcon;
  accent?: "primary" | "accent" | "success" | "warning";
}) {
  const up = (delta ?? 0) >= 0;
  const tint =
    accent === "accent" ? "bg-accent/15 text-accent" :
    accent === "success" ? "bg-success/15 text-success" :
    accent === "warning" ? "bg-warning/15 text-warning" :
    "bg-primary/15 text-primary";
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-2xl font-semibold font-display">{value}</p>
        </div>
        <div className={`size-9 rounded-lg grid place-items-center ${tint}`}>
          <Icon className="size-4" />
        </div>
      </div>
      {delta !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span className={`flex items-center ${up ? "text-success" : "text-destructive"}`}>
            {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta)}%
          </span>
          <span className="text-muted-foreground">vs semana passada</span>
        </div>
      )}
    </div>
  );
}
