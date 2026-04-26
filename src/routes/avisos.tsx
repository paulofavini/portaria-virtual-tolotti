import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAvisos } from "@/lib/queries";
import { Plus, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/avisos")({
  component: () => (
    <RequireAuth>
      <AvisosPage />
    </RequireAuth>
  ),
});

function AvisosPage() {
  const { data, isLoading } = useAvisos();
  return (
    <div className="pb-24">
      <PageHeader
        title="Avisos"
        description="Comunicados e alertas do dia."
        action={
          <Link to="/avisos/novo">
            <Button><Plus className="h-4 w-4 mr-1" /> Novo aviso</Button>
          </Link>
        }
      />
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !data?.length ? (
        <EmptyState title="Nenhum aviso cadastrado" description="Clique em + Novo aviso para começar." />
      ) : (
        <div className="space-y-2">
          {data.map((a) => (
            <div
              key={a.id}
              className="bg-card rounded-xl border border-border p-4 flex items-start gap-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                a.prioridade === "urgente" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
              )}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{a.descricao}</span>
                  {a.prioridade === "urgente" && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">
                      Urgente
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.condominios?.nome}
                  {a.unidades && ` · Bloco ${a.unidades.blocos?.nome} / Unidade ${a.unidades.numero}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(a.data).toLocaleDateString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}