import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { EventosManager } from "@/components/EventosManager";

export const Route = createFileRoute("/eventos/novo")({
  component: () => (
    <div className="pb-24">
      <PageHeader title="Novo evento" description="Cadastre um novo evento e seus convidados." />
      <EventosManager openNew />
    </div>
  ),
});
