import { useEffect, useState, type ReactNode } from "react";
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
  Plus,
  Search,
  UserCog,
  FileBarChart,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Logo } from "@/components/Logo";
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
  { to: "/fornecedores", label: "Liberações", icon: Truck },
  { to: "/avisos", label: "Avisos", icon: Bell },
  { to: "/eventos", label: "Eventos", icon: PartyPopper },
  { to: "/mudancas", label: "Mudanças", icon: TruckIcon },
  { to: "/ocorrencias", label: "Ocorrências", icon: AlertTriangle },
  { to: "/chamados", label: "Chamados", icon: Wrench },
  { to: "/solicitacoes", label: "Solicitações", icon: ClipboardList },
  { to: "/condominios", label: "Condomínios", icon: Building2 },
  { to: "/moradores", label: "Moradores", icon: Users },
  { to: "/relatorios/ocorrencias", label: "Relatórios", icon: FileBarChart },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, roles, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="py-2 px-3 flex items-center justify-center border-b border-sidebar-border">
          <Logo onDark className="w-[185px] h-auto" />
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
          {isAdmin && (
            <Link
              to="/usuarios"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === "/usuarios"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <UserCog className="h-4 w-4" />
              Usuários
            </Link>
          )}
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
            <div className="relative py-2 px-3 flex items-center justify-center border-b border-sidebar-border">
              <Logo onDark className="w-[185px] h-auto" />
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 p-1 rounded-md hover:bg-sidebar-accent"
                aria-label="Fechar menu"
              >
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
              {isAdmin && (
                <Link
                  to="/usuarios"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                    location.pathname === "/usuarios"
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent",
                  )}
                >
                  <UserCog className="h-4 w-4" />
                  Usuários
                </Link>
              )}
            </nav>
          </aside>
        </div>
      )}

      <div className="lg:pl-64 flex flex-col min-h-screen min-w-0">
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
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 max-w-md mx-2 flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-sm text-muted-foreground transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="truncate">Buscar condomínio, unidade ou morador...</span>
            <span className="ml-auto hidden md:inline text-[10px] px-1.5 py-0.5 rounded border border-border bg-background">
              ⌘K
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold hover:opacity-90">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate({ to: "/usuarios" })}>
                  <UserCog className="h-4 w-4 mr-2" /> Gestão de usuários
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 max-w-7xl w-full mx-auto min-w-0">{children}</main>

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
                <DropdownMenuItem key={a.to} asChild>
                  <Link to={a.to}>
                    <Icon className="h-4 w-4 mr-2" />
                    {a.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}