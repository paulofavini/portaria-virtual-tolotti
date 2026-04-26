import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useOcorrencias } from "@/lib/queries";
import { Plus, AlertTriangle, Image as ImageIcon, X } from "lucide-react";

export const Route = createFileRoute("/ocorrencias")({
  component: () => (
    <RequireAuth>
      <OcorrenciasPage />
    </RequireAuth>
  ),
});

function OcorrenciasPage() {
  const { data, isLoading } = useOcorrencias();
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="pb-24">
      <PageHeader
        title="Ocorrências"
        description="Registro de eventos e situações observadas pela portaria."
        action={
          <Link to="/ocorrencias/novo">
            <Button><Plus className="h-4 w-4 mr-1" /> Nova ocorrência</Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !data?.length ? (
        <EmptyState title="Nenhuma ocorrência registrada" description="Clique em + Nova ocorrência para começar." />
      ) : (
        <div className="space-y-2">
          {data.map((o) => (
            <div
              key={o.id}
              className="bg-card rounded-xl border border-border p-4 flex items-start gap-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {o.imagem_url ? (
                <button
                  onClick={() => setPreview(o.imagem_url!)}
                  className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0 hover:opacity-90"
                >
                  <img src={o.imagem_url} alt="Ocorrência" className="h-full w-full object-cover" />
                </button>
              ) : (
                <div className="h-16 w-16 rounded-lg bg-warning/15 text-warning-foreground flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{o.tipo}</span>
                  {o.imagem_url && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> foto
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">{o.descricao}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {o.condominios?.nome}
                  {o.unidades && ` · Bloco ${o.unidades.blocos?.nome} / Unidade ${o.unidades.numero}`}
                  {o.moradores && ` · ${o.moradores.nome}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(o.data_hora).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/20 text-white flex items-center justify-center hover:bg-background/30"
            onClick={() => setPreview(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img src={preview} alt="Ocorrência" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}