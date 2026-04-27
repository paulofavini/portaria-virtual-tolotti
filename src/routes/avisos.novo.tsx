import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { AvisosManager } from "@/components/AvisosManager";

export const Route = createFileRoute("/avisos/novo")({
  component: () => (
    <RequireAuth>
      <div className="pb-24">
        <PageHeader title="Novo aviso" description="Cadastre um novo comunicado." />
        <AvisosManager openNew />
      </div>
    </RequireAuth>
  ),
});
