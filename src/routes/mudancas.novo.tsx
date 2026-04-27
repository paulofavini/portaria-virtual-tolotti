import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { MudancasManager } from "@/components/MudancasManager";

export const Route = createFileRoute("/mudancas/novo")({
  component: () => (
    <RequireAuth>
      <div className="pb-24">
        <PageHeader
          title="Nova mudança"
          description="Cadastre uma nova entrada ou saída."
        />
        <MudancasManager openNew />
      </div>
    </RequireAuth>
  ),
});
