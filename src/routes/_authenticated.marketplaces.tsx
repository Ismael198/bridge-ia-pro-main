import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { RefreshCw, Unplug, Plug, ExternalLink, Loader2 } from "lucide-react";
import {
  listConnections,
  startMercadoLivreOAuth,
  disconnectMarketplace,
  syncMercadoLivre,
} from "@/lib/marketplaces.functions";

export const Route = createFileRoute("/_authenticated/marketplaces")({
  component: Marketplaces,
  head: () => ({ meta: [{ title: "Marketplaces — Gerencie Pedido Connect" }] }),
});

type CardDef = {
  id: "mercadolivre" | "shopee" | "amazon" | "shein";
  name: string;
  color: string;
  supported: boolean;
};

const CARDS: CardDef[] = [
  { id: "mercadolivre", name: "Mercado Livre", color: "#FFE600", supported: true },
  { id: "shopee", name: "Shopee", color: "#EE4D2D", supported: false },
  { id: "amazon", name: "Amazon", color: "#FF9900", supported: false },
  { id: "shein", name: "Shein", color: "#000000", supported: false },
];

function formatRelative(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function Marketplaces() {
  const listFn = useServerFn(listConnections);
  const startMl = useServerFn(startMercadoLivreOAuth);
  const disconnectFn = useServerFn(disconnectMarketplace);
  const syncMl = useServerFn(syncMercadoLivre);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-connections"],
    queryFn: () => listFn(),
  });

  const connectMutation = useMutation({
    mutationFn: async () => startMl(),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (e: Error) => setError(e.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: (provider: "mercadolivre" | "shopee") =>
      disconnectFn({ data: { provider } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace-connections"] }),
    onError: (e: Error) => setError(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncMl(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace-connections"] }),
    onError: (e: Error) => setError(e.message),
  });

  const connections = data?.connections ?? [];

  return (
    <AppShell title="Marketplaces" subtitle="Conecte e gerencie suas contas oficiais.">
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Carregando conexões…
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((card) => {
            const conn = connections.find((c) => c.provider === card.id);
            const status: "connected" | "disconnected" | "soon" = !card.supported
              ? "soon"
              : conn
                ? "connected"
                : "disconnected";

            return (
              <div
                key={card.id}
                className="rounded-xl border border-border bg-gradient-card p-5 shadow-card flex flex-col"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="size-12 rounded-lg grid place-items-center font-semibold"
                    style={{ background: `${card.color}22`, color: card.color }}
                  >
                    {card.name[0]}
                  </div>
                  <StatusBadge status={status} />
                </div>
                <h3 className="mt-4 font-display font-semibold text-lg">{card.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {conn?.account_label ? (
                    <>
                      Conta: <span className="text-foreground">{conn.account_label}</span>
                    </>
                  ) : (
                    "Nenhuma conta vinculada"
                  )}
                </p>

                {conn?.last_sync_at && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Última sincronização {formatRelative(conn.last_sync_at)}
                  </p>
                )}
                {conn?.expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Token expira em {new Date(conn.expires_at).toLocaleString("pt-BR")}
                  </p>
                )}

                <div className="mt-5 flex gap-2 flex-wrap">
                  {status === "connected" ? (
                    <>
                      <button
                        onClick={() => card.id === "mercadolivre" && syncMutation.mutate()}
                        disabled={syncMutation.isPending}
                        className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {syncMutation.isPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <RefreshCw className="size-3" />
                        )}
                        Sincronizar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Revogar acesso ${card.name}?`)) {
                            disconnectMutation.mutate(card.id as "mercadolivre" | "shopee");
                          }
                        }}
                        disabled={disconnectMutation.isPending}
                        className="px-3 py-1.5 rounded-md text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Unplug className="size-3" /> Revogar acesso
                      </button>
                    </>
                  ) : status === "soon" ? (
                    <button
                      disabled
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-muted/40 text-muted-foreground inline-flex items-center gap-1.5 cursor-not-allowed"
                    >
                      Em breve
                    </button>
                  ) : (
                    <button
                      onClick={() => card.id === "mercadolivre" && connectMutation.mutate()}
                      disabled={connectMutation.isPending}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-gradient-primary text-primary-foreground shadow-glow inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {connectMutation.isPending ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Plug className="size-3" />
                      )}
                      Conectar
                    </button>
                  )}
                  <a
                    href="https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    Docs <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
