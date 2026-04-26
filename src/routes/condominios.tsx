import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useCondominios } from "@/lib/queries";
import { Plus, Building2, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/condominios")({
  component: () => (<RequireAuth><CondosPage /></RequireAuth>),
});

function CondosPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useCondominios();
  return (
    <div className="pb-24">
      <PageHeader title="Condomínios" description="Cadastro completo de condomínios." action={
        <Button onClick={() => navigate({ to: "/condominios/novo" })}><Plus className="h-4 w-4 mr-1" />Novo condomínio</Button>
      } />
      {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> :
        !data?.length ? <EmptyState title="Nenhum condomínio cadastrado" description="Cadastre o primeiro condomínio para começar." /> :
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ to: "/condominios/$id", params: { id: c.id } })}
              className="text-left bg-card rounded-xl border border-border p-4 hover:border-primary/40 transition-colors group"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Building2 className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{c.nome}</div>
                  {c.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {c.cnpj}</p>}
                  {c.sindico_nome && <p className="text-xs text-muted-foreground mt-1">Síndico: {c.sindico_nome}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
            </button>
          ))}
        </div>
      }
    </div>
  );
}