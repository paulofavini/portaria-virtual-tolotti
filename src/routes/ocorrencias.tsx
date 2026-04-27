import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useOcorrencias } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  Plus,
  AlertTriangle,
  Image as ImageIcon,
  X,
  CheckCircle2,
  UserCheck,
  Package,
  Wrench,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/ocorrencias")({
  component: () => (
    <RequireAuth>
      <OcorrenciasPage />
    </RequireAuth>
  ),
});

const TIPO_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  visitante: { label: "Visitante", icon: UserCheck, tone: "bg-primary/10 text-primary" },
  entrega: { label: "Entrega", icon: Package, tone: "bg-success/15 text-success" },
  prestador: { label: "Prestador", icon: Wrench, tone: "bg-warning/15 text-warning-foreground" },
  geral: { label: "Geral", icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
};

function OcorrenciasPage() {
  const { data, isLoading } = useOcorrencias();
  const { canManageOperational } = useAuth();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [dataFiltro, setDataFiltro] = useState<string>("");

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

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((o) => {
      if (tipoFiltro !== "todos" && o.tipo !== tipoFiltro) return false;
      if (statusFiltro !== "todos" && (o.status ?? "em_andamento") !== statusFiltro) return false;
      if (dataFiltro) {
        const d = new Date(o.data_hora).toISOString().slice(0, 10);
        if (d !== dataFiltro) return false;
      }
      return true;
    });
  }, [data, tipoFiltro, statusFiltro, dataFiltro]);

  return (
    <div className="pb-24">
      <PageHeader
        title="Ocorrências"
        description="Registro de eventos e situações observadas pela portaria."
        action={
          canManageOperational && (
            <Link to="/ocorrencias/novo">
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Nova ocorrência
              </Button>
            </Link>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_META).map(([v, m]) => (
              <SelectItem key={v} value={v}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="finalizada">Finalizadas</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dataFiltro}
          onChange={(e) => setDataFiltro(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !filtered.length ? (
        <EmptyState
          title="Nenhuma ocorrência"
          description={
            data?.length
              ? "Nada encontrado com esses filtros."
              : "Clique em + Nova ocorrência para começar."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const meta = TIPO_META[o.tipo as string] ?? {
              label: o.tipo,
              icon: AlertTriangle,
              tone: "bg-muted text-foreground",
            };
            const Icon = meta.icon;
            const status = (o.status ?? "em_andamento") as "em_andamento" | "finalizada";
            const subtitle = [
              o.condominios?.nome,
              o.unidades && `Bl. ${o.unidades.blocos?.nome}/${o.unidades.numero}`,
              o.moradores?.nome,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <div
                key={o.id}
                className="bg-card rounded-xl border border-border p-4 flex items-start gap-3"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {o.imagem_url ? (
                  <button
                    onClick={() => setPreview(o.imagem_url!)}
                    className={`h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-90 ${meta.tone}`}
                  >
                    <img src={o.imagem_url} alt="" className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className={`h-14 w-14 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.tone}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {meta.label}
                      {o.nome_pessoa ? ` — ${o.nome_pessoa}` : ""}
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
                    {o.imagem_url && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> foto
                      </span>
                    )}
                  </div>
                  {o.documento && (
                    <p className="text-xs text-muted-foreground">Doc.: {o.documento}</p>
                  )}
                  <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">{o.descricao}</p>
                  {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(o.data_hora).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {canManageOperational && status === "em_andamento" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => finalizar.mutate(o.id)}
                      disabled={finalizar.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Finalizar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/20 text-white flex items-center justify-center hover:bg-background/30"
            onClick={() => setPreview(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img src={preview} alt="Ocorrência" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
