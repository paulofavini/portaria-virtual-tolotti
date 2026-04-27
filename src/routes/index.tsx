import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import {
  Bell,
  PartyPopper,
  Truck,
  AlertTriangle,
  Wrench,
  ChevronRight,
} from "lucide-react";
import {
  useAvisos,
  useEventos,
  useMudancas,
  useOcorrencias,
  useChamados,
  isToday,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { OrientacoesMural } from "@/components/OrientacoesMural";
import { SolicitacoesResumo } from "@/components/SolicitacoesResumo";
import { ConvidadosHoje } from "@/components/ConvidadosHoje";

export const Route = createFileRoute("/")({
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  to,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "warning" | "destructive" | "success";
  to: string;
}) {
  const toneClass =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "bg-warning/15 text-warning-foreground"
        : tone === "success"
          ? "bg-success/15 text-success"
          : "bg-primary/10 text-primary";
  return (
    <Link
      to={to}
      className="group bg-card rounded-xl p-4 border border-border hover:border-primary/40 transition-colors"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Link>
  );
}

function Dashboard() {
  const avisos = useAvisos();
  const eventos = useEventos();
  const mudancas = useMudancas();
  const ocorrencias = useOcorrencias();
  const chamados = useChamados();

  // useAvisos já filtra ativo=true e remove expirados, e ordena por fixado/created_at
  const avisosAtivos = avisos.data ?? [];
  const avisosUrgentes = avisosAtivos.filter((a) => a.tipo === "urgente");
  const avisosHoje = avisosAtivos.filter((a) => isToday(a.data));

  const eventosHoje = (eventos.data ?? []).filter((e) => isToday(e.data));

  const mudancasHoje = (mudancas.data ?? []).filter((m) => isToday(m.data));

  const ocorrenciasHoje = (ocorrencias.data ?? []).filter((o) => isToday(o.data_hora));

  const chamadosPendentes = (chamados.data ?? []).filter((c) => c.status === "pendente");

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do dia — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
      </div>

      {/* 1) Convidados dos eventos do dia — controle de presença rápido */}
      <ConvidadosHoje />

      {/* 2) Solicitações priorizadas para o plantão */}
      <SolicitacoesResumo />

      {/* 3) Mural de orientações aos operadores (colapsável) */}
      <OrientacoesMural />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Avisos urgentes" value={avisosUrgentes.length} icon={Bell} tone="destructive" to="/avisos" />
        <StatCard label="Eventos hoje" value={eventosHoje.length} icon={PartyPopper} tone="primary" to="/eventos" />
        <StatCard label="Mudanças hoje" value={mudancasHoje.length} icon={Truck} tone="primary" to="/mudancas" />
        <StatCard label="Ocorrências hoje" value={ocorrenciasHoje.length} icon={AlertTriangle} tone="warning" to="/ocorrencias" />
        <StatCard label="Chamados pendentes" value={chamadosPendentes.length} icon={Wrench} tone="destructive" to="/chamados" />
      </div>

      {/* Resumo do dia — cards compactos padronizados */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Avisos do dia" value={avisosHoje.length} icon={Bell} tone="destructive" to="/avisos" />
        <StatCard label="Mudanças do dia" value={mudancasHoje.length} icon={Truck} tone="primary" to="/mudancas" />
        <StatCard label="Ocorrências do dia" value={ocorrenciasHoje.length} icon={AlertTriangle} tone="warning" to="/ocorrencias" />
        <StatCard label="Chamados técnicos" value={chamadosPendentes.length} icon={Wrench} tone="success" to="/chamados" />
      </div>
    </div>
  );
}
