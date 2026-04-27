import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClipboardList, ChevronRight, CircleDollarSign, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
            Nenhuma solicitação pendente.
          </div>
        ) : (
          <div className="space-y-1">
            {items.slice(0, 5).map((s) => {
              const isPendente = s.status === "pendente";
              return (
                <Link
                  key={s.id}
                  to="/solicitacoes"
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">
                        {TIPO_LABEL[s.tipo]} — {s.descricao}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                          isPendente
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-amber-500 text-white",
                        )}
                      >
                        {isPendente ? "Pendente" : "Em andamento"}
                      </span>
                      {!s.pago && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-warning text-warning-foreground">
                          Não pago
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.condominios?.nome ?? ""}
                      {s.unidades ? ` · Bloco ${s.unidades.blocos?.nome} / Unidade ${s.unidades.numero}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {fmtDate(s.data_solicitacao)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}