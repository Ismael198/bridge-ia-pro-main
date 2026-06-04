import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Entrar — Gerencie Pedido Connect" }] }),
});

function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
    else navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background text-foreground">
      <div className="hidden md:flex relative overflow-hidden bg-sidebar flex-col justify-between p-10">
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold">Gerencie Pedido <span className="text-primary">Connect</span></span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-display font-semibold leading-tight max-w-md">
            "Conectei meus agentes em minutos. As vendas no Mercado Livre cresceram 38% no primeiro mês."
          </h2>
          <div className="mt-6 flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-primary" />
            <div>
              <div className="text-sm font-medium">Mariana Silva</div>
              <div className="text-xs text-muted-foreground">CEO · TechStore Brasil</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-10">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <h1 className="text-3xl font-display font-semibold">Entrar no dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Acesse seus marketplaces e agentes.</p>

          <div className="mt-8 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">E-mail</label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 h-11">
                <Mail className="size-4 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" className="flex-1 bg-transparent outline-none text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Senha</label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 h-11">
                <Lock className="size-4 text-muted-foreground" />
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="flex-1 bg-transparent outline-none text-sm" />
              </div>
            </div>

            {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow inline-flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <>Entrar no dashboard <ArrowRight className="size-4" /></>}
            </button>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Não tem conta? <Link to="/signup" className="text-primary">Cadastre-se grátis</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
