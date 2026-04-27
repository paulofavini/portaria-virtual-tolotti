import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { ChamadosManager } from "@/components/ChamadosManager";

export const Route = createFileRoute("/chamados/novo")({
  component: () => (
    <RequireAuth>
      <div className="pb-24">
        <PageHeader
          title="Novo chamado técnico"
          description="Cadastre um novo chamado para manutenção, TI ou terceiros."
        />
        <ChamadosManager openNew />
      </div>
    </RequireAuth>
  ),
});
