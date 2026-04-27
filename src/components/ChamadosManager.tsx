import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Wrench,
  Building2,
  MapPin,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Pencil,
  Hash,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useChamados } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatUnidadeBloco } from "@/lib/address";

// ----- Tipos -----

export type StatusChamado =
  | "aberto"
  | "pendente"
  | "em_andamento"
  | "aguardando_terceiro"
  | "resolvido"
  | "concluido"
  | "cancelado";

export type OrigemChamado = "sindico" | "morador" | "operador" | "manutencao";
export type DestinoChamado = "manutencao" | "ti" | "terceiros";

export type ChamadoRow = {
  id: string;
  condominio_id: string | null;
  unidade_id: string | null;
  bloco_id: string | null;
  origem_solicitante: OrigemChamado | null;
  destino: DestinoChamado | null;
  tipo: "manutencao" | "ti";
  categoria: string;
  descricao: string;
  empresa_terceiro: string | null;
  numero_protocolo: string | null;
  status: StatusChamado;
  prazo: string | null;
  data_abertura: string;
  finalizado_em: string | null;
  responsavel: string | null;
  condominios: { nome: string } | null;
  unidades: { numero: string; blocos: { nome: string } | null } | null;
};

// ----- Mapas de exibição -----

const STATUS_LABEL: Record<StatusChamado, string> = {
  aberto: "Aberto",
  pendente: "Aberto",
  em_andamento: "Em andamento",
  aguardando_terceiro: "Aguardando terceiro",
  resolvido: "Resolvido",
  concluido: "Resolvido",
  cancelado: "Cancelado",
};

function statusBadgeStyles(status: StatusChamado) {
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
    case "cancelado":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function statusBarColor(status: StatusChamado) {
  switch (status) {
    case "aberto":
    case "pendente":
      return "bg-destructive";
    case "em_andamento":
      return "bg-amber-500";
    case "aguardando_terceiro":
      return "bg-orange-500";
    case "resolvido":
    case "concluido":
      return "bg-success";
    case "cancelado":
      return "bg-muted-foreground/40";
    default:
      return "bg-muted-foreground/40";
  }
}

const ORIGEM_LABEL: Record<OrigemChamado, string> = {
  sindico: "Síndico",
  morador: "Morador",
  operador: "Operador",
  manutencao: "Manutenção",
};

const DESTINO_LABEL: Record<DestinoChamado, string> = {
  manutencao: "Manutenção",
  ti: "TI",
  terceiros: "Terceiros",
};

// Status considerados "abertos" para ordenação prioritária
const OPEN_STATUSES: StatusChamado[] = ["aberto", "pendente", "em_andamento", "aguardando_terceiro"];

function reportError(scope: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[ChamadosManager] ${scope}:`, error);
  const msg =
    error instanceof Error ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Erro desconhecido";
  toast.error(`Erro: ${scope}`, { description: msg });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ===================================================================
// MANAGER
// ===================================================================

export function ChamadosManager({ openNew = false }: { openNew?: boolean }) {
  const qc = useQueryClient();
  const { canManageOperational } = useAuth();

  const [filtroCondo, setFiltroCondo] = useState<string>("all");
  const [filtroStatus, setFiltroStatus] = useState<"all" | "abertos" | StatusChamado>("all");
  const [filtroDestino, setFiltroDestino] = useState<"all" | DestinoChamado>("all");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todos" | "7d" | "30d" | "90d">("todos");
  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");

  const [editing, setEditing] = useState<"new" | ChamadoRow | null>(openNew ? "new" : null);
  const [removing, setRemoving] = useState<ChamadoRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDeb(busca.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const { data: condominios } = useQuery({
    queryKey: ["condominios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const chamadosQuery = useChamados();
  const chamados = (chamadosQuery.data ?? []) as unknown as ChamadoRow[];
  const isLoading = chamadosQuery.isLoading;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusChamado }) => {
      const { error } = await supabase
        .from("chamados_tecnicos")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.status === "resolvido"
          ? "Chamado finalizado"
          : vars.status === "cancelado"
            ? "Chamado cancelado"
            : "Status atualizado",
      );
      qc.invalidateQueries({ queryKey: ["chamados"] });
    },
    onError: (e) => reportError("Atualizar status", e),
  });

  const filtered = useMemo(() => {
    const now = Date.now();
    const days =
      filtroPeriodo === "7d" ? 7 : filtroPeriodo === "30d" ? 30 : filtroPeriodo === "90d" ? 90 : 0;
    const minDate = days ? now - days * 24 * 60 * 60 * 1000 : 0;

    return chamados.filter((c) => {
      if (filtroCondo !== "all") {
        if (filtroCondo === "base") {
          if (c.condominio_id) return false;
        } else if (c.condominio_id !== filtroCondo) return false;
      }
      if (filtroStatus !== "all") {
        if (filtroStatus === "abertos") {
          if (!OPEN_STATUSES.includes(c.status)) return false;
        } else if (c.status !== filtroStatus) return false;
      }
      if (filtroDestino !== "all" && c.destino !== filtroDestino) return false;
      if (minDate && new Date(c.data_abertura).getTime() < minDate) return false;
      if (buscaDeb) {
        const hay = `${c.condominios?.nome ?? "BASE"} ${c.categoria ?? ""} ${c.descricao ?? ""} ${c.numero_protocolo ?? ""} ${c.empresa_terceiro ?? ""}`.toLowerCase();
        if (!hay.includes(buscaDeb)) return false;
      }
      return true;
    });
  }, [chamados, filtroCondo, filtroStatus, filtroDestino, filtroPeriodo, buscaDeb]);

  // Ordenação: abertos primeiro, depois por data_abertura DESC
  const ordered = useMemo(() => {
    const isOpen = (s: StatusChamado) => OPEN_STATUSES.includes(s);
    return [...filtered].sort((a, b) => {
      const ao = isOpen(a.status) ? 0 : 1;
      const bo = isOpen(b.status) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime();
    });
  }, [filtered]);

  const hasFilters =
    filtroCondo !== "all" ||
    filtroStatus !== "all" ||
    filtroDestino !== "all" ||
    filtroPeriodo !== "todos" ||
    !!busca;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por categoria, descrição, protocolo..."
            className="pl-9"
          />
        </div>
        <Select value={filtroCondo} onValueChange={setFiltroCondo}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Condomínio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os condomínios</SelectItem>
            <SelectItem value="base">BASE (sem condomínio)</SelectItem>
            {condominios?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="abertos">Em aberto</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="aguardando_terceiro">Aguardando terceiro</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroDestino} onValueChange={(v) => setFiltroDestino(v as typeof filtroDestino)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Destino" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os destinos</SelectItem>
            <SelectItem value="manutencao">Manutenção</SelectItem>
            <SelectItem value="ti">TI</SelectItem>
            <SelectItem value="terceiros">Terceiros</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroPeriodo} onValueChange={(v) => setFiltroPeriodo(v as typeof filtroPeriodo)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo o período</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFiltroCondo("all");
              setFiltroStatus("all");
              setFiltroDestino("all");
              setFiltroPeriodo("todos");
              setBusca("");
            }}
          >
            Limpar filtros
          </Button>
        )}
        {canManageOperational && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4 mr-1" /> Novo chamado
          </Button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando chamados...</div>
      ) : !ordered.length ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <h3 className="font-semibold text-foreground">Nenhum chamado encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {chamados.length > 0
              ? "Os filtros aplicados não retornaram resultados."
              : canManageOperational ? "Clique em + Novo chamado para começar." : "Aguarde novos chamados."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ordered.map((c) => {
            const isOpen = OPEN_STATUSES.includes(c.status);
            return (
              <div
                key={c.id}
                className="relative overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition-shadow flex flex-col"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <span aria-hidden className={cn("h-1 w-full", statusBarColor(c.status))} />
                <div className="p-4 flex-1 flex flex-col gap-3">
                  {/* Header: condomínio / categoria / status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {c.condominios?.nome ?? "BASE"}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground leading-tight mt-0.5 line-clamp-2">
                        {c.categoria || "Chamado"}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0",
                        statusBadgeStyles(c.status),
                      )}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>

                  {/* Origem → Destino */}
                  {(c.origem_solicitante || c.destino) && (
                    <div className="flex items-center gap-1.5 text-xs text-foreground/80 flex-wrap">
                      {c.origem_solicitante && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-foreground font-medium">
                          {ORIGEM_LABEL[c.origem_solicitante]}
                        </span>
                      )}
                      {c.origem_solicitante && c.destino && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      )}
                      {c.destino && (
                        <span className={cn(
                          "px-1.5 py-0.5 rounded font-medium",
                          c.destino === "terceiros"
                            ? "bg-orange-500/15 text-orange-600"
                            : c.destino === "ti"
                              ? "bg-blue-500/15 text-blue-600"
                              : "bg-success/15 text-success",
                        )}>
                          {DESTINO_LABEL[c.destino]}
                        </span>
                      )}
                    </div>
                  )}

                  {c.descricao && (
                    <p className="text-xs text-foreground/80 line-clamp-3 whitespace-pre-wrap">
                      {c.descricao}
                    </p>
                  )}

                  {/* Detalhes secundários */}
                  <div className="space-y-1 text-[11px] text-muted-foreground mt-auto pt-2 border-t border-border">
                    {c.unidades && (
                      <div className="inline-flex items-center gap-1.5 w-full">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{formatUnidadeBloco(c.unidades)}</span>
                      </div>
                    )}
                    {c.empresa_terceiro && (
                      <div className="inline-flex items-center gap-1.5 w-full">
                        <Wrench className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.empresa_terceiro}</span>
                      </div>
                    )}
                    {c.numero_protocolo && (
                      <div className="inline-flex items-center gap-1.5 w-full">
                        <Hash className="h-3 w-3 shrink-0" />
                        <span className="truncate">Protocolo: {c.numero_protocolo}</span>
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5 w-full">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span className="truncate">Aberto em {fmtDateTime(c.data_abertura)}</span>
                    </div>
                    {c.prazo && (
                      <div className="inline-flex items-center gap-1.5 w-full">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="truncate">Prazo: {fmtDateTime(c.prazo)}</span>
                      </div>
                    )}
                    {c.finalizado_em && (
                      <div className="inline-flex items-center gap-1.5 w-full">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                        <span className="truncate">
                          Finalizado em {fmtDateTime(c.finalizado_em)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  {canManageOperational && (
                    <div className="flex items-center justify-end gap-1 pt-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isOpen && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-success hover:text-success"
                            onClick={() => updateStatusMutation.mutate({ id: c.id, status: "resolvido" })}
                            disabled={updateStatusMutation.isPending}
                            title="Finalizar"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRemoving(c)}
                            title="Cancelar"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form */}
      <ChamadoFormDialog
        open={editing !== null}
        editing={editing}
        onClose={() => setEditing(null)}
      />

      {/* Confirmação cancelar */}
      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este chamado?</AlertDialogTitle>
            <AlertDialogDescription>
              O chamado ficará marcado como cancelado, mas permanecerá no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removing && updateStatusMutation.mutate({ id: removing.id, status: "cancelado" }, {
                  onSettled: () => setRemoving(null),
                })
              }
              disabled={updateStatusMutation.isPending}
            >
              Cancelar chamado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===================================================================
// FORM
// ===================================================================

function ChamadoFormDialog({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: "new" | ChamadoRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isNew = editing === "new" || editing === null;
  const editingRow = editing && editing !== "new" ? (editing as ChamadoRow) : null;

  const [condominioId, setCondominioId] = useState<string>("base");
  const [blocoId, setBlocoId] = useState<string>("none");
  const [unidadeId, setUnidadeId] = useState<string>("none");
  const [origem, setOrigem] = useState<OrigemChamado>("operador");
  const [destino, setDestino] = useState<DestinoChamado>("manutencao");
  const [categoria, setCategoria] = useState<string>("");
  const [descricao, setDescricao] = useState<string>("");
  const [empresaTerceiro, setEmpresaTerceiro] = useState<string>("");
  const [numeroProtocolo, setNumeroProtocolo] = useState<string>("");
  const [responsavel, setResponsavel] = useState<string>("");
  const [prazo, setPrazo] = useState<string>("");
  const [status, setStatus] = useState<StatusChamado>("aberto");

  useEffect(() => {
    if (!open) return;
    if (editingRow) {
      setCondominioId(editingRow.condominio_id ?? "base");
      setBlocoId(editingRow.bloco_id ?? "none");
      setUnidadeId(editingRow.unidade_id ?? "none");
      setOrigem(editingRow.origem_solicitante ?? "operador");
      setDestino(editingRow.destino ?? "manutencao");
      setCategoria(editingRow.categoria ?? "");
      setDescricao(editingRow.descricao ?? "");
      setEmpresaTerceiro(editingRow.empresa_terceiro ?? "");
      setNumeroProtocolo(editingRow.numero_protocolo ?? "");
      setResponsavel(editingRow.responsavel ?? "");
      setPrazo(editingRow.prazo ? editingRow.prazo.slice(0, 16) : "");
      setStatus(editingRow.status ?? "aberto");
    } else {
      setCondominioId("base");
      setBlocoId("none");
      setUnidadeId("none");
      setOrigem("operador");
      setDestino("manutencao");
      setCategoria("");
      setDescricao("");
      setEmpresaTerceiro("");
      setNumeroProtocolo("");
      setResponsavel("");
      setPrazo("");
      setStatus("aberto");
    }
  }, [open, editingRow]);

  const { data: condominios } = useQuery({
    queryKey: ["condominios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const condoSelected = condominioId !== "base" ? condominioId : "";

  const { data: blocos } = useQuery({
    queryKey: ["blocos", condoSelected],
    enabled: !!condoSelected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocos").select("id, nome").eq("condominio_id", condoSelected).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const blocoSelected = blocoId !== "none" ? blocoId : "";

  const { data: unidades } = useQuery({
    queryKey: ["unidades", blocoSelected],
    enabled: !!blocoSelected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades").select("id, numero").eq("bloco_id", blocoSelected).order("numero");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!categoria.trim()) throw new Error("Informe o tipo do chamado.");
      if (!descricao.trim()) throw new Error("Informe a descrição.");
      if (destino === "terceiros" && !empresaTerceiro.trim()) {
        throw new Error("Informe a empresa terceira responsável.");
      }

      // tipo legado (manutencao/ti) — derivar de destino
      const tipoLegado: "manutencao" | "ti" = destino === "ti" ? "ti" : "manutencao";

      const payload = {
        condominio_id: condominioId !== "base" ? condominioId : null,
        bloco_id: blocoId !== "none" ? blocoId : null,
        unidade_id: unidadeId !== "none" ? unidadeId : null,
        origem_solicitante: origem,
        destino,
        tipo: tipoLegado,
        categoria: categoria.trim(),
        descricao: descricao.trim(),
        empresa_terceiro: destino === "terceiros" ? empresaTerceiro.trim() || null : null,
        numero_protocolo: destino === "terceiros" ? numeroProtocolo.trim() || null : null,
        responsavel: responsavel.trim() || null,
        prazo: prazo ? new Date(prazo).toISOString() : null,
        status,
      };

      if (editingRow) {
        const { error } = await supabase
          .from("chamados_tecnicos")
          .update(payload)
          .eq("id", editingRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chamados_tecnicos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingRow ? "Chamado atualizado" : "Chamado criado");
      qc.invalidateQueries({ queryKey: ["chamados"] });
      onClose();
    },
    onError: (e) => reportError("Salvar chamado", e),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {isNew ? "Novo chamado técnico" : "Editar chamado"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Localização */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Condomínio</Label>
              <Select
                value={condominioId}
                onValueChange={(v) => { setCondominioId(v); setBlocoId("none"); setUnidadeId("none"); }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">BASE (sem condomínio)</SelectItem>
                  {condominios?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bloco</Label>
              <Select
                value={blocoId}
                onValueChange={(v) => { setBlocoId(v); setUnidadeId("none"); }}
                disabled={condominioId === "base"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={condominioId === "base" ? "—" : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem bloco</SelectItem>
                  {blocos?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select
                value={unidadeId}
                onValueChange={setUnidadeId}
                disabled={blocoId === "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={blocoId === "none" ? "—" : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem unidade</SelectItem>
                  {unidades?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Origem / destino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Origem do solicitante *</Label>
              <Select value={origem} onValueChange={(v) => setOrigem(v as OrigemChamado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sindico">Síndico</SelectItem>
                  <SelectItem value="morador">Morador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Destino *</Label>
              <Select value={destino} onValueChange={(v) => setDestino(v as DestinoChamado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="ti">TI</SelectItem>
                  <SelectItem value="terceiros">Terceiros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo / categoria */}
          <div className="space-y-1.5">
            <Label>Tipo do chamado *</Label>
            <Input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex.: Vazamento, Internet, Portão, Câmera..."
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o problema e qualquer detalhe relevante..."
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Terceiros */}
          {destino === "terceiros" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <div className="space-y-1.5">
                <Label>Empresa terceira *</Label>
                <Input
                  value={empresaTerceiro}
                  onChange={(e) => setEmpresaTerceiro(e.target.value)}
                  placeholder="Nome da empresa"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nº de protocolo</Label>
                <Input
                  value={numeroProtocolo}
                  onChange={(e) => setNumeroProtocolo(e.target.value)}
                  placeholder="Opcional"
                  maxLength={60}
                />
              </div>
            </div>
          )}

          {/* Responsável / prazo / status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Responsável interno</Label>
              <Input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Opcional"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input
                type="datetime-local"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusChamado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="aguardando_terceiro">Aguardando terceiro</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : (editingRow ? "Salvar alterações" : "Criar chamado")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}