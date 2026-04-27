import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Wrench, Building2, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChamados } from "@/lib/queries";
import { cn } from "@/lib/utils";

const MAX = 4;

type StatusChamado =
  | "aberto"
  | "pendente"
  | "em_andamento"
  | "aguardando_terceiro"
  | "resolvido"
  | "concluido"
  | "cancelado";

const STATUS_LABEL: Record<StatusChamado, string> = {
  aberto: "Aberto",
  pendente: "Aberto",
  em_andamento: "Em andamento",
  aguardando_terceiro: "Aguardando terceiro",
  resolvido: "Resolvido",
  concluido: "Resolvido",
  cancelado: "Cancelado",
};

function statusStyles(status: StatusChamado) {
  switch (status) {
    case "aberto":
    case "pendente":
      return "bg-destructive text-destructive-foreground";
    case "em_andamento":
      return "bg-amber-500 text-white";
    case "aguardando_terceiro":
      return "bg-orange-500 text-white";
    case "resolvido":
    case "concluido":
      return "bg-success text-success-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const OPEN_STATUSES: StatusChamado[] = [
  "aberto",
  "pendente",
  "em_andamento",
  "aguardando_terceiro",
];

function fmtData(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ChamadosResumo() {
  const chamadosQ = useChamados();

  const items = useMemo(() => {
    const rank: Record<StatusChamado, number> = {
      aberto: 0,
      pendente: 0,
      em_andamento: 1,
      aguardando_terceiro: 2,
      resolvido: 3,
      concluido: 3,
      cancelado: 4,
    };
    const list = (chamadosQ.data ?? []) as Array<{
      id: string;
      categoria: string | null;
      tipo: string | null;
      descricao: string | null;
      status: StatusChamado;
      data_abertura: string | null;
      condominios: { nome: string } | null;
    }>;
    return [...list]
      .filter((c) => OPEN_STATUSES.includes(c.status))
      .sort((a, b) => {
        const r = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
        if (r !== 0) return r;
        return (b.data_abertura ?? "").localeCompare(a.data_abertura ?? "");
      })
      .slice(0, MAX);
  }, [chamadosQ.data]);

  const total = (chamadosQ.data ?? []).filter((c) =>
    OPEN_STATUSES.includes(c.status as StatusChamado),
  ).length;

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="h-1 bg-success" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Chamados técnicos</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {total}
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/chamados">Ver tudo</Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
            Nenhum chamado em aberto
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors min-h-[200px]"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start gap-2">
                  <div className="h-7 w-7 rounded-md flex items-center justify-center shrink-0 bg-success/15 text-success">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                      {c.categoria || c.tipo || "Chamado"}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", statusStyles(c.status))}>
                    {STATUS_LABEL[c.status]}
                  </span>
                  {c.tipo && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-warning/15 text-warning-foreground">
                      <AlertCircle className="h-3 w-3" /> {c.tipo}
                    </span>
                  )}
                </div>

                {c.descricao && (
                  <p className="text-xs text-foreground/80 line-clamp-3 whitespace-pre-wrap">
                    {c.descricao}
                  </p>
                )}

                <div className="space-y-1 text-[11px] text-muted-foreground mt-auto pt-2 border-t border-border">
                  {c.condominios?.nome && (
                    <div className="inline-flex items-center gap-1.5 w-full">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.condominios.nome}</span>
                    </div>
                  )}
                  {c.data_abertura && (
                    <div className="inline-flex items-center gap-1.5 w-full">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="truncate">{fmtData(c.data_abertura)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
