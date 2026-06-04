import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";

export const Route = createFileRoute("/signup")({
  component: Signup,
  head: () => ({ meta: [{ title: "Criar conta — Gerencie Pedido Connect" }] }),
});

function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) setError(error);
    else navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold">Gerencie Pedido <span className="text-primary">Connect</span></span>
        </Link>
        <h1 className="text-3xl font-display font-semibold">Criar sua conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">Comece a conectar agentes em minutos.</p>

        <div className="mt-8 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Nome completo</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 h-11">
              <User className="size-4 text-muted-foreground" />
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className="flex-1 bg-transparent outline-none text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">E-mail</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 h-11">
              <Mail className="size-4 text-muted-foreground" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" className="flex-1 bg-transparent outline-none text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Senha (mínimo 6 caracteres)</label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 h-11">
              <Lock className="size-4 text-muted-foreground" />
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="flex-1 bg-transparent outline-none text-sm" />
            </div>
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</div>}

          <button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow inline-flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <>Criar conta <ArrowRight className="size-4" /></>}
          </button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Já tem conta? <Link to="/login" className="text-primary">Entrar</Link>
          </p>
        </div>
      </form>
    </div>
  );
}
