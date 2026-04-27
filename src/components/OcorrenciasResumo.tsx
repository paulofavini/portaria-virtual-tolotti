import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  Home,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOcorrencias } from "@/lib/queries";
import { formatUnidadeBloco } from "@/lib/address";

const MAX = 4;

const TIPO_LABEL: Record<string, string> = {
  visitante: "Visitante",
  entrega: "Entrega",
  prestador: "Prestador",
  geral: "Geral",
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OcorrenciasResumo() {
  const ocorrenciasQ = useOcorrencias();

  const items = useMemo(() => {
    const list = (ocorrenciasQ.data ?? []) as Array<{
      id: string;
      tipo: string;
      status: "em_andamento" | "finalizada" | null;
      data_hora: string;
      descricao: string | null;
      nome_pessoa: string | null;
      condominios: { nome: string } | null;
      unidades: { numero: string; blocos: { nome: string } | null } | null;
      moradores: { nome: string } | null;
    }>;
    return [...list]
      .sort((a, b) => (b.data_hora ?? "").localeCompare(a.data_hora ?? ""))
      .slice(0, MAX);
  }, [ocorrenciasQ.data]);

  const total = (ocorrenciasQ.data ?? []).length;

  return (
    <div
      className="bg-card rounded-xl border-2 border-warning/40 overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="h-1 bg-warning" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            <h3 className="font-semibold text-foreground">Ocorrências recentes</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning-foreground">
              {total}
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/ocorrencias">Ver tudo</Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
            Nenhuma ocorrência registrada
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((o) => {
              const tipoLabel = TIPO_LABEL[o.tipo] ?? o.tipo;
              const status = (o.status ?? "em_andamento") as "em_andamento" | "finalizada";
              return (
                <div
                  key={o.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border border-warning/30 bg-background hover:border-warning transition-colors min-h-[200px]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {/* 1) Condomínio em destaque */}
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-warning-foreground shrink-0 mt-0.5" />
                    <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2">
                      {o.condominios?.nome ?? "Sem condomínio"}
                    </h4>
                  </div>

                  {/* 2) Unidade - Bloco | 3) Data/hora */}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {o.unidades && (
                      <div className="inline-flex items-center gap-1.5 w-full">
                        <Home className="h-3 w-3 shrink-0" />
                        <span className="truncate">{formatUnidadeBloco(o.unidades)}</span>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5 w-full">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="truncate">{fmtDateTime(o.data_hora)}</span>
                    </div>
                  </div>

                  {/* 4) Status */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {status === "em_andamento" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-1 rounded bg-warning text-warning-foreground">
                        <Clock className="h-3 w-3" /> em andamento
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-1 rounded bg-success text-success-foreground">
                        <CheckCircle2 className="h-3 w-3" /> finalizada
                      </span>
                    )}
                  </div>

                  {/* 5) Breve relato (tipo embutido) */}
                  <div className="mt-auto pt-2 border-t border-border">
                    <p className="text-xs text-foreground/80 line-clamp-3 whitespace-pre-wrap">
                      <span className="font-semibold text-foreground">{tipoLabel}</span>
                      {o.nome_pessoa ? ` — ${o.nome_pessoa}` : ""}
                      {o.descricao ? `: ${o.descricao}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
