import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileBarChart } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCondominios, useOcorrencias } from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/relatorios/ocorrencias")({
  component: () => (
    <RequireAuth>
      <RelatorioOcorrenciasPage />
    </RequireAuth>
  ),
});

const TIPO_LABEL: Record<string, string> = {
  visitante: "Visitante",
  entrega: "Entrega",
  prestador: "Prestador",
  geral: "Geral",
};

const STATUS_LABEL: Record<string, string> = {
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
};

function RelatorioOcorrenciasPage() {
  const { isAdmin, roles, loading: authLoading } = useAuth();
  const isSindico = roles.includes("sindico");
  const isOperador = roles.includes("operador");
  const canView = isAdmin || isSindico || isOperador;
  const canExport = isAdmin || isSindico;

  const { data: ocorrencias, isLoading } = useOcorrencias();
  const { data: condominios } = useCondominios();

  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [condominioId, setCondominioId] = useState<string>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");

  const filtered = useMemo(() => {
    if (!ocorrencias) return [];
    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59.999`) : null;

    return ocorrencias
      .filter((o) => {
        const dt = new Date(o.data_hora);
        if (inicio && dt < inicio) return false;
        if (fim && dt > fim) return false;
        if (condominioId !== "todos" && o.condominio_id !== condominioId) return false;
        if (tipoFiltro !== "todos" && o.tipo !== tipoFiltro) return false;
        if (statusFiltro !== "todos" && (o.status ?? "em_andamento") !== statusFiltro) return false;
        return true;
      })
      .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());
  }, [ocorrencias, dataInicio, dataFim, condominioId, tipoFiltro, statusFiltro]);

  const exportCSV = () => {
    if (!canExport) {
      toast.error("Sem permissão para exportar");
      return;
    }
    if (!filtered.length) {
      toast.error("Nenhum registro para exportar");
      return;
    }

    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const header = [
      "Data/Hora",
      "Tipo",
      "Nome da pessoa",
      "Documento",
      "Condomínio",
      "Bloco",
      "Unidade",
      "Morador vinculado",
      "Status",
      "Descrição",
    ];

    const rows = filtered.map((o) => [
      new Date(o.data_hora).toLocaleString("pt-BR"),
      TIPO_LABEL[o.tipo as string] ?? o.tipo,
      o.nome_pessoa ?? "",
      o.documento ?? "",
      o.condominios?.nome ?? "",
      o.unidades?.blocos?.nome ?? "",
      o.unidades?.numero ?? "",
      o.moradores?.nome ?? "",
      STATUS_LABEL[o.status ?? "em_andamento"] ?? o.status,
      o.descricao ?? "",
    ]);

    const csv = [header, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");
    // BOM para Excel reconhecer UTF-8
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `ocorrencias_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exportado ${filtered.length} registro(s)`);
  };

  if (!authLoading && !canView) {
    return (
      <div className="pb-24">
        <PageHeader title="Relatório de Ocorrências" />
        <EmptyState
          title="Acesso negado"
          description="Você não tem permissão para visualizar este relatório."
        />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Relatório de Ocorrências"
        description="Visualize e exporte ocorrências por período, condomínio, tipo e status."
        action={
          <Button onClick={exportCSV} disabled={!canExport || !filtered.length}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        }
      />

      {!canExport && (
        <p className="text-xs text-muted-foreground mb-3">
          Seu perfil permite visualizar o relatório, mas não exportá-lo.
        </p>
      )}

      <div
        className="bg-card rounded-xl border border-border p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="space-y-1">
          <Label htmlFor="dt-inicio" className="text-xs">Data inicial</Label>
          <Input
            id="dt-inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dt-fim" className="text-xs">Data final</Label>
          <Input
            id="dt-fim"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Condomínio</Label>
          <Select value={condominioId} onValueChange={setCondominioId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {condominios?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(TIPO_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="finalizada">Finalizada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
        <FileBarChart className="h-3.5 w-3.5" />
        {isLoading ? "Carregando..." : `${filtered.length} registro(s) encontrados`}
      </div>

      {!isLoading && !filtered.length ? (
        <EmptyState
          title="Nenhuma ocorrência"
          description="Ajuste os filtros para ampliar a busca."
        />
      ) : (
        <div
          className="bg-card rounded-xl border border-border overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Data/Hora</th>
                  <th className="text-left font-semibold px-4 py-3">Tipo</th>
                  <th className="text-left font-semibold px-4 py-3">Nome da pessoa</th>
                  <th className="text-left font-semibold px-4 py-3">Unidade</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const status = (o.status ?? "em_andamento") as "em_andamento" | "finalizada";
                  const unidade = o.unidades
                    ? `Bl. ${o.unidades.blocos?.nome ?? "-"}/${o.unidades.numero}`
                    : "—";
                  return (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap text-foreground/90">
                        {new Date(o.data_hora).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {TIPO_LABEL[o.tipo as string] ?? o.tipo}
                      </td>
                      <td className="px-4 py-3">{o.nome_pessoa ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>{unidade}</div>
                        {o.condominios?.nome && (
                          <div className="text-xs text-muted-foreground">{o.condominios.nome}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {status === "em_andamento" ? (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning-foreground">
                            em andamento
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-success/20 text-success">
                            finalizada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}