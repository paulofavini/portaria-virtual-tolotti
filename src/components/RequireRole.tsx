import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { RequireAuth } from "./RequireAuth";
import { toast } from "sonner";

/**
 * Wraps a page and restricts access to a specific set of roles.
 * Non-authorized users are redirected to their default landing page.
 */
export function RequireRole({
  allow,
  children,
}: {
  allow: AppRole[];
  children: ReactNode;
}) {
  const { roles, loading, isSindico, isAdmin, isOperador } = useAuth();
  const navigate = useNavigate();

  const allowed = roles.some((r) => allow.includes(r));

  useEffect(() => {
    if (loading) return;
    if (allowed) return;
    toast.error("Acesso restrito ao seu perfil");
    // Sindico → sempre vai para relatórios; demais → dashboard
    if (isSindico) navigate({ to: "/relatorios" });
    else if (isAdmin || isOperador) navigate({ to: "/" });
    else navigate({ to: "/login" });
  }, [loading, allowed, isSindico, isAdmin, isOperador, navigate]);

  return <RequireAuth>{allowed ? children : null}</RequireAuth>;
}