import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { AvisosManager } from "@/components/AvisosManager";

export const Route = createFileRoute("/avisos/novo")({
  component: () => (
    <div className="pb-24">
      <PageHeader title="Novo aviso" description="Cadastre um novo comunicado." />
      <AvisosManager openNew />
    </div>
  ),
});
