import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClipboardList, ChevronRight, CircleDollarSign, Clock, Building2, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TipoSolicitacao = "tag" | "controle" | "imagens" | "acesso" | "outros";
type StatusSolicitacao = "pendente" | "em_andamento" | "concluido" | "cancelado";

const TIPO_LABEL: Record<TipoSolicitacao, string> = {
  tag: "Tag",
  controle: "Controle",
  imagens: "Imagens",
  acesso: "Acesso",
  outros: "Outros",
};

type Row = {
  id: string;
  tipo: TipoSolicitacao;
  descricao: string;
  status: StatusSolicitacao;
  pago: boolean;
  data_solicitacao: string;
  condominios: { nome: string } | null;
  unidades: { numero: string; blocos: { nome: string } | null } | null;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function SolicitacoesResumo() {
  const q = useQuery({
    queryKey: ["solicitacoes", "resumo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("id, tipo, descricao, status, pago, data_solicitacao, condominios(nome), unidades(numero, blocos(nome))")
        .in("status", ["pendente", "em_andamento"])
        .order("data_solicitacao", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const items = q.data ?? [];
  const pendentes = useMemo(() => items.filter((s) => s.status === "pendente"), [items]);
  const naoPagos = useMemo(() => items.filter((s) => !s.pago), [items]);
  const total = items.length;

  // Ordena: pendente primeiro, depois em_andamento; dentro de cada grupo, mais recente primeiro.
  const ordered = useMemo(() => {
    const rank: Record<StatusSolicitacao, number> = {
      pendente: 0,
      em_andamento: 1,
      concluido: 2,
      cancelado: 3,
    };
    return [...items].sort((a, b) => {
      const r = rank[a.status] - rank[b.status];
      if (r !== 0) return r;
      return (b.data_solicitacao ?? "").localeCompare(a.data_solicitacao ?? "");
    });
  }, [items]);

  const accent = pendentes.length > 0 ? "bg-destructive" : naoPagos.length > 0 ? "bg-warning" : "bg-primary";
  const containerTone =
    pendentes.length > 0
      ? "border-destructive/30 bg-destructive/5"
      : naoPagos.length > 0
        ? "border-warning/30 bg-warning/5"
        : "border-border bg-card";

  return (
    <div
      className={cn("rounded-xl border overflow-hidden", containerTone)}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className={cn("h-1", accent)} />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">
              Solicitações{pendentes.length > 0 ? ` (${pendentes.length})` : ""}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {total} ativas
            </span>
            {naoPagos.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-warning text-warning-foreground">
                <CircleDollarSign className="h-3 w-3" />
                {naoPagos.length} não pago{naoPagos.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Link to="/solicitacoes" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
            Ver tudo <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {q.isLoading ? (
          <div className="text-sm text-muted-foreground py-3 text-center">Carregando...</div>
        ) : ordered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
            Nenhuma solicitação no momento
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 max-h-[520px] overflow-y-auto pr-1">
            {ordered.map((s) => {
              const statusInfo =
                s.status === "pendente"
                  ? { label: "Pendente", cls: "bg-destructive text-destructive-foreground" }
                  : s.status === "em_andamento"
                    ? { label: "Em andamento", cls: "bg-amber-500 text-white" }
                    : s.status === "concluido"
                      ? { label: "Concluída", cls: "bg-success text-success-foreground" }
                      : { label: "Cancelada", cls: "bg-muted text-muted-foreground" };
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-start gap-2">
                    <ClipboardList className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                        {TIPO_LABEL[s.tipo]} — {s.descricao}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {s.condominios?.nome && (
                      <div className="inline-flex items-center gap-1.5 w-full">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.condominios.nome}</span>
                      </div>
                    )}
                    {s.unidades && (
                      <div className="inline-flex items-center gap-1.5 w-full">
                        <Home className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {s.unidades.blocos?.nome ? `Bloco ${s.unidades.blocos.nome} / ` : ""}
                          Unidade {s.unidades.numero}
                        </span>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5 w-full">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="truncate">{fmtDate(s.data_solicitacao)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[11px] font-semibold uppercase px-2 py-1 rounded",
                        statusInfo.cls,
                      )}
                    >
                      {statusInfo.label}
                    </span>
                    {!s.pago && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-1 rounded bg-warning text-warning-foreground">
                        <CircleDollarSign className="h-3 w-3" />
                        Não pago
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-2 border-t border-border">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      <Link to="/solicitacoes">Ver detalhes</Link>
                    </Button>
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