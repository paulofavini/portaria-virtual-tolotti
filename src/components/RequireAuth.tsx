import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "./AppShell";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, isSindico, isAdmin, isOperador } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
      return;
    }
    // Síndico só pode ficar em /relatorios*
    if (!loading && user && isSindico && !isAdmin && !isOperador) {
      if (!location.pathname.startsWith("/relatorios")) {
        navigate({ to: "/relatorios" });
      }
    }
  }, [loading, user, isSindico, isAdmin, isOperador, location.pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}