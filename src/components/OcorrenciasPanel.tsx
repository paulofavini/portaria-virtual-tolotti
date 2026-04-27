import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOcorrenciasByCondo } from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  AlertTriangle,
  UserCheck,
  Package,
  Wrench,
  Clock,
  CheckCircle2,
} from "lucide-react";

const TIPO_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  visitante: { label: "Visitante", icon: UserCheck, tone: "bg-primary/10 text-primary" },
  entrega: { label: "Entrega", icon: Package, tone: "bg-success/15 text-success" },
  prestador: { label: "Prestador", icon: Wrench, tone: "bg-warning/15 text-warning-foreground" },
  geral: { label: "Geral", icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
};

export function OcorrenciasPanel({ condominioId }: { condominioId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { canManageOperational } = useAuth();
  const { data, isLoading } = useOcorrenciasByCondo(condominioId);

  const finalizar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ocorrencias")
        .update({ status: "finalizada", finalizada_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ocorrência finalizada");
      qc.invalidateQueries({ queryKey: ["ocorrencias"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-foreground">Ocorrências recentes</h3>
        {canManageOperational && (
          <Button
            size="sm"
            onClick={() =>
              navigate({ to: "/ocorrencias/novo", search: { condominioId } })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Nova ocorrência
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !data?.length ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          Nenhuma ocorrência registrada neste condomínio.
        </div>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 10).map((o) => {
            const meta = TIPO_META[o.tipo as string] ?? {
              label: o.tipo,
              icon: AlertTriangle,
              tone: "bg-muted text-foreground",
            };
            const Icon = meta.icon;
            const status = (o.status ?? "em_andamento") as "em_andamento" | "finalizada";
            return (
              <div
                key={o.id}
                className="bg-card rounded-xl border border-border p-3 flex items-start gap-3"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${meta.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {meta.label}
                      {o.nome_pessoa ? ` — ${o.nome_pessoa}` : ""}
                    </span>
                    {status === "em_andamento" ? (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning-foreground inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> em andamento
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-success/20 text-success inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> finalizada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {o.unidades && `Bl. ${o.unidades.blocos?.nome}/${o.unidades.numero}`}
                    {o.moradores && ` · ${o.moradores.nome}`}
                  </p>
                  <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{o.descricao}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(o.data_hora).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {canManageOperational && status === "em_andamento" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => finalizar.mutate(o.id)}
                      disabled={finalizar.isPending}
                    >
                      Finalizar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
