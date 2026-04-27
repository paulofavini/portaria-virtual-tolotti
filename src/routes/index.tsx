import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { OrientacoesMural } from "@/components/OrientacoesMural";
import { SolicitacoesResumo } from "@/components/SolicitacoesResumo";
import { ConvidadosHoje } from "@/components/ConvidadosHoje";
import { MudancasResumo } from "@/components/MudancasResumo";
import { AvisosResumo } from "@/components/AvisosResumo";
import { ChamadosResumo } from "@/components/ChamadosResumo";

export const Route = createFileRoute("/")({
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do dia —{" "}
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
      </div>

      {/* 1) Eventos */}
      <ConvidadosHoje />

      {/* 2) Solicitações */}
      <SolicitacoesResumo />

      {/* 3) Orientações aos operadores */}
      <OrientacoesMural limit={4} />

      {/* 4) Mudanças */}
      <MudancasResumo />

      {/* 5) Avisos */}
      <AvisosResumo />

      {/* 6) Chamados técnicos */}
      <ChamadosResumo />
    </div>
  );
}
