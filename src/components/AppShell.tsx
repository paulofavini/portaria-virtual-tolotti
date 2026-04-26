import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Users,
  Truck,
  Bell,
  PartyPopper,
  Truck as TruckIcon,
  AlertTriangle,
  Wrench,
  LogOut,
  Menu,
  X,
  Shield,
  Plus,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/avisos", label: "Avisos", icon: Bell },
  { to: "/eventos", label: "Eventos", icon: PartyPopper },
  { to: "/mudancas", label: "Mudanças", icon: TruckIcon },
  { to: "/ocorrencias", label: "Ocorrências", icon: AlertTriangle },
  { to: "/chamados", label: "Chamados", icon: Wrench },
  { to: "/condominios", label: "Condomínios", icon: Building2 },
  { to: "/moradores", label: "Moradores", icon: Users },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck },
] as const;

const QUICK_ACTIONS = [
  { to: "/avisos/novo", label: "Novo aviso", icon: Bell },
  { to: "/eventos/novo", label: "Novo evento", icon: PartyPopper },
  { to: "/mudancas/novo", label: "Nova mudança", icon: TruckIcon },
  { to: "/ocorrencias/novo", label: "Nova ocorrência", icon: AlertTriangle },
  { to: "/chamados/novo", label: "Novo chamado", icon: Wrench },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="h-16 px-6 flex items-center gap-2 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Portaria Virtual</div>
            <div className="text-[11px] text-sidebar-foreground/70">Grupo Tolotti</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
          {roles.length > 0 ? `Perfil: ${roles.join(", ")}` : "Sem perfil"}
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-72 bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="h-16 px-5 flex items-center justify-between border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span className="font-bold">Portaria Tolotti</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="h-16 sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border flex items-center px-4 lg:px-8 gap-3">
          <button
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-muted"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-semibold text-foreground hidden sm:block">
            {NAV.find((n) => n.to === location.pathname)?.label ?? "Portaria Virtual"}
          </div>
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hover:opacity-90">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 max-w-7xl w-full mx-auto">{children}</main>

        {/* FAB */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
              style={{ boxShadow: "var(--shadow-elevated)" }}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
            <DropdownMenuLabel>+ Novo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <DropdownMenuItem key={a.to} onClick={() => navigate({ to: a.to })}>
                  <Icon className="h-4 w-4 mr-2" />
                  {a.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}