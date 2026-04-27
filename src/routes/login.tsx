import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import logo18Anos from "@/assets/logo-tolotti-18anos.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

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
      <div className="w-full max-w-md pt-12 pb-6">
        <div className="flex justify-center mb-6 animate-fade-in" style={{ animationDuration: "400ms" }}>
          <Logo onDark className="h-24 w-auto drop-shadow-md" />
        </div>
        <div
          className="bg-card rounded-2xl p-7 sm:p-9 animate-fade-in shadow-lg"
          style={{ animationDuration: "400ms", animationDelay: "80ms", animationFillMode: "both" }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-1">Acessar sistema</h2>
          <p className="text-sm text-muted-foreground mb-6">Entre com suas credenciais corporativas.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="transition-all duration-200 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
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
                className="transition-all duration-200 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 transition-transform duration-150 active:scale-[0.98] disabled:opacity-80"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            O acesso é criado pelo administrador do sistema.
          </p>
        </div>
        <div
          className="bg-white rounded-2xl mt-6 px-6 py-4 flex items-center justify-center w-fit mx-auto animate-fade-in"
          style={{
            boxShadow: "var(--shadow-elevated)",
            animationDuration: "400ms",
            animationDelay: "160ms",
            animationFillMode: "both",
          }}
        >
          <img
            src={logo18Anos}
            alt="Grupo Tolotti — 18 anos"
            className="max-h-16 w-auto object-contain"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}