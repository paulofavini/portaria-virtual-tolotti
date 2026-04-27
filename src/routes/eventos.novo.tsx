import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/eventos/novo")({
  component: () => (
    <div className="pb-24">
      <PageHeader title="Novo evento" description="Em construção." />
      <EmptyState title="Em breve" description="Esta seção será implementada na próxima etapa." />
    </div>
  ),
});
