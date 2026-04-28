import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import logo18Anos from "@/assets/logo-tolotti-18anos.png";
import loginBg from "@/assets/login-bg.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
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
      className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
    >
      {/* Imagem de fundo com leve blur */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage: `url(${loginBg})`,
          filter: "blur(4px)",
          transform: "scale(1.05)",
        }}
      />
      {/* Overlay azul escuro para contraste e identidade visual */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(10, 37, 64, 0.72) 0%, rgba(13, 71, 161, 0.66) 55%, rgba(21, 101, 192, 0.62) 100%)",
        }}
      />
      <div className="w-full max-w-md pt-12 pb-6">
        <div className="flex justify-center mb-6 animate-fade-in" style={{ animationDuration: "400ms" }}>
          <Logo onDark className="h-24 w-auto drop-shadow-md" />
        </div>
        <div
          className="rounded-2xl p-7 sm:p-9 animate-fade-in border backdrop-blur-[14px]"
          style={{
            animationDuration: "400ms",
            animationDelay: "80ms",
            animationFillMode: "both",
            background: "rgba(255, 255, 255, 0.12)",
            WebkitBackdropFilter: "blur(14px)",
            borderColor: "rgba(255, 255, 255, 0.22)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.28), inset 0 0 1px rgba(255, 255, 255, 0.35)",
          }}
        >
          <h2 className="text-lg font-semibold text-white mb-1 drop-shadow-sm">Acessar sistema</h2>
          <p className="text-sm text-white/75 mb-6">Entre com suas credenciais corporativas.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">E-mail</Label>
              <Input
                id="email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 transition-all duration-200 focus-visible:bg-white/15 focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-sky-400/40"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white/90">Senha</Label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs font-medium text-white/85 hover:text-white hover:underline focus:outline-none focus-visible:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 transition-all duration-200 focus-visible:bg-white/15 focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-sky-400/40"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 shadow-lg shadow-primary/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:opacity-80"
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
          <p className="text-xs text-white/65 mt-6 text-center">
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
      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </div>
  );
}

function ForgotPasswordDialog({
  open,
  onClose,
  initialEmail,
}: {
  open: boolean;
  onClose: () => void;
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setSent(false);
    }
  }, [open, initialEmail]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      // Erros são tratados de forma genérica para não expor se o email existe
      await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // silencioso — sempre exibimos a mesma mensagem genérica
    } finally {
      setBusy(false);
      setSent(true);
      toast.success("Se o email estiver cadastrado, você receberá um link para redefinir sua senha");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recuperar senha</DialogTitle>
          <DialogDescription>
            Informe o e-mail cadastrado. Enviaremos um link seguro para você definir uma nova senha.
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground">
              Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
            <p className="text-xs text-muted-foreground">
              Verifique também a caixa de spam. O link expira em 1 hora.
            </p>
            <DialogFooter>
              <Button onClick={onClose} className="w-full sm:w-auto">Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || !email.trim()}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}