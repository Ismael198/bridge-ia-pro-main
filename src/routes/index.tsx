import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, ShieldCheck, KeyRound, Plug, Bot, Image as ImageIcon,
  ArrowRight, Check, Github, Twitter, Linkedin, Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Gerencie Pedido Connect — Conecte seus agentes de IA aos marketplaces" },
      { name: "description", content: "Plataforma que conecta agentes de IA aos marketplaces com segurança. Tokens protegidos, chaves revogáveis, API unificada." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">Gerencie Pedido <span className="text-primary">Connect</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground ml-10">
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#integracoes" className="hover:text-foreground">Integrações</a>
            <a href="#ferramentas" className="hover:text-foreground">Ferramentas IA</a>
            <a href="#beneficios" className="hover:text-foreground">Por que</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
            <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow">
              Ver dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/40 backdrop-blur text-xs text-muted-foreground">
            <Zap className="size-3 text-primary" /> Novo · Integração nativa com Claude e ChatGPT
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-display font-semibold tracking-tighter max-w-4xl mx-auto leading-[1.05]">
            Conecte seus <span className="text-gradient">agentes de IA</span><br />aos marketplaces
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            A ponte segura entre IA e marketplaces. Autorize contas, gere chaves revogáveis
            e deixe seus agentes operarem anúncios, vendas e atendimento — sem nunca expor tokens.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link to="/dashboard" className="px-5 py-3 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow inline-flex items-center gap-2">
              Começar agora <ArrowRight className="size-4" />
            </Link>
            <Link to="/dashboard" className="px-5 py-3 rounded-lg border border-border bg-card/60 backdrop-blur hover:bg-card font-medium">
              Ver dashboard
            </Link>
          </div>

          {/* Marketplaces */}
          <div className="mt-20">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Marketplaces suportados</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {[
                { n: "Mercado Livre", s: "ok" },
                { n: "Shopee", s: "ok" },
                { n: "Amazon", s: "soon" },
                { n: "Shein", s: "soon" },
              ].map((m) => (
                <div key={m.n} className="px-4 py-2 rounded-lg border border-border bg-card/60 backdrop-blur flex items-center gap-2 text-sm">
                  <span className="size-2 rounded-full bg-success" style={{ backgroundColor: m.s === "ok" ? undefined : "var(--color-warning)" }} />
                  {m.n}
                  {m.s === "soon" && <span className="text-[10px] text-warning ml-1">em breve</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-sm text-primary font-medium">Como funciona</p>
            <h2 className="mt-2 text-4xl font-display font-semibold">Em 3 passos, sua IA está vendendo</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {[
              { i: Plug, n: "01", t: "Você autoriza", d: "Conecte sua conta de marketplace via OAuth oficial. Nós guardamos o token com segurança no servidor." },
              { i: KeyRound, n: "02", t: "Gera uma chave", d: "Crie uma chave intermediária para seu agente, com escopos e expiração definidos por você." },
              { i: Bot, n: "03", t: "Agente conectado", d: "Seu agente passa a operar via API unificada. Sem ver tokens, sem riscos. Revogue quando quiser." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-border bg-gradient-card p-6 shadow-card">
                <div className="text-xs font-mono text-primary">{s.n}</div>
                <div className="mt-4 size-10 rounded-lg bg-primary/15 text-primary grid place-items-center">
                  <s.i className="size-5" />
                </div>
                <h3 className="mt-4 text-xl font-display font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent integrations */}
      <section id="integracoes" className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm text-primary font-medium">Integrações com agentes de IA</p>
            <h2 className="mt-2 text-4xl font-display font-semibold">Funciona com qualquer agente</h2>
            <p className="mt-4 text-muted-foreground">
              Compatível com os principais provedores. Uma chave, qualquer agente, todos os marketplaces.
            </p>
            <ul className="mt-6 space-y-3">
              {["Claude", "ChatGPT", "OpenAI Codex", "OpenClaw"].map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm">
                  <div className="size-7 rounded-md bg-accent/15 text-accent grid place-items-center">
                    <Bot className="size-4" />
                  </div>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
            <pre className="relative rounded-2xl border border-border bg-card/80 backdrop-blur p-6 text-xs font-mono text-muted-foreground overflow-auto shadow-card">
{`POST /v1/marketplace/listings
Authorization: Bearer gpc_live_a93f...

{
  "sku": "FONE-TWS-001",
  "channel": "mercadolivre",
  "price": 189.90,
  "stock": 42
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* AI Tools */}
      <section id="ferramentas" className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-sm text-primary font-medium">Ferramentas com IA</p>
          <h2 className="mt-2 text-4xl font-display font-semibold max-w-2xl">Mais que API. Ferramentas que vendem.</h2>
          <div className="mt-12 grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-border bg-gradient-card p-7 shadow-card">
              <div className="size-10 rounded-lg bg-accent/15 text-accent grid place-items-center"><ImageIcon className="size-5" /></div>
              <h3 className="mt-4 text-2xl font-display font-semibold">Melhoria de fotos com IA</h3>
              <p className="mt-2 text-sm text-muted-foreground">Fundo branco realista, ajuste de luz e enquadramento padrão marketplace. Em segundos.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="aspect-square rounded-lg bg-muted/60 grid place-items-center text-xs text-muted-foreground">Antes</div>
                <div className="aspect-square rounded-lg bg-gradient-primary grid place-items-center text-xs text-primary-foreground font-medium">Depois</div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-gradient-card p-7 shadow-card">
              <div className="size-10 rounded-lg bg-primary/15 text-primary grid place-items-center"><MessageBubble /></div>
              <h3 className="mt-4 text-2xl font-display font-semibold">Chat operacional</h3>
              <p className="mt-2 text-sm text-muted-foreground">Pergunte em português sobre vendas, anúncios e clientes. Respostas com métricas e tabelas.</p>
              <div className="mt-6 space-y-2">
                {["Quantas vendas tive hoje?", "Anúncios com baixo desempenho?", "Perguntas pendentes de clientes"].map((q) => (
                  <div key={q} className="text-sm px-3 py-2 rounded-lg bg-background/60 border border-border">{q}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="beneficios" className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-sm text-primary font-medium">Por que escolher</p>
          <h2 className="mt-2 text-4xl font-display font-semibold">Tokens protegidos. Controle total.</h2>
          <div className="mt-12 grid md:grid-cols-4 gap-5">
            {[
              { i: ShieldCheck, t: "Autenticação oficial", d: "OAuth direto com cada marketplace." },
              { i: KeyRound, t: "Chaves revogáveis", d: "Revogue o acesso a qualquer momento." },
              { i: Plug, t: "API unificada", d: "Uma interface, todos os canais." },
              { i: Bot, t: "Pronto para agentes", d: "Compatível com os principais LLMs." },
            ].map((b) => (
              <div key={b.t} className="rounded-xl border border-border bg-gradient-card p-5 shadow-card">
                <div className="size-9 rounded-lg bg-primary/15 text-primary grid place-items-center"><b.i className="size-4" /></div>
                <h3 className="mt-4 font-display font-semibold">{b.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-3xl border border-border bg-gradient-card p-10 text-center shadow-card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-hero opacity-60" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-display font-semibold">Automatize anúncios, vendas e atendimento</h2>
              <p className="mt-3 text-muted-foreground">Crie sua primeira chave de agente em menos de 2 minutos.</p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link to="/dashboard" className="px-5 py-3 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow inline-flex items-center gap-2">
                  Começar agora <ArrowRight className="size-4" />
                </Link>
                <a href="#como-funciona" className="px-5 py-3 rounded-lg border border-border bg-card/60 font-medium">Falar com vendas</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-md bg-gradient-primary grid place-items-center"><Sparkles className="size-3.5 text-primary-foreground" /></div>
              <span className="font-display font-semibold">Gerencie Pedido Connect</span>
            </div>
            <p className="mt-3 text-muted-foreground text-xs max-w-xs">A ponte segura entre agentes de IA e marketplaces.</p>
          </div>
          {[
            { t: "Produto", l: ["Dashboard", "Marketplaces", "Agentes", "Fotos IA"] },
            { t: "Empresa", l: ["Sobre", "Blog", "Carreiras", "Contato"] },
            { t: "Legal", l: ["Termos", "Privacidade", "Segurança", "Status"] },
          ].map((c) => (
            <div key={c.t}>
              <div className="text-foreground font-medium">{c.t}</div>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                {c.l.map((x) => <li key={x}><a href="#" className="hover:text-foreground">{x}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 Gerencie Pedido Connect. Todos os direitos reservados.</span>
          <div className="flex gap-3">
            <a href="#"><Twitter className="size-4" /></a>
            <a href="#"><Github className="size-4" /></a>
            <a href="#"><Linkedin className="size-4" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MessageBubble() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// keep import used
void Check;
