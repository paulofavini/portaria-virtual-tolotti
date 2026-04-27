import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Building2, Pin, AlertTriangle, Wrench, Info, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAvisos } from "@/lib/queries";
import { cn } from "@/lib/utils";

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

function fmtData(iso?: string | null) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function AvisosResumo() {
  const avisosQ = useAvisos();

  const items = useMemo(() => {
    const list = (avisosQ.data ?? []) as Array<{
      id: string;
      titulo: string | null;
      descricao: string | null;
      tipo: TipoAviso;
      data: string;
      fixado: boolean;
      condominios: { nome: string } | null;
    }>;
    return list.slice(0, MAX);
  }, [avisosQ.data]);

  const total = (avisosQ.data ?? []).length;
  const accent = (avisosQ.data ?? []).some((a) => a.tipo === "urgente") ? "bg-destructive" : "bg-primary";

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
              {total}
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
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors min-h-[200px]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", s.iconWrap)}>
                      <s.Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                        {a.titulo || "(sem título)"}
                      </h4>
                    </div>
                  </div>

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

                  {a.descricao && (
                    <p className="text-xs text-foreground/80 line-clamp-3 whitespace-pre-wrap">
                      {a.descricao}
                    </p>
                  )}

                  <div className="space-y-1 text-[11px] text-muted-foreground mt-auto pt-2 border-t border-border">
                    {a.condominios?.nome && (
                      <div className="inline-flex items-center gap-1.5 w-full">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{a.condominios.nome}</span>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5 w-full">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="truncate">{fmtData(a.data)}</span>
                    </div>
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
