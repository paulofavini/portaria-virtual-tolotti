import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/chamados/novo")({
  component: () => (
    <div className="pb-24">
      <PageHeader title="Novo chamado" description="Em construção." />
      <EmptyState title="Em breve" description="Esta seção será implementada na próxima etapa." />
    </div>
  ),
});
