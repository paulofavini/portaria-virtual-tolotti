import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Verifica se há sessão de recovery ativa (Supabase cria automaticamente
  // ao processar o hash #access_token&type=recovery na URL).
  useEffect(() => {
    let resolved = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        resolved = true;
        setValidToken(true);
        setChecking(false);
      }
    });

    // Fallback: se já existe sessão ao carregar, aceita
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (resolved) return;
      if (session) {
        setValidToken(true);
      }
      // Dá um pequeno tempo para o evento PASSWORD_RECOVERY chegar do hash
      setTimeout(() => {
        setChecking(false);
      }, 600);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível redefinir a senha", { description: error.message });
      return;
    }
    toast.success("Senha atualizada com sucesso");
    setDone(true);
    // Desloga para forçar novo login com a nova senha
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/login" }), 2000);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--gradient-brand)" }}
    >
      <div className="w-full max-w-md pt-12 pb-6">
        <div className="flex justify-center mb-6">
          <Logo onDark className="h-24 w-auto drop-shadow-md" />
        </div>
        <div className="bg-card rounded-2xl p-7 sm:p-9 shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-1">Definir nova senha</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Crie uma nova senha para acessar o sistema.
          </p>

          {checking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Validando link...
            </div>
          ) : !validToken ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                Link inválido ou expirado. Solicite um novo link de redefinição.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/login" })}>
                Ir para login
              </Button>
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-sm text-foreground font-medium">Senha atualizada com sucesso</p>
              <p className="text-xs text-muted-foreground">Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}