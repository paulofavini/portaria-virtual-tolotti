import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Building2, Pin, AlertTriangle, Wrench, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAvisos } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { DateBadge, getDateStatus, formatDDMM } from "@/components/DateBadge";

const MAX = 4;

type TipoAviso = "informativo" | "urgente" | "manutencao";

const TIPO_LABEL: Record<TipoAviso, string> = {
  informativo: "Informativo",
  urgente: "Urgente",
  manutencao: "Manutenção",
};

function tipoStyles(tipo: TipoAviso) {
  switch (tipo) {
    case "urgente":
      return { Icon: AlertTriangle, badge: "bg-destructive text-destructive-foreground", iconWrap: "bg-destructive/10 text-destructive" };
    case "manutencao":
      return { Icon: Wrench, badge: "bg-amber-500 text-white", iconWrap: "bg-amber-500/10 text-amber-700 dark:text-amber-400" };
    default:
      return { Icon: Info, badge: "bg-primary text-primary-foreground", iconWrap: "bg-primary/10 text-primary" };
  }
}

function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function AvisosResumo() {
  const avisosQ = useAvisos();

  type AvisoRow = {
    id: string;
    titulo: string | null;
    descricao: string | null;
    tipo: TipoAviso;
    data: string; // data_inicio
    data_expiracao: string | null; // data_fim
    fixado: boolean;
    condominios: { nome: string } | null;
  };

  const { items, totalAtivos, accent } = useMemo(() => {
    const list = (avisosQ.data ?? []) as AvisoRow[];
    const today = startOfDay(new Date());

    // Filtro: HOJE >= data_inicio E (data_fim nula OU HOJE <= data_fim)
    const visiveis = list.filter((a) => {
      if (!a.data) return false;
      const inicio = startOfDay(parseLocalDate(a.data));
      if (today.getTime() < inicio.getTime()) {
        // futuro — ainda assim queremos mostrar como "próximo"
        return a.data_expiracao
          ? startOfDay(parseLocalDate(a.data_expiracao)).getTime() >= today.getTime()
          : true;
      }
      // já começou: precisa não ter expirado
      if (!a.data_expiracao) return true;
      const fim = startOfDay(parseLocalDate(a.data_expiracao));
      return today.getTime() <= fim.getTime();
    });

    // Ordenação: 1) em andamento (hoje dentro do período) 2) futuros por data ASC
    const ordenados = [...visiveis].sort((a, b) => {
      const ia = startOfDay(parseLocalDate(a.data)).getTime();
      const ib = startOfDay(parseLocalDate(b.data)).getTime();
      const aEmAndamento = ia <= today.getTime();
      const bEmAndamento = ib <= today.getTime();
      if (aEmAndamento && !bEmAndamento) return -1;
      if (!aEmAndamento && bEmAndamento) return 1;
      // ambos em andamento: mais recentes primeiro; ambos futuros: mais próximos primeiro
      return aEmAndamento ? ib - ia : ia - ib;
    });

    return {
      items: ordenados.slice(0, MAX),
      totalAtivos: visiveis.length,
      accent: visiveis.some((a) => a.tipo === "urgente") ? "bg-destructive" : "bg-primary",
    };
  }, [avisosQ.data]);

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className={cn("h-1", accent)} />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Avisos ativos</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {totalAtivos}
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/avisos">Ver tudo</Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
            Nenhum aviso ativo
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((a) => {
              const s = tipoStyles(a.tipo);
              const inicioStatus = getDateStatus(a.data);
              const temPeriodo =
                !!a.data_expiracao && a.data_expiracao !== a.data;
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors min-h-[200px]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {/* 1) DATA / PERÍODO — destaque principal */}
                  {temPeriodo && inicioStatus !== "hoje" && inicioStatus !== "amanha" ? (
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-muted text-foreground text-sm font-bold tracking-tight w-fit">
                      <span className="text-base leading-none">
                        {formatDDMM(a.data)} até {formatDDMM(a.data_expiracao)}
                      </span>
                    </div>
                  ) : (
                    <DateBadge iso={a.data} />
                  )}

                  {/* 2) Condomínio — destaque secundário */}
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <h4 className="text-base font-semibold text-foreground leading-tight line-clamp-2 min-w-0 flex-1">
                      {a.condominios?.nome ?? "—"}
                    </h4>
                  </div>

                  {/* 3) Título do aviso */}
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", s.iconWrap)}>
                      <s.Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm font-medium text-foreground leading-tight line-clamp-2 min-w-0 flex-1">
                      {a.titulo || "(sem título)"}
                    </p>
                  </div>

                  {/* Tags (tipo + fixado) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", s.badge)}>
                      {TIPO_LABEL[a.tipo]}
                    </span>
                    {a.fixado && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        <Pin className="h-3 w-3" /> Fixado
                      </span>
                    )}
                  </div>

                  {/* 4) Descrição curta (opcional) */}
                  {a.descricao && (
                    <div className="mt-auto pt-2 border-t border-border">
                      <p className="text-xs text-foreground/80 line-clamp-2 whitespace-pre-wrap">
                        {a.descricao}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
