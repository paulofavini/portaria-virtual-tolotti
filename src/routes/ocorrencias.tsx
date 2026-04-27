import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOcorrencias, isToday } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  ShieldCheck,
  History,
} from "lucide-react";

function OcorrenciasLayout() {
  const location = useLocation();
  return (
    <RequireAuth>
      {location.pathname === "/ocorrencias" ? <OcorrenciasPage /> : <Outlet />}
    </RequireAuth>
  );
}

export const Route = createFileRoute("/ocorrencias")({
  component: OcorrenciasLayout,
});

const PAGE_SIZE = 8;

function OcorrenciasPage() {
  const { data, isLoading } = useOcorrencias();
  const { canManageOperational } = useAuth();
  const qc = useQueryClient();
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");
  const [page, setPage] = useState(1);

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

  const tiposDisponiveis = useMemo(() => {
    const s = new Set<string>();
    (data ?? []).forEach((o) => o.tipo && s.add(o.tipo));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = busca.trim().toLowerCase();
    return data.filter((o) => {
      if (tipoFiltro !== "todos" && o.tipo !== tipoFiltro) return false;
      if (statusFiltro !== "todos" && (o.status ?? "em_andamento") !== statusFiltro) return false;
      if (q) {
        const haystack = [
          o.tipo,
          o.descricao,
          o.providencia,
          o.reclamante_nome,
          o.reclamado_nome,
          o.condominios?.nome,
          o.unidades?.numero,
          o.unidades?.blocos?.nome,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data, tipoFiltro, statusFiltro, busca]);

  // Atual = hoje | Anteriores = restante
  const atuais = useMemo(() => filtered.filter((o) => isToday(o.data_hora)), [filtered]);
  const anteriores = useMemo(
    () => filtered.filter((o) => !isToday(o.data_hora)),
    [filtered],
  );

  // Paginação aplicada APENAS sobre anteriores (atuais ficam todas no topo)
  const totalPages = Math.max(1, Math.ceil(anteriores.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const anterioresPage = anteriores.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <div className="pb-24">
      <PageHeader
        title="Ocorrências"
        description="Registro de ocorrências para a portaria e troca de turno."
        action={
          canManageOperational && (
            <Button asChild>
              <Link to="/ocorrencias/novo">
                <Plus className="h-4 w-4 mr-1" /> Nova ocorrência
              </Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <Input
          placeholder="Buscar por descrição, pessoa, unidade..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={tipoFiltro}
          onValueChange={(v) => {
            setTipoFiltro(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tiposDisponiveis.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFiltro}
          onValueChange={(v) => {
            setStatusFiltro(v);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="finalizada">Finalizadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma ocorrência"
          description={
            data?.length
              ? "Nada encontrado com esses filtros."
              : "Clique em + Nova ocorrência para começar."
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Hoje */}
          {atuais.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  Hoje
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {atuais.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {atuais.map((o) => (
                  <OcorrenciaCard
                    key={o.id}
                    o={o}
                    canManage={canManageOperational}
                    onFinalizar={() => finalizar.mutate(o.id)}
                    finalizing={finalizar.isPending}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Anteriores */}
          {anteriores.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  Ocorrências anteriores
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {anteriores.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {anterioresPage.map((o) => (
                  <OcorrenciaCard
                    key={o.id}
                    o={o}
                    canManage={canManageOperational}
                    onFinalizar={() => finalizar.mutate(o.id)}
                    finalizing={finalizar.isPending}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">
                    Página {safePage} de {totalPages} ·{" "}
                    {anteriores.length} registro{anteriores.length === 1 ? "" : "s"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

type OcorrenciaItem = NonNullable<ReturnType<typeof useOcorrencias>["data"]>[number];

function OcorrenciaCard({
  o,
  canManage,
  onFinalizar,
  finalizing,
}: {
  o: OcorrenciaItem;
  canManage: boolean;
  onFinalizar: () => void;
  finalizing: boolean;
}) {
  const status = (o.status ?? "em_andamento") as "em_andamento" | "finalizada";
  const local = [
    o.condominios?.nome,
    o.unidades && `Bl. ${o.unidades.blocos?.nome} / ${o.unidades.numero}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase px-2 py-1 rounded bg-primary/10 text-primary">
            <AlertTriangle className="h-3.5 w-3.5" />
            {o.tipo}
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
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(o.data_hora).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {local && <p className="text-xs text-muted-foreground">{local}</p>}

      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{o.descricao}</p>

      {(o.reclamante_nome || o.reclamado_nome) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {o.reclamante_nome && (
            <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
              <span className="text-muted-foreground">Reclamante: </span>
              <span className="font-medium text-foreground">{o.reclamante_nome}</span>
            </div>
          )}
          {o.reclamado_nome && (
            <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
              <span className="text-muted-foreground">Reclamado: </span>
              <span className="font-medium text-foreground">{o.reclamado_nome}</span>
            </div>
          )}
        </div>
      )}

      {o.providencia && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-0.5">
            Providência
          </p>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{o.providencia}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border">
        <div className="flex items-center gap-3 text-xs">
          <span
            className={
              o.sindico_ciente
                ? "inline-flex items-center gap-1 text-success font-medium"
                : "inline-flex items-center gap-1 text-muted-foreground"
            }
          >
            {o.sindico_ciente ? (
              <CheckCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Síndico {o.sindico_ciente ? "ciente" : "não ciente"}
          </span>
          <span
            className={
              o.emerson_ciente
                ? "inline-flex items-center gap-1 text-success font-medium"
                : "inline-flex items-center gap-1 text-muted-foreground"
            }
          >
            {o.emerson_ciente ? (
              <CheckCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Emerson {o.emerson_ciente ? "ciente" : "não ciente"}
          </span>
        </div>
        {canManage && status === "em_andamento" && (
          <Button size="sm" variant="outline" onClick={onFinalizar} disabled={finalizing}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Finalizar
          </Button>
        )}
      </div>
    </div>
  );
}