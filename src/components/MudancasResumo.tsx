import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Truck, Building2, Home, ArrowDownToLine, ArrowUpFromLine, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMudancas } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { formatUnidadeBloco } from "@/lib/address";
import { DateBadge } from "@/components/DateBadge";

const MAX = 4;

function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

export function MudancasResumo() {
  const mudancasQ = useMudancas();

  const proximas = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = (mudancasQ.data ?? []) as Array<{
      id: string;
      tipo: "entrada" | "saida";
      data: string;
      condominios: { nome: string } | null;
      unidades: { numero: string; blocos: { nome: string } | null } | null;
      moradores: { nome: string } | null;
    }>;
    return list
      .filter((m) => {
        if (!m.data) return false;
        const d = parseLocalDate(m.data);
        d.setHours(0, 0, 0, 0);
        return d.getTime() >= today.getTime();
      })
      .sort((a, b) => parseLocalDate(a.data).getTime() - parseLocalDate(b.data).getTime())
      .slice(0, MAX);
  }, [mudancasQ.data]);

  const totalProximas = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ((mudancasQ.data ?? []) as Array<{ data: string }>).filter((m) => {
      if (!m.data) return false;
      const d = parseLocalDate(m.data);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= today.getTime();
    }).length;
  }, [mudancasQ.data]);

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="h-1 bg-primary" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Próximas mudanças</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {totalProximas}
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/mudancas" search={{ periodo: undefined }}>Ver tudo</Link>
          </Button>
        </div>

        {proximas.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
            Nenhuma mudança próxima
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {proximas.map((m) => {
              const isEntrada = m.tipo === "entrada";
              const TipoIcon = isEntrada ? ArrowDownToLine : ArrowUpFromLine;
              return (
                <div
                  key={m.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors min-h-[200px]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <DateBadge iso={m.data} />

                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <h4 className="text-base font-semibold text-foreground leading-tight line-clamp-2 min-w-0 flex-1">
                      {m.condominios?.nome ?? "—"}
                    </h4>
                  </div>

                  {m.unidades && (
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                      <Home className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{formatUnidadeBloco(m.unidades)}</span>
                    </div>
                  )}

                  {m.moradores?.nome && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.moradores.nome}</span>
                    </div>
                  )}

                  <div className="mt-auto pt-2 border-t border-border">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-semibold uppercase px-2 py-1 rounded",
                        isEntrada
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning-foreground",
                      )}
                    >
                      <TipoIcon className="h-3 w-3" />
                      {isEntrada ? "Entrada" : "Saída"}
                    </span>
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
