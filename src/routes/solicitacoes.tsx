import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { SolicitacoesManager } from "@/components/SolicitacoesManager";

export const Route = createFileRoute("/solicitacoes")({
  component: SolicitacoesPage,
});

function SolicitacoesPage() {
  return (
    <RequireAuth>
      <div className="pb-24">
        <PageHeader
          title="Solicitações"
          description="Tags, controles, imagens, acessos e outras solicitações dos moradores."
        />
        <SolicitacoesManager />
      </div>
    </RequireAuth>
  );
}