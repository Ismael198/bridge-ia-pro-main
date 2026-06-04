import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Send, Sparkles, ShieldAlert, Plus, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: Chat,
  head: () => ({ meta: [{ title: "Chat IA — Gerencie Pedido Connect" }] }),
});

const suggestions = [
  "Quantas vendas tive hoje?",
  "Quais anúncios estão com baixo desempenho?",
  "Quais perguntas de clientes estão pendentes?",
  "Qual produto vendeu mais nesta semana?",
];

const history = [
  { id: 1, title: "Vendas da semana", time: "agora" },
  { id: 2, title: "Anúncios pausados", time: "ontem" },
  { id: 3, title: "Concorrentes — fone TWS", time: "2 dias" },
];

type Msg = { role: "user" | "assistant"; content: string; data?: { label: string; value: string }[] };

function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou seu assistente operacional. Posso responder sobre suas vendas, anúncios e clientes." },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setIsTyping(true);
    try {
      const res = await fetch("https://eo4hsaxrkdfodt.m.pipedream.net", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, timestamp: new Date().toISOString() }),
      });
      const ct = res.headers.get("content-type") ?? "";
      let reply = "";
      if (ct.includes("application/json")) {
        const json = await res.json();
        reply = json.reply ?? json.message ?? json.output ?? json.text ?? JSON.stringify(json);
      } else {
        reply = (await res.text()).trim();
      }
      if (!reply) reply = "(sem resposta do agente)";
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "assistant", content: "Não foi possível obter resposta do agente. Tente novamente." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AppShell title="Chat IA" subtitle="Pergunte em português sobre seu negócio.">
      <div className="grid lg:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-9rem)]">
        <aside className="rounded-xl border border-border bg-gradient-card p-3 shadow-card overflow-hidden flex flex-col">
          <button className="w-full px-3 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 shadow-glow">
            <Plus className="size-4" /> Nova conversa
          </button>
          <p className="mt-4 px-2 text-[10px] uppercase tracking-widest text-muted-foreground">Histórico</p>
          <ul className="mt-2 space-y-1 overflow-auto">
            {history.map((h) => (
              <li key={h.id}>
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-background/50 text-sm flex items-center gap-2">
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{h.title}</span>
                  <span className="text-[10px] text-muted-foreground">{h.time}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-xl border border-border bg-gradient-card shadow-card flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2 text-xs">
            <ShieldAlert className="size-3.5 text-warning" />
            <span className="text-muted-foreground">Você precisa estar autenticado em pelo menos um marketplace para consultar dados reais.</span>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-5">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shrink-0 shadow-glow">
                    <Sparkles className="size-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[75%] ${m.role === "user" ? "" : ""}`}>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-background/60 border border-border rounded-tl-sm"
                  }`}>
                    {m.content}
                  </div>
                  {m.data && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {m.data.map((d) => (
                        <div key={d.label} className="rounded-lg border border-border bg-background/60 p-3">
                          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.label}</div>
                          <div className="mt-1 font-display font-semibold">{d.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shrink-0 shadow-glow">
                  <Sparkles className="size-4 text-primary-foreground" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-background/60 border border-border px-4 py-3 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="ml-2 text-xs text-muted-foreground">digitando…</span>
                </div>
              </div>
            )}

            {msgs.length <= 1 && (
              <div className="pt-8">
                <p className="text-xs text-muted-foreground mb-2">Sugestões de perguntas</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="px-3 py-1.5 rounded-full border border-border bg-background/60 hover:bg-muted text-xs">

                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              placeholder={isTyping ? "Aguardando resposta do agente..." : "Pergunte sobre vendas, anúncios, clientes..."}
              className="flex-1 h-11 rounded-lg bg-input border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            />
            <button type="submit" disabled={isTyping} className="h-11 px-4 rounded-lg bg-gradient-primary text-primary-foreground font-medium text-sm shadow-glow inline-flex items-center gap-2 disabled:opacity-60">
              <Send className="size-4" /> Enviar
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
