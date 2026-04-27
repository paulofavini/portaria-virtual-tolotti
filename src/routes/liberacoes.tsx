import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { LiberacoesManager } from "@/components/LiberacoesManager";

export const Route = createFileRoute("/liberacoes")({
  component: () => (
    <RequireAuth>
      <div className="pb-24">
        <PageHeader
          title="Liberações"
          description="Acessos pré-autorizados ao condomínio."
        />
        <LiberacoesManager />
      </div>
    </RequireAuth>
  ),
});