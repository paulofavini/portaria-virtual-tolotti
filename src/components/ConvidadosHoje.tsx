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

  if (eventosHoje.length === 0) return null;

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="h-1 bg-primary" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Convidados dos eventos de hoje</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {eventosHoje.length}
            </span>
          </div>
        </div>

        <ul className="space-y-2">
          {eventosHoje.map((e) => {
            const c = counts.data?.get(e.id);
            const total = c?.total ?? 0;
            const presentes = c?.presentes ?? 0;
            const todosPresentes = total > 0 && presentes === total;
            return (
              <li
                key={e.id}
                className="flex items-start sm:items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 transition-colors flex-col sm:flex-row"
              >
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PartyPopper className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {e.titulo || e.descricao || "Evento"}
                    </span>
                    {total > 0 && (
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                          todosPresentes
                            ? "bg-success text-success-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {presentes}/{total} presentes
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    {e.condominios?.nome && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {e.condominios.nome}
                      </span>
                    )}
                    {e.unidades && (
                      <span className="inline-flex items-center gap-1">
                        <Home className="h-3 w-3" />
                        {e.unidades.blocos?.nome ? `Bloco ${e.unidades.blocos.nome} / ` : ""}
                        Unidade {e.unidades.numero}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenEvento(e)}
                  className="w-full sm:w-auto shrink-0"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Ver lista
                </Button>
              </li>
            );
          })}
        </ul>
      </div>

      {openEvento && (
        <ConvidadosDialog evento={openEvento} onClose={() => setOpenEvento(null)} />
      )}
    </div>
  );
}