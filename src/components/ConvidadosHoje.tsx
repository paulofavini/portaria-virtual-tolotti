import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Home, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useEventos, isToday } from "@/lib/queries";
import { ConvidadosDialog, type EventoRow } from "@/components/EventosManager";
import { cn } from "@/lib/utils";

export function ConvidadosHoje() {
  const eventosQ = useEventos();
  const [openEvento, setOpenEvento] = useState<EventoRow | null>(null);

  const eventosHoje = useMemo(
    () => (eventosQ.data ?? []).filter((e) => isToday(e.data)) as unknown as EventoRow[],
    [eventosQ.data],
  );

  const eventoIds = useMemo(() => eventosHoje.map((e) => e.id), [eventosHoje]);

  // Contagem de convidados (total e presentes) por evento do dia
  const counts = useQuery({
    queryKey: ["evento_convidados", "counts", "hoje", eventoIds.join(",")],
    enabled: eventoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_convidados")
        .select("evento_id, presente")
        .in("evento_id", eventoIds);
      if (error) throw error;
      const map = new Map<string, { total: number; presentes: number }>();
      (data ?? []).forEach((c) => {
        const cur = map.get(c.evento_id) ?? { total: 0, presentes: 0 };
        cur.total += 1;
        if (c.presente) cur.presentes += 1;
        map.set(c.evento_id, cur);
      });
      return map;
    },
  });

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="h-1 bg-primary" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Eventos do dia</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {eventosHoje.length}
            </span>
          </div>
        </div>

        {eventosHoje.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
            Nenhum evento para hoje
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 max-h-[520px] overflow-y-auto pr-1">
            {eventosHoje.map((e) => {
              const c = counts.data?.get(e.id);
              const total = c?.total ?? 0;
              const presentes = c?.presentes ?? 0;
              const todosPresentes = total > 0 && presentes === total;
              return (
                <div
                  key={e.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors min-h-[200px]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  {/* Linha 1 — Condomínio (maior destaque) */}
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <h4 className="text-base font-semibold text-foreground leading-tight line-clamp-2 min-w-0 flex-1">
                      {e.condominios?.nome ?? "—"}
                    </h4>
                  </div>

                  {/* Linha 2 — Unidade + bloco (destaque médio) */}
                  {e.unidades && (
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                      <Home className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {e.unidades.blocos?.nome ? `Bloco ${e.unidades.blocos.nome} / ` : ""}
                        Unidade {e.unidades.numero}
                      </span>
                    </div>
                  )}

                  {/* Linha 3 — Nome do evento (menor destaque) */}
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <PartyPopper className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {e.titulo || e.descricao || "Evento"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border">
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2 py-1 rounded",
                        total === 0
                          ? "bg-muted text-muted-foreground"
                          : todosPresentes
                            ? "bg-success text-success-foreground"
                            : "bg-primary/10 text-primary",
                      )}
                    >
                      {presentes}/{total} presentes
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenEvento(e)}
                      className="shrink-0"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Convidados
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {openEvento && (
        <ConvidadosDialog evento={openEvento} onClose={() => setOpenEvento(null)} />
      )}
    </div>
  );
}