import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Bell,
  AlertTriangle,
  Wrench,
  Pin,
  PinOff,
  Search,
  Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
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

type TipoAviso = "informativo" | "urgente" | "manutencao";

type AvisoRow = {
  id: string;
  titulo: string | null;
  descricao: string;
  tipo: TipoAviso;
  data: string;
  ativo: boolean;
  fixado: boolean;
  data_expiracao: string | null;
  condominio_id: string;
  created_at: string | null;
  created_by: string | null;
  condominios: { nome: string } | null;
  creator?: { id: string; nome_completo: string | null } | null;
};

const TIPO_LABEL: Record<TipoAviso, string> = {
  informativo: "Informativo",
  urgente: "Urgente",
  manutencao: "Manutenção",
};

const TIPO_BADGE: Record<TipoAviso, string> = {
  informativo: "bg-primary/10 text-primary border-primary/20",
  urgente: "bg-destructive/10 text-destructive border-destructive/30",
  manutencao: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
};

const TIPO_ICON: Record<TipoAviso, typeof Bell> = {
  informativo: Bell,
  urgente: AlertTriangle,
  manutencao: Wrench,
};

function reportError(scope: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[AvisosManager] ${scope}:`, error);
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "Erro desconhecido";
  toast.error(`Erro: ${scope}`, { description: msg });
}

function isExpired(a: AvisoRow): boolean {
  if (!a.data_expiracao) return false;
  return new Date(a.data_expiracao).getTime() < Date.now();
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function AvisosManager({ openNew = false }: { openNew?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { canManageOperational } = useAuth();
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoAviso>("todos");
  const [filtroCondo, setFiltroCondo] = useState<string>("todos");
  const [filtroFixado, setFiltroFixado] = useState<"todos" | "fixados">("todos");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [editing, setEditing] = useState<AvisoRow | "new" | null>(openNew ? "new" : null);
  const [removing, setRemoving] = useState<AvisoRow | null>(null);

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim().toLowerCase()), 300);
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

  const { data: avisos, isLoading } = useQuery({
    queryKey: ["avisos", "full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avisos")
        .select(
          "id, titulo, descricao, tipo, data, ativo, fixado, data_expiracao, condominio_id, created_at, created_by, condominios(nome)",
        )
        .order("fixado", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (data ?? []) as unknown as AvisoRow[];
      const ids = Array.from(new Set(list.map((a) => a.created_by).filter(Boolean) as string[]));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id, nome_completo").in("id", ids);
        const byId = new Map((profs ?? []).map((p) => [p.id, p]));
        for (const a of list) if (a.created_by) a.creator = byId.get(a.created_by) ?? null;
      }
      return list;
    },
  });

  const togglePin = useMutation({
    mutationFn: async (a: AvisoRow) => {
      const { error } = await supabase
        .from("avisos")
        .update({ fixado: !a.fixado })
        .eq("id", a.id);
      if (error) throw error;
      return !a.fixado;
    },
    onSuccess: (now) => {
      toast.success(now ? "Aviso fixado no topo" : "Aviso desafixado");
      qc.invalidateQueries({ queryKey: ["avisos"] });
    },
    onError: (e) => reportError("Fixar/desafixar aviso", e),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("avisos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso removido");
      qc.invalidateQueries({ queryKey: ["avisos"] });
      setRemoving(null);
    },
    onError: (e) => reportError("Remover aviso", e),
  });

  const visiveis = useMemo(
    () => (avisos ?? []).filter((a) => !isExpired(a)),
    [avisos],
  );

  const filtered = useMemo(() => {
    return visiveis.filter((a) => {
      if (filtroTipo !== "todos" && a.tipo !== filtroTipo) return false;
      if (filtroCondo !== "todos" && a.condominio_id !== filtroCondo) return false;
      if (filtroFixado === "fixados" && !a.fixado) return false;
      if (buscaDebounced) {
        const hay = `${a.titulo ?? ""} ${a.descricao ?? ""}`.toLowerCase();
        if (!hay.includes(buscaDebounced)) return false;
      }
      return true;
    });
  }, [visiveis, filtroTipo, filtroCondo, filtroFixado, buscaDebounced]);

  const totalAtivos = visiveis.length;
  const totalUrgentes = visiveis.filter((a) => a.tipo === "urgente").length;

  const handleClose = () => {
    setEditing(null);
    if (openNew) navigate({ to: "/avisos" });
  };

  const handleCopy = async (a: AvisoRow) => {
    const desc = a.descricao?.trim() ?? "";
    const titulo = a.titulo?.trim() ?? "";
    const text = desc ? `${titulo}\n\n${desc}`.trim() : titulo;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Aviso copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="space-y-4">
      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div
          className="bg-card rounded-xl border border-border p-3"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Ativos</div>
          <div className="text-2xl font-bold text-foreground">{totalAtivos}</div>
        </div>
        <div
          className={cn(
            "rounded-xl border p-3",
            totalUrgentes > 0
              ? "bg-destructive/5 border-destructive/30"
              : "bg-card border-border",
          )}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Urgentes</div>
          <div className={cn(
            "text-2xl font-bold",
            totalUrgentes > 0 ? "text-destructive" : "text-foreground",
          )}>
            {totalUrgentes}
          </div>
        </div>
      </div>

      {/* Busca + filtros + botão novo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="pl-9"
          />
        </div>
        <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="informativo">Informativo</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
            <SelectItem value="manutencao">Manutenção</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroCondo} onValueChange={setFiltroCondo}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Condomínio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os condomínios</SelectItem>
            {condominios?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroFixado} onValueChange={(v) => setFiltroFixado(v as typeof filtroFixado)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="fixados">Apenas fixados</SelectItem>
          </SelectContent>
        </Select>
        {canManageOperational && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4 mr-1" /> Novo aviso
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando avisos...</div>
      ) : !filtered.length ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <h3 className="font-semibold text-foreground">
            {visiveis.length ? "Nenhum aviso para os filtros aplicados" : "Nenhum aviso ativo"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {canManageOperational ? "Clique em + Novo aviso para começar." : "Aguarde novos avisos."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const Icon = TIPO_ICON[a.tipo];
            return (
              <div
                key={a.id}
                className={cn(
                  "rounded-xl border p-4 bg-card",
                  a.tipo === "urgente" && "border-destructive/40 bg-destructive/5",
                  a.fixado && "ring-1 ring-primary/30 border-primary/40",
                )}
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                    a.tipo === "urgente" ? "bg-destructive/10 text-destructive"
                      : a.tipo === "manutencao" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-primary/10 text-primary",
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {a.fixado && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                          <Pin className="h-3 w-3" /> Fixado
                        </span>
                      )}
                      <h3 className="font-semibold text-foreground">{a.titulo || (a.descricao ? a.descricao.slice(0, 60) : "(sem título)")}</h3>
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border",
                        TIPO_BADGE[a.tipo],
                      )}>
                        {TIPO_LABEL[a.tipo]}
                      </span>
                      {!a.ativo && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          Arquivado
                        </span>
                      )}
                    </div>
                    {a.titulo && a.descricao && a.descricao.trim() !== "" && (
                      <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{a.descricao}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{a.condominios?.nome ?? "—"}</span>
                      <span>•</span>
                      <span>{new Date(a.data).toLocaleDateString("pt-BR")}</span>
                      {a.data_expiracao && (
                        <>
                          <span>•</span>
                          <span>Válido até {formatDateTime(a.data_expiracao)}</span>
                        </>
                      )}
                      {(a.creator?.nome_completo || a.created_at) && (
                        <>
                          <span>•</span>
                          <span>
                            Cadastrado por{" "}
                            <span className="font-medium text-foreground/80">
                              {a.creator?.nome_completo ?? "—"}
                            </span>
                            {a.created_at && (
                              <> em {new Date(a.created_at).toLocaleDateString("pt-BR")}</>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Copiar aviso"
                      onClick={() => handleCopy(a)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {canManageOperational && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={a.fixado ? "Desafixar" : "Fixar no topo"}
                          onClick={() => togglePin.mutate(a)}
                          disabled={togglePin.isPending}
                        >
                          {a.fixado ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemoving(a)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <AvisoDialog
          condominios={condominios ?? []}
          aviso={editing === "new" ? null : editing}
          onClose={handleClose}
        />
      )}

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aviso</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente o aviso <strong>{removing?.titulo || removing?.descricao?.slice(0, 40) || "selecionado"}</strong>. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removing && removeMutation.mutate(removing.id)}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  // yyyy-MM-ddTHH:mm em horário local
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AvisoDialog({
  condominios,
  aviso,
  onClose,
}: {
  condominios: { id: string; nome: string }[];
  aviso: AvisoRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!aviso;
  const [titulo, setTitulo] = useState(aviso?.titulo ?? "");
  const [descricao, setDescricao] = useState(aviso?.descricao ?? "");
  const [tipo, setTipo] = useState<TipoAviso>(aviso?.tipo ?? "informativo");
  const [condominioId, setCondominioId] = useState(
    aviso?.condominio_id ?? (condominios.length === 1 ? condominios[0].id : ""),
  );
  const [data, setData] = useState(aviso?.data ?? new Date().toISOString().slice(0, 10));
  const [dataExpiracao, setDataExpiracao] = useState<string>(
    toDateTimeLocal(aviso?.data_expiracao),
  );
  const [ativo, setAtivo] = useState(aviso?.ativo ?? true);
  const [fixado, setFixado] = useState(aviso?.fixado ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    if (!condominioId) { toast.error("Selecione um condomínio"); return; }
    if (!titulo.trim()) { toast.error("Informe o título"); return; }

    let dataExpISO: string | null = null;
    if (dataExpiracao) {
      const d = new Date(dataExpiracao);
      if (isNaN(d.getTime())) {
        toast.error("Data de expiração inválida");
        return;
      }
      dataExpISO = d.toISOString();
    }

    setSaving(true);
    try {
      const descTrim = descricao.trim();
      const payload = {
        titulo: titulo.trim(),
        descricao: descTrim ? descTrim : null,
        tipo,
        condominio_id: condominioId,
        data,
        ativo,
        fixado,
        data_expiracao: dataExpISO,
        prioridade: (tipo === "urgente" ? "urgente" : "normal") as "urgente" | "normal",
      };
      if (isEdit && aviso) {
        const { error } = await supabase.from("avisos").update(payload).eq("id", aviso.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("avisos").insert(payload);
        if (error) throw error;
      }
      toast.success(isEdit ? "Aviso atualizado" : "Aviso cadastrado");
      qc.invalidateQueries({ queryKey: ["avisos"] });
      onClose();
    } catch (e) {
      reportError("Salvar aviso", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar aviso" : "Novo aviso"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="a_condo">Condomínio *</Label>
            <Select value={condominioId} onValueChange={setCondominioId}>
              <SelectTrigger id="a_condo"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {condominios.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="a_titulo">Título *</Label>
            <Input
              id="a_titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Manutenção do elevador"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="a_desc">Descrição *</Label>
            <Textarea
              id="a_desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhe o aviso..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="a_tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAviso)}>
                <SelectTrigger id="a_tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="informativo">Informativo</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="a_data">Data *</Label>
              <Input id="a_data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="a_exp">Data de expiração (opcional)</Label>
            <Input
              id="a_exp"
              type="datetime-local"
              value={dataExpiracao}
              onChange={(e) => setDataExpiracao(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Após a expiração o aviso deixa de aparecer automaticamente.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={fixado}
                onChange={(e) => setFixado(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Fixar no topo
            </label>
            {isEdit && (
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Aviso ativo
              </label>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar aviso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}