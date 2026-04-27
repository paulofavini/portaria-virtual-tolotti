import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--gradient-brand)" }}
    >
      <div className="w-full max-w-md py-12">
        <div className="flex flex-col items-center text-center mb-10 text-white">
          <Logo onDark className="w-[200px] h-auto mt-2 mb-8" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Portaria Virtual</h1>
          <p className="text-white/70 text-sm mt-1.5">Grupo Tolotti</p>
        </div>
        <div className="bg-card rounded-2xl p-6 sm:p-8" style={{ boxShadow: "var(--shadow-elevated)" }}>
          <h2 className="text-lg font-semibold text-foreground mb-1">Acessar sistema</h2>
          <p className="text-sm text-muted-foreground mb-6">Entre com suas credenciais corporativas.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            O acesso é criado pelo administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}