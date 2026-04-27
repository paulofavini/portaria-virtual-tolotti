import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, FileBarChart, FileText, Filter, ShieldCheck } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useCondominios } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import {
  exportCSV,
  generateReportPDF,
  type ReportFilter,
  fmtDate,
  fmtDateTime,
  type Column,
} from "@/lib/export-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/relatorios/")({
  component: () => (
    <RequireAuth>
      <RelatoriosPage />
    </RequireAuth>
  ),
});

type OperationalKey =
  | "ocorrencias"
  | "fornecedores"
  | "avisos"
  | "eventos"
  | "mudancas"
  | "chamados"
  | "solicitacoes";

type CadastralKey = "condominios" | "moradores" | "usuarios";

const OP_LABELS: Record<OperationalKey, string> = {
  ocorrencias: "Ocorrências",
  fornecedores: "Liberações",
  avisos: "Avisos",
  eventos: "Eventos",
  mudancas: "Mudanças",
  chamados: "Chamados",
  solicitacoes: "Solicitações",
};

const CAD_LABELS: Record<CadastralKey, string> = {
  condominios: "Condomínios",
  moradores: "Moradores",
  usuarios: "Usuários",
};

function RelatoriosPage() {
  const { isAdmin, roles, loading } = useAuth();
  const isSindico = roles.includes("sindico");
  const isOperador = roles.includes("operador");
  const canView = isAdmin || isSindico || isOperador;

  if (!loading && !canView) {
    return (
      <div className="pb-24">
        <PageHeader title="Relatórios" />
        <EmptyState title="Acesso negado" description="Você não tem permissão para visualizar relatórios." />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Relatórios"
        description="Central de relatórios operacionais, cadastrais e de auditoria."
      />
      <Tabs defaultValue="operacional">
        <TabsList>
          <TabsTrigger value="operacional">
            <FileBarChart className="h-4 w-4 mr-1" /> Operacional
          </TabsTrigger>
          <TabsTrigger value="cadastral">
            <FileText className="h-4 w-4 mr-1" /> Cadastral
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="auditoria">
              <ShieldCheck className="h-4 w-4 mr-1" /> Auditoria
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="operacional" className="space-y-4">
          <OperacionalSection />
        </TabsContent>
        <TabsContent value="cadastral" className="space-y-4">
          <CadastralSection />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="auditoria" className="space-y-4">
            <AuditoriaSection />
          </TabsContent>
        )}
      </Tabs>

      <div className="mt-6 text-xs text-muted-foreground">
        Procurando o antigo relatório de ocorrências?{" "}
        <Link to="/relatorios/ocorrencias" className="underline">Acessar versão dedicada</Link>.
      </div>
    </div>
  );
}

/* ============================================================
   OPERACIONAL
   ============================================================ */

function OperacionalSection() {
  const [reportType, setReportType] = useState<OperationalKey>("ocorrencias");
  const { data: condominios } = useCondominios();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [condominioId, setCondominioId] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  const query = useOperationalQuery(reportType);

  const filtered = useMemo(() => {
    if (!query.data) return [];
    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59.999`) : null;
    return query.data.filter((r: any) => {
      const dateField = pickDate(reportType, r);
      if (dateField) {
        const dt = new Date(dateField);
        if (inicio && dt < inicio) return false;
        if (fim && dt > fim) return false;
      }
      if (condominioId !== "todos" && r.condominio_id && r.condominio_id !== condominioId)
        return false;
      if (statusFiltro !== "todos") {
        const status = pickStatus(reportType, r);
        if (status !== statusFiltro) return false;
      }
      return true;
    });
  }, [query.data, reportType, dataInicio, dataFim, condominioId, statusFiltro]);

  const columns = getOperationalColumns(reportType);
  const statusOptions = getStatusOptions(reportType);

  const handleExportCSV = () => {
    if (!filtered.length) return toast.error("Nenhum registro para exportar");
    exportCSV(`relatorio_${reportType}_${stamp()}`, columns, filtered);
    toast.success(`Exportado ${filtered.length} registro(s)`);
  };
  const handleExportPDF = () => {
    if (!filtered.length) return toast.error("Nenhum registro para exportar");
    const { condominio, filters } = buildMeta(condominios, condominioId, dataInicio, dataFim, statusFiltro);
    generateReportPDF({
      filename: `relatorio_${reportType}_${stamp()}`,
      title: `Relatório — ${OP_LABELS[reportType]}`,
      columns,
      data: filtered,
      condominio,
      filters,
    }).then(() => toast.success(`PDF gerado com ${filtered.length} registro(s)`));
  };

  return (
    <div className="space-y-4">
      <div
        className="bg-card rounded-xl border border-border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="space-y-1">
          <Label className="text-xs">Tipo de relatório</Label>
          <Select value={reportType} onValueChange={(v) => setReportType(v as OperationalKey)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(OP_LABELS).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data inicial</Label>
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data final</Label>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Condomínio</Label>
          <Select value={condominioId} onValueChange={setCondominioId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {condominios?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFiltro} onValueChange={setStatusFiltro} disabled={!statusOptions.length}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ResultsBlock
        loading={query.isLoading}
        rows={filtered}
        columns={columns}
        onCSV={handleExportCSV}
        onPDF={handleExportPDF}
      />
    </div>
  );
}

function useOperationalQuery(type: OperationalKey) {
  return useQuery({
    queryKey: ["report", "op", type],
    queryFn: async () => {
      switch (type) {
        case "ocorrencias": {
          const { data, error } = await supabase
            .from("ocorrencias")
            .select("*, condominios(nome), unidades(numero, blocos(nome))")
            .order("data_hora", { ascending: false });
          if (error) throw error;
          return data;
        }
        case "fornecedores": {
          const { data, error } = await supabase
            .from("fornecedores")
            .select("*")
            .order("nome");
          if (error) throw error;
          return data;
        }
        case "avisos": {
          const { data, error } = await supabase
            .from("avisos")
            .select("*, condominios(nome)")
            .order("created_at", { ascending: false });
          if (error) throw error;
          return data;
        }
        case "eventos": {
          const { data, error } = await supabase
            .from("eventos")
            .select("*, condominios(nome), unidades(numero, blocos(nome)), moradores(nome)")
            .order("data", { ascending: false });
          if (error) throw error;
          return data;
        }
        case "mudancas": {
          const { data, error } = await supabase
            .from("mudancas")
            .select("*, condominios(nome), unidades(numero, blocos(nome)), moradores(nome)")
            .order("data", { ascending: false });
          if (error) throw error;
          return data;
        }
        case "chamados": {
          const { data, error } = await supabase
            .from("chamados_tecnicos")
            .select("*, condominios(nome)")
            .order("data_abertura", { ascending: false });
          if (error) throw error;
          return data;
        }
        case "solicitacoes": {
          const { data, error } = await supabase
            .from("solicitacoes")
            .select("*, condominios(nome), unidades(numero, blocos(nome)), moradores(nome)")
            .order("data_solicitacao", { ascending: false });
          if (error) throw error;
          return data;
        }
      }
    },
  });
}

function pickDate(type: OperationalKey, r: any): string | null {
  switch (type) {
    case "ocorrencias": return r.data_hora;
    case "avisos": return r.data ?? r.created_at;
    case "eventos":
    case "mudancas": return r.data;
    case "chamados": return r.data_abertura;
    case "solicitacoes": return r.data_solicitacao;
    case "fornecedores": return r.created_at;
  }
}

function pickStatus(type: OperationalKey, r: any): string | null {
  switch (type) {
    case "ocorrencias": return r.status === "finalizada" ? "concluido" : "pendente";
    case "chamados": return r.status === "concluido" || r.status === "finalizado" ? "concluido" : "pendente";
    case "solicitacoes": return r.status === "concluido" ? "concluido" : "pendente";
    case "avisos": return r.ativo ? "pendente" : "concluido";
    case "eventos":
    case "mudancas":
    case "fornecedores": return null;
  }
}

function getStatusOptions(type: OperationalKey): { value: string; label: string }[] {
  if (["ocorrencias", "chamados", "solicitacoes", "avisos"].includes(type)) {
    return [
      { value: "pendente", label: "Pendente / Em andamento" },
      { value: "concluido", label: "Concluído / Finalizado" },
    ];
  }
  return [];
}

function getOperationalColumns(type: OperationalKey): Column<any>[] {
  switch (type) {
    case "ocorrencias":
      return [
        { key: "data_hora", label: "Data/Hora", accessor: (r) => fmtDateTime(r.data_hora) },
        { key: "tipo", label: "Tipo", accessor: (r) => r.tipo ?? "" },
        { key: "condominio", label: "Condomínio", accessor: (r) => r.condominios?.nome ?? "" },
        { key: "unidade", label: "Unidade", accessor: (r) => r.unidades ? `Bl. ${r.unidades.blocos?.nome ?? "-"}/${r.unidades.numero}` : "" },
        { key: "nome_pessoa", label: "Pessoa", accessor: (r) => r.nome_pessoa ?? "" },
        { key: "status", label: "Status", accessor: (r) => r.status ?? "" },
        { key: "descricao", label: "Descrição", accessor: (r) => r.descricao ?? "" },
      ];
    case "fornecedores":
      return [
        { key: "nome", label: "Nome", accessor: (r) => r.nome ?? "" },
        { key: "contato_nome", label: "Contato", accessor: (r) => r.contato_nome ?? "" },
        { key: "telefone", label: "Telefone", accessor: (r) => r.telefone ?? "" },
        { key: "numero_cliente", label: "N° Cliente", accessor: (r) => r.numero_cliente ?? "" },
        { key: "numero_cadastro", label: "N° Cadastro", accessor: (r) => r.numero_cadastro ?? "" },
        { key: "created_at", label: "Cadastrado em", accessor: (r) => fmtDateTime(r.created_at) },
      ];
    case "avisos":
      return [
        { key: "data", label: "Data", accessor: (r) => fmtDate(r.data) },
        { key: "titulo", label: "Título", accessor: (r) => r.titulo ?? "" },
        { key: "tipo", label: "Tipo", accessor: (r) => r.tipo ?? "" },
        { key: "prioridade", label: "Prioridade", accessor: (r) => r.prioridade ?? "" },
        { key: "condominio", label: "Condomínio", accessor: (r) => r.condominios?.nome ?? "" },
        { key: "ativo", label: "Status", accessor: (r) => r.ativo ? "Ativo" : "Encerrado" },
      ];
    case "eventos":
      return [
        { key: "data", label: "Data", accessor: (r) => fmtDate(r.data) },
        { key: "horario", label: "Horário", accessor: (r) => r.horario ?? "" },
        { key: "titulo", label: "Título", accessor: (r) => r.titulo ?? "" },
        { key: "local", label: "Local", accessor: (r) => r.local ?? "" },
        { key: "condominio", label: "Condomínio", accessor: (r) => r.condominios?.nome ?? "" },
        { key: "morador", label: "Morador", accessor: (r) => r.moradores?.nome ?? "" },
        { key: "unidade", label: "Unidade", accessor: (r) => r.unidades ? `Bl. ${r.unidades.blocos?.nome ?? "-"}/${r.unidades.numero}` : "" },
      ];
    case "mudancas":
      return [
        { key: "data", label: "Data", accessor: (r) => fmtDate(r.data) },
        { key: "tipo", label: "Tipo", accessor: (r) => r.tipo ?? "" },
        { key: "condominio", label: "Condomínio", accessor: (r) => r.condominios?.nome ?? "" },
        { key: "unidade", label: "Unidade", accessor: (r) => r.unidades ? `Bl. ${r.unidades.blocos?.nome ?? "-"}/${r.unidades.numero}` : "" },
        { key: "morador", label: "Morador", accessor: (r) => r.moradores?.nome ?? "" },
      ];
    case "chamados":
      return [
        { key: "data_abertura", label: "Abertura", accessor: (r) => fmtDateTime(r.data_abertura) },
        { key: "tipo", label: "Tipo", accessor: (r) => r.tipo ?? "" },
        { key: "categoria", label: "Categoria", accessor: (r) => r.categoria ?? "" },
        { key: "condominio", label: "Condomínio", accessor: (r) => r.condominios?.nome ?? "" },
        { key: "responsavel", label: "Responsável", accessor: (r) => r.responsavel ?? "" },
        { key: "status", label: "Status", accessor: (r) => r.status ?? "" },
        { key: "data_conclusao", label: "Conclusão", accessor: (r) => fmtDateTime(r.data_conclusao) },
        { key: "descricao", label: "Descrição", accessor: (r) => r.descricao ?? "" },
      ];
    case "solicitacoes":
      return [
        { key: "data_solicitacao", label: "Solicitado em", accessor: (r) => fmtDateTime(r.data_solicitacao) },
        { key: "tipo", label: "Tipo", accessor: (r) => r.tipo ?? "" },
        { key: "morador", label: "Morador", accessor: (r) => r.moradores?.nome ?? r.morador_nome ?? "" },
        { key: "condominio", label: "Condomínio", accessor: (r) => r.condominios?.nome ?? "" },
        { key: "unidade", label: "Unidade", accessor: (r) => r.unidades ? `Bl. ${r.unidades.blocos?.nome ?? "-"}/${r.unidades.numero}` : "" },
        { key: "valor", label: "Valor", accessor: (r) => r.valor != null ? `R$ ${Number(r.valor).toFixed(2)}` : "" },
        { key: "pago", label: "Pago", accessor: (r) => r.pago ? "Sim" : "Não" },
        { key: "status", label: "Status", accessor: (r) => r.status ?? "" },
        { key: "descricao", label: "Descrição", accessor: (r) => r.descricao ?? "" },
      ];
  }
}

/* ============================================================
   CADASTRAL
   ============================================================ */

function CadastralSection() {
  const [type, setType] = useState<CadastralKey>("condominios");
  const allCols = getCadastralColumns(type);
  const [selected, setSelected] = useState<string[]>(allCols.map((c) => c.key));

  // reset on type change
  useEffect(() => {
    setSelected(getCadastralColumns(type).map((c) => c.key));
  }, [type]);

  const query = useCadastralQuery(type);

  const columns = allCols.filter((c) => selected.includes(c.key));
  const rows = query.data ?? [];

  const handleExportCSV = () => {
    if (!rows.length) return toast.error("Nenhum registro para exportar");
    exportCSV(`cadastral_${type}_${stamp()}`, columns, rows);
    toast.success(`Exportado ${rows.length} registro(s)`);
  };
  const handleExportPDF = () => {
    if (!rows.length) return toast.error("Nenhum registro para exportar");
    exportPDF(`cadastral_${type}_${stamp()}`, `Cadastral — ${CAD_LABELS[type]}`, columns, rows);
    toast.success(`PDF gerado com ${rows.length} registro(s)`);
  };

  return (
    <div className="space-y-4">
      <div
        className="bg-card rounded-xl border border-border p-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="space-y-1">
          <Label className="text-xs">Cadastro</Label>
          <Select value={type} onValueChange={(v) => setType(v as CadastralKey)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CAD_LABELS).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Filter className="h-3 w-3" /> Colunas no relatório
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                {selected.length} de {allCols.length} colunas selecionadas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Selecione as colunas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allCols.map((c) => {
                const checked = selected.includes(c.key);
                return (
                  <DropdownMenuItem
                    key={c.key}
                    onSelect={(e) => {
                      e.preventDefault();
                      setSelected((prev) =>
                        checked ? prev.filter((k) => k !== c.key) : [...prev, c.key],
                      );
                    }}
                    className="cursor-pointer"
                  >
                    <Checkbox checked={checked} className="mr-2" />
                    {c.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ResultsBlock
        loading={query.isLoading}
        rows={rows}
        columns={columns}
        onCSV={handleExportCSV}
        onPDF={handleExportPDF}
      />
    </div>
  );
}

function useCadastralQuery(type: CadastralKey) {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["report", "cad", type],
    queryFn: async () => {
      if (type === "condominios") {
        const { data, error } = await supabase.from("condominios").select("*").order("nome");
        if (error) throw error;
        return data;
      }
      if (type === "moradores") {
        const { data, error } = await supabase
          .from("moradores")
          .select("*, unidades(numero, blocos(nome, condominios(nome)))")
          .order("nome");
        if (error) throw error;
        return data;
      }
      if (type === "usuarios") {
        if (!isAdmin) return [];
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .order("nome_completo");
        if (error) throw error;
        const { data: roles } = await supabase.from("user_roles").select("user_id, role");
        return (profiles ?? []).map((p) => ({
          ...p,
          roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role).join(", "),
        }));
      }
      return [];
    },
  });
}

function getCadastralColumns(type: CadastralKey): Column<any>[] {
  if (type === "condominios") {
    return [
      { key: "nome", label: "Nome", accessor: (r) => r.nome ?? "" },
      { key: "cnpj", label: "CNPJ", accessor: (r) => r.cnpj ?? "" },
      { key: "logradouro", label: "Logradouro", accessor: (r) => r.logradouro ?? "" },
      { key: "numero", label: "Número", accessor: (r) => r.numero ?? "" },
      { key: "bairro", label: "Bairro", accessor: (r) => r.bairro ?? "" },
      { key: "cidade", label: "Cidade", accessor: (r) => r.cidade ?? "" },
      { key: "estado", label: "UF", accessor: (r) => r.estado ?? "" },
      { key: "cep", label: "CEP", accessor: (r) => r.cep ?? "" },
      { key: "sindico_nome", label: "Síndico", accessor: (r) => r.sindico_nome ?? "" },
      { key: "sindico_telefone", label: "Tel. Síndico", accessor: (r) => r.sindico_telefone ?? "" },
      { key: "subsindico_nome", label: "Subsíndico", accessor: (r) => r.subsindico_nome ?? "" },
      { key: "subsindico_telefone", label: "Tel. Subsíndico", accessor: (r) => r.subsindico_telefone ?? "" },
      { key: "zelador_nome", label: "Zelador", accessor: (r) => r.zelador_nome ?? "" },
      { key: "zelador_telefone", label: "Tel. Zelador", accessor: (r) => r.zelador_telefone ?? "" },
      { key: "created_at", label: "Cadastrado em", accessor: (r) => fmtDateTime(r.created_at) },
    ];
  }
  if (type === "moradores") {
    return [
      { key: "nome", label: "Nome", accessor: (r) => r.nome ?? "" },
      { key: "telefone", label: "Telefone", accessor: (r) => r.telefone ?? "" },
      { key: "condominio", label: "Condomínio", accessor: (r) => r.unidades?.blocos?.condominios?.nome ?? "" },
      { key: "bloco", label: "Bloco", accessor: (r) => r.unidades?.blocos?.nome ?? "" },
      { key: "unidade", label: "Unidade", accessor: (r) => r.unidades?.numero ?? "" },
      { key: "pavimento", label: "Pavimento", accessor: (r) => r.pavimento ?? "" },
      { key: "vaga", label: "Vaga", accessor: (r) => r.vaga ?? "" },
      { key: "created_at", label: "Cadastrado em", accessor: (r) => fmtDateTime(r.created_at) },
    ];
  }
  // usuarios
  return [
    { key: "nome_completo", label: "Nome", accessor: (r) => r.nome_completo ?? "" },
    { key: "email", label: "E-mail", accessor: (r) => r.email ?? "" },
    { key: "roles", label: "Perfis", accessor: (r) => r.roles ?? "" },
    { key: "created_at", label: "Cadastrado em", accessor: (r) => fmtDateTime(r.created_at) },
  ];
}

/* ============================================================
   AUDITORIA
   ============================================================ */

function AuditoriaSection() {
  const [actionFilter, setActionFilter] = useState("todos");
  const [moduleFilter, setModuleFilter] = useState("todos");
  const [userFilter, setUserFilter] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const query = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const modules = useMemo(() => {
    const set = new Set<string>();
    (query.data ?? []).forEach((r) => set.add(r.module));
    return Array.from(set).sort();
  }, [query.data]);

  const filtered = useMemo(() => {
    if (!query.data) return [];
    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59.999`) : null;
    const userQ = userFilter.trim().toLowerCase();
    return query.data.filter((r) => {
      if (actionFilter !== "todos" && r.action !== actionFilter) return false;
      if (moduleFilter !== "todos" && r.module !== moduleFilter) return false;
      if (userQ && !(r.user_email ?? "").toLowerCase().includes(userQ)) return false;
      const dt = new Date(r.created_at);
      if (inicio && dt < inicio) return false;
      if (fim && dt > fim) return false;
      return true;
    });
  }, [query.data, actionFilter, moduleFilter, userFilter, dataInicio, dataFim]);

  const columns: Column<any>[] = [
    { key: "created_at", label: "Quando", accessor: (r) => fmtDateTime(r.created_at) },
    { key: "user_email", label: "Usuário", accessor: (r) => r.user_email ?? "—" },
    { key: "action", label: "Ação", accessor: (r) => actionLabel(r.action) },
    { key: "module", label: "Módulo", accessor: (r) => r.module ?? "" },
    { key: "field", label: "Campo", accessor: (r) => r.field ?? "—" },
    { key: "old_value", label: "Valor antigo", accessor: (r) => trim(r.old_value) },
    { key: "new_value", label: "Valor novo", accessor: (r) => trim(r.new_value) },
    { key: "record_id", label: "Registro", accessor: (r) => r.record_id ?? "" },
  ];

  return (
    <div className="space-y-4">
      <div
        className="bg-card rounded-xl border border-border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="space-y-1">
          <Label className="text-xs">Ação</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="create">Criação</SelectItem>
              <SelectItem value="update">Atualização</SelectItem>
              <SelectItem value="delete">Exclusão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Módulo</Label>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Usuário (e-mail)</Label>
          <Input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="filtrar..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
      </div>

      <ResultsBlock
        loading={query.isLoading}
        rows={filtered}
        columns={columns}
        onCSV={() => {
          if (!filtered.length) return toast.error("Nada para exportar");
          exportCSV(`auditoria_${stamp()}`, columns, filtered);
        }}
        onPDF={() => {
          if (!filtered.length) return toast.error("Nada para exportar");
          exportPDF(`auditoria_${stamp()}`, "Auditoria do sistema", columns, filtered);
        }}
      />
    </div>
  );
}

function actionLabel(a: string): string {
  if (a === "create") return "Criação";
  if (a === "update") return "Atualização";
  if (a === "delete") return "Exclusão";
  return a;
}

function trim(v: string | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v.length > 80) return v.slice(0, 80) + "…";
  return v;
}

/* ============================================================
   Shared results block + helpers
   ============================================================ */

function ResultsBlock({
  loading,
  rows,
  columns,
  onCSV,
  onPDF,
}: {
  loading: boolean;
  rows: any[];
  columns: Column<any>[];
  onCSV: () => void;
  onPDF: () => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => { setPage(1); }, [rows.length]);
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <FileBarChart className="h-3.5 w-3.5" />
          {loading ? "Carregando..." : `${rows.length} registro(s)`}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCSV} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={onPDF} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {!loading && !rows.length ? (
        <EmptyState title="Sem registros" description="Ajuste os filtros para ampliar a busca." />
      ) : (
        <div
          className="bg-card rounded-xl border border-border overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="text-left font-semibold px-3 py-2 whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((r, i) => (
                  <tr key={r.id ?? i} className="border-t border-border hover:bg-muted/30">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 align-top">
                        <div className="max-w-xs truncate">{c.accessor(r) ?? ""}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs">
              <span className="text-muted-foreground">Página {page} de {totalPages}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function buildMeta(
  condominios: { id: string; nome: string }[] | undefined,
  condominioId: string,
  ini: string,
  fim: string,
) {
  const parts: string[] = [];
  if (condominioId !== "todos") {
    const c = condominios?.find((x) => x.id === condominioId);
    if (c) parts.push(`Condomínio: ${c.nome}`);
  }
  if (ini) parts.push(`De ${fmtDate(ini)}`);
  if (fim) parts.push(`Até ${fmtDate(fim)}`);
  return parts.join("  •  ");
}