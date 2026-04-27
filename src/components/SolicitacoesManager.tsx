import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ClipboardList,
  CheckCircle2,
  CircleDollarSign,
  Building2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useCondominios, useBlocos, useUnidades } from "@/lib/queries";
import { cn } from "@/lib/utils";

type TipoSolicitacao = "tag" | "controle" | "imagens" | "acesso" | "outros";
type StatusSolicitacao = "pendente" | "em_andamento" | "concluido" | "cancelado";

const TIPO_LABEL: Record<TipoSolicitacao, string> = {
  tag: "Tag",
  controle: "Controle",
  imagens: "Imagens",
  acesso: "Acesso",
  outros: "Outros",
};

const STATUS_LABEL: Record<StatusSolicitacao, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function statusStyles(s: StatusSolicitacao) {
  switch (s) {
    case "pendente": return "bg-destructive text-destructive-foreground";
    case "em_andamento": return "bg-amber-500 text-white";
    case "concluido": return "bg-success text-success-foreground";
    case "cancelado": return "bg-muted text-muted-foreground";
  }
}

type SolicitacaoRow = {
  id: string;
  condominio_id: string;
  unidade_id: string | null;
  morador_id: string | null;
  morador_nome: string | null;
  tipo: TipoSolicitacao;
  descricao: string;
  status: StatusSolicitacao;
  pago: boolean;
  valor: number | null;
  data_solicitacao: string;
  data_conclusao: string | null;
  created_by: string | null;
  created_at: string;
  condominios: { nome: string } | null;
  unidades: { numero: string; blocos: { nome: string } | null } | null;
};

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function isToday(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function reportError(scope: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[SolicitacoesManager] ${scope}:`, error);
  const msg = error instanceof Error ? error.message : "Erro desconhecido";
  toast.error(`Erro: ${scope}`, { description: msg });
}

export function SolicitacoesManager() {
  const qc = useQueryClient();
  const { user, isAdmin, isOperador } = useAuth();
  const canManage = isAdmin || isOperador;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SolicitacaoRow | null>(null);
  const [deleting, setDeleting] = useState<SolicitacaoRow | null>(null);

  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoSolicitacao | "all">("all");
  const [filtroStatus, setFiltroStatus] = useState<StatusSolicitacao | "all">("all");
  const [filtroPago, setFiltroPago] = useState<"all" | "pago" | "nao_pago">("all");
  const [filtroCondominio, setFiltroCondominio] = useState<string>("all");

  const condominios = useCondominios();

  const solicitacoes = useQuery({
    queryKey: ["solicitacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("*, condominios(nome), unidades(numero, blocos(nome))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SolicitacaoRow[];
    },
  });

  const creatorIds = useMemo(() => {
    const ids = new Set<string>();
    (solicitacoes.data ?? []).forEach((s) => { if (s.created_by) ids.add(s.created_by); });
    return Array.from(ids);
  }, [solicitacoes.data]);

  const profiles = useQuery({
    queryKey: ["profiles", "for-solicitacoes", creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .in("id", creatorIds);
      if (error) throw error;
      return data as { id: string; nome_completo: string | null }[];
    },
  });
  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    (profiles.data ?? []).forEach((p) => map.set(p.id, p.nome_completo ?? ""));
    return map;
  }, [profiles.data]);

  const items = solicitacoes.data ?? [];

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (filtroTipo !== "all" && s.tipo !== filtroTipo) return false;
      if (filtroStatus !== "all" && s.status !== filtroStatus) return false;
      if (filtroPago === "pago" && !s.pago) return false;
      if (filtroPago === "nao_pago" && s.pago) return false;
      if (filtroCondominio !== "all" && s.condominio_id !== filtroCondominio) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${s.descricao} ${s.morador_nome ?? ""} ${s.condominios?.nome ?? ""} ${TIPO_LABEL[s.tipo]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filtroTipo, filtroStatus, filtroPago, filtroCondominio, search]);

  const totalPendentes = items.filter((s) => s.status === "pendente").length;
  const totalNaoPagos = items.filter((s) => !s.pago && s.status !== "cancelado").length;
  const concluidasHoje = items.filter((s) => s.status === "concluido" && s.data_conclusao && isToday(s.data_conclusao)).length;

  const togglePago = useMutation({
    mutationFn: async (s: SolicitacaoRow) => {
      const { error } = await supabase.from("solicitacoes").update({ pago: !s.pago }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento atualizado");
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
    },
    onError: (e) => reportError("atualizar pagamento", e),
  });

  const concluir = useMutation({
    mutationFn: async (s: SolicitacaoRow) => {
      const { error } = await supabase.from("solicitacoes").update({ status: "concluido" }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação concluída");
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
    },
    onError: (e) => reportError("concluir solicitação", e),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("solicitacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação excluída");
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      setDeleting(null);
    },
    onError: (e) => reportError("excluir solicitação", e),
  });

  return (
    <div className="space-y-4">
      {/* Indicadores */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Pendentes" value={totalPendentes} tone="destructive" />
        <Stat label="Não pagos" value={totalNaoPagos} tone="warning" />
        <Stat label="Concluídos hoje" value={concluidasHoje} tone="success" />
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-xl border border-border p-3 sm:p-4 flex flex-col gap-3" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição, morador, condomínio…"
              className="pl-9"
            />
          </div>
          {canManage && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova solicitação
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as TipoSolicitacao | "all")}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {(Object.keys(TIPO_LABEL) as TipoSolicitacao[]).map((t) => (
                <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as StatusSolicitacao | "all")}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(STATUS_LABEL) as StatusSolicitacao[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroPago} onValueChange={(v) => setFiltroPago(v as typeof filtroPago)}>
            <SelectTrigger><SelectValue placeholder="Pagamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
              <SelectItem value="nao_pago">Não pagos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroCondominio} onValueChange={setFiltroCondominio}>
            <SelectTrigger><SelectValue placeholder="Condomínio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os condomínios</SelectItem>
              {(condominios.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista */}
      {solicitacoes.isLoading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-10 text-center border border-dashed border-border rounded-xl bg-card">
          Nenhuma solicitação encontrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <article
              key={s.id}
              className="relative overflow-hidden rounded-xl border border-border bg-card p-4 pl-5 transition-shadow hover:shadow-md"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <span aria-hidden className={cn(
                "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
                s.status === "pendente" ? "bg-destructive"
                : s.status === "em_andamento" ? "bg-amber-500"
                : s.status === "concluido" ? "bg-success"
                : "bg-muted-foreground/40",
              )} />
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ClipboardList className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                  <h3 className="font-semibold text-foreground uppercase tracking-wide text-sm truncate">
                    {TIPO_LABEL[s.tipo]}
                  </h3>
                </div>
                <span className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded shrink-0", statusStyles(s.status))}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground mb-1">
                <Building2 className="h-4 w-4 text-muted-foreground/70" />
                <span className="font-medium truncate">{s.condominios?.nome ?? "—"}</span>
              </div>
              {(s.unidades || s.morador_nome) && (
                <div className="text-xs text-muted-foreground mb-1">
                  {s.unidades && (
                    <>Bloco {s.unidades.blocos?.nome} / Unidade {s.unidades.numero}</>
                  )}
                  {s.unidades && s.morador_nome ? " · " : ""}
                  {s.morador_nome ?? ""}
                </div>
              )}
              <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">{s.descricao}</p>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className={cn(
                  "text-xs font-bold uppercase px-2 py-0.5 rounded inline-flex items-center gap-1",
                  s.pago ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                )}>
                  <CircleDollarSign className="h-3 w-3" />
                  {s.pago ? "Pago" : "Não pago"}
                </span>
                {s.valor != null && (
                  <span className="text-xs px-2 py-0.5 rounded border border-border">
                    R$ {Number(s.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                Cadastrado por {profileMap.get(s.created_by ?? "") || "—"} em {fmtDateTime(s.created_at)}
                {s.data_conclusao && (
                  <> · Concluído em {fmtDateTime(s.data_conclusao)}</>
                )}
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => togglePago.mutate(s)} disabled={togglePago.isPending}>
                    <CircleDollarSign className="h-4 w-4 mr-1" />
                    {s.pago ? "Marcar como não pago" : "Marcar como pago"}
                  </Button>
                  {s.status !== "concluido" && (
                    <Button size="sm" variant="outline" onClick={() => concluir.mutate(s)} disabled={concluir.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(s)}>
                      <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Excluir
                    </Button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <SolicitacaoFormDialog open={open} onOpenChange={setOpen} editing={editing} userId={user?.id ?? null} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "destructive" | "warning" | "success" }) {
  const cls =
    tone === "destructive" ? "bg-destructive/10 text-destructive"
    : tone === "warning" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
    : "bg-success/15 text-success";
  return (
    <div className="bg-card rounded-xl border border-border p-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className={cn("inline-flex items-center justify-center h-9 w-9 rounded-lg mb-2", cls)}>
        <ClipboardList className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SolicitacaoFormDialog({
  open,
  onOpenChange,
  editing,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: SolicitacaoRow | null;
  userId: string | null;
}) {
  const qc = useQueryClient();

  const [condominioId, setCondominioId] = useState<string>("");
  const [blocoId, setBlocoId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [moradorNome, setMoradorNome] = useState("");
  const [tipo, setTipo] = useState<TipoSolicitacao>("tag");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<string>("");
  const [pago, setPago] = useState(false);
  const [status, setStatus] = useState<StatusSolicitacao>("pendente");

  const condominios = useCondominios();
  const blocos = useBlocos(condominioId || undefined);
  const unidades = useUnidades(blocoId || undefined);

  // Pre-fill bloco when editing
  const editingBlocoId = useQuery({
    queryKey: ["bloco-from-unidade", editing?.unidade_id],
    enabled: !!editing?.unidade_id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("bloco_id")
        .eq("id", editing!.unidade_id!)
        .maybeSingle();
      if (error) throw error;
      return data?.bloco_id ?? "";
    },
  });

  useEffect(() => {
    if (!open) return;
    setCondominioId(editing?.condominio_id ?? "");
    setUnidadeId(editing?.unidade_id ?? "");
    setMoradorNome(editing?.morador_nome ?? "");
    setTipo(editing?.tipo ?? "tag");
    setDescricao(editing?.descricao ?? "");
    setValor(editing?.valor != null ? String(editing.valor) : "");
    setPago(editing?.pago ?? false);
    setStatus(editing?.status ?? "pendente");
    if (!editing) setBlocoId("");
  }, [open, editing]);

  useEffect(() => {
    if (open && editingBlocoId.data) setBlocoId(editingBlocoId.data);
  }, [open, editingBlocoId.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!condominioId) throw new Error("Selecione o condomínio");
      if (!descricao.trim()) throw new Error("Descrição é obrigatória");
      const payload = {
        condominio_id: condominioId,
        unidade_id: unidadeId || null,
        morador_nome: moradorNome.trim() || null,
        tipo,
        descricao: descricao.trim(),
        status,
        pago,
        valor: valor.trim() ? Number(valor.replace(",", ".")) : null,
      };
      if (editing) {
        const { error } = await supabase.from("solicitacoes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("solicitacoes").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Solicitação atualizada" : "Solicitação criada");
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      onOpenChange(false);
    },
    onError: (e) => reportError("salvar solicitação", e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar solicitação" : "Nova solicitação"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Condomínio *</Label>
            <Select value={condominioId} onValueChange={(v) => { setCondominioId(v); setBlocoId(""); setUnidadeId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(condominios.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Bloco</Label>
              <Select value={blocoId} onValueChange={(v) => { setBlocoId(v); setUnidadeId(""); }} disabled={!condominioId}>
                <SelectTrigger><SelectValue placeholder="Bloco (opcional)" /></SelectTrigger>
                <SelectContent>
                  {(blocos.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId} disabled={!blocoId}>
                <SelectTrigger><SelectValue placeholder="Unidade (opcional)" /></SelectTrigger>
                <SelectContent>
                  {(unidades.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="s-morador">Nome do morador</Label>
            <Input id="s-morador" value={moradorNome} onChange={(e) => setMoradorNome(e.target.value)} placeholder="(opcional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoSolicitacao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_LABEL) as TipoSolicitacao[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusSolicitacao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as StatusSolicitacao[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="s-desc">Descrição *</Label>
            <Textarea id="s-desc" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="s-valor">Valor (R$)</Label>
              <Input id="s-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="(opcional)" />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox id="s-pago" checked={pago} onCheckedChange={(v) => setPago(!!v)} />
              <Label htmlFor="s-pago" className="cursor-pointer">Pago</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : editing ? "Salvar alterações" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}