import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  PartyPopper,
  Search,
  Building2,
  MapPin,
  Clock,
  Users,
  X,
  Check,
  CheckCircle2,
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

export const LOCAIS_EVENTO = [
  "Salão de Festas",
  "Churrasqueira",
  "Piscina",
  "Quadra",
  "Playground",
  "Espaço Gourmet",
  "Outro",
] as const;

type LocalEvento = typeof LOCAIS_EVENTO[number];

export type EventoRow = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  data: string;
  horario: string | null;
  local: string | null;
  observacoes: string | null;
  condominio_id: string;
  unidade_id: string | null;
  morador_id: string | null;
  created_at: string | null;
  created_by: string | null;
  condominios: { nome: string } | null;
  unidades: { numero: string; blocos: { nome: string } | null } | null;
  moradores: { nome: string } | null;
  creator?: { id: string; nome_completo: string | null } | null;
};

type Convidado = {
  id: string;
  evento_id: string;
  nome: string;
  documento: string | null;
  presente: boolean;
  horario_checkin: string | null;
  created_at: string | null;
};

function reportError(scope: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[EventosManager] ${scope}:`, error);
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "Erro desconhecido";
  toast.error(`Erro: ${scope}`, { description: msg });
}

function fmtTime(t: string | null | undefined) {
  if (!t) return "";
  // t pode vir como "HH:MM:SS" ou "HH:MM"
  return t.slice(0, 5);
}

function fmtDateTimeISO(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function EventosManager({ openNew = false }: { openNew?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { canManageOperational } = useAuth();
  const [filtroCondo, setFiltroCondo] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [editing, setEditing] = useState<EventoRow | "new" | null>(openNew ? "new" : null);
  const [removing, setRemoving] = useState<EventoRow | null>(null);
  const [convidadosOpen, setConvidadosOpen] = useState<EventoRow | null>(null);

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

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["eventos", "full"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select(
          "id, titulo, descricao, data, horario, local, observacoes, condominio_id, unidade_id, morador_id, created_at, created_by, condominios(nome), unidades(numero, blocos(nome)), moradores(nome)",
        )
        .order("data", { ascending: false })
        .order("horario", { ascending: false });
      // eslint-disable-next-line no-console
      console.log("[EventosManager] query result", { count: data?.length, error, data });
      if (error) throw error;
      const list = (data ?? []) as unknown as EventoRow[];
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

  // Contagem de convidados (todos x presentes) por evento — em uma única query
  const { data: convCounts } = useQuery({
    queryKey: ["evento_convidados", "counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_convidados")
        .select("evento_id, presente");
      if (error) throw error;
      const map = new Map<string, { total: number; presentes: number }>();
      for (const c of data ?? []) {
        const e = map.get(c.evento_id) ?? { total: 0, presentes: 0 };
        e.total += 1;
        if (c.presente) e.presentes += 1;
        map.set(c.evento_id, e);
      }
      return map;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento removido");
      qc.invalidateQueries({ queryKey: ["eventos"] });
      qc.invalidateQueries({ queryKey: ["evento_convidados"] });
      setRemoving(null);
    },
    onError: (e) => reportError("Remover evento", e),
  });

  const filtered = useMemo(() => {
    const result = (eventos ?? []).filter((e) => {
      if (filtroCondo !== "todos" && e.condominio_id !== filtroCondo) return false;
      if (buscaDebounced) {
        const hay = `${e.titulo ?? ""} ${e.descricao ?? ""} ${e.local ?? ""} ${e.condominios?.nome ?? ""}`.toLowerCase();
        if (!hay.includes(buscaDebounced)) return false;
      }
      return true;
    });
    // eslint-disable-next-line no-console
    console.log("[EventosManager] filtered", {
      total: eventos?.length ?? 0,
      filtered: result.length,
      filtroCondo,
      buscaDebounced,
    });
    return result;
  }, [eventos, filtroCondo, buscaDebounced]);

  const handleClose = () => {
    setEditing(null);
    if (openNew) navigate({ to: "/eventos" });
  };

  return (
    <div className="space-y-4">
      {/* Busca + filtros + botão novo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar evento, local ou condomínio..."
            className="pl-9"
          />
        </div>
        <Select value={filtroCondo} onValueChange={setFiltroCondo}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Condomínio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os condomínios</SelectItem>
            {condominios?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManageOperational && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4 mr-1" /> Novo evento
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando eventos...</div>
      ) : !filtered.length ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <h3 className="font-semibold text-foreground">Nenhum evento encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {canManageOperational ? "Clique em + Novo evento para começar." : "Aguarde novos eventos."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const counts = convCounts?.get(e.id) ?? { total: 0, presentes: 0 };
            return (
              <div
                key={e.id}
                className="relative overflow-hidden rounded-xl border border-border p-4 sm:p-5 pl-5 sm:pl-6 bg-card transition-shadow hover:shadow-md"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-primary" />
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                    <PartyPopper className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/70 shrink-0" />
                        <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight break-words">
                          {e.condominios?.nome ?? "Sem condomínio"}
                        </h2>
                      </div>
                      {counts.total > 0 && (
                        <span className={cn(
                          "text-xs sm:text-sm font-bold px-2 py-0.5 rounded border shrink-0",
                          counts.presentes === counts.total
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-primary/10 text-primary border-primary/30",
                        )}>
                          {counts.presentes}/{counts.total} presentes
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-medium text-foreground/90 break-words">
                      {e.titulo || e.descricao || "(sem título)"}
                    </h3>

                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        {e.horario && ` · ${fmtTime(e.horario)}`}
                      </span>
                      {e.local && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {e.local}
                        </span>
                      )}
                      {e.unidades && (
                        <span>
                          Bloco {e.unidades.blocos?.nome} / Unidade {e.unidades.numero}
                        </span>
                      )}
                      {e.moradores && (
                        <span>Morador: <span className="font-medium text-foreground/80">{e.moradores.nome}</span></span>
                      )}
                      {(e.creator?.nome_completo || e.created_at) && (
                        <span>
                          Por <span className="font-medium text-foreground/80">{e.creator?.nome_completo ?? "—"}</span>
                        </span>
                      )}
                    </div>

                    {e.observacoes && (
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{e.observacoes}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConvidadosOpen(e)}
                      title="Ver convidados"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Convidados {counts.total > 0 && `(${counts.presentes}/${counts.total})`}
                    </Button>
                    {canManageOperational && (
                      <>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemoving(e)}
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
        <EventoDialog
          condominios={condominios ?? []}
          evento={editing === "new" ? null : editing}
          onClose={handleClose}
        />
      )}

      {convidadosOpen && (
        <ConvidadosDialog
          evento={convidadosOpen}
          onClose={() => setConvidadosOpen(null)}
        />
      )}

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover evento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente o evento{" "}
              <strong>{removing?.titulo || removing?.descricao?.slice(0, 40) || "selecionado"}</strong>{" "}
              e todos os seus convidados. Não pode ser desfeita.
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

function EventoDialog({
  condominios,
  evento,
  onClose,
}: {
  condominios: { id: string; nome: string }[];
  evento: EventoRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!evento;
  const [titulo, setTitulo] = useState(evento?.titulo ?? "");
  const [descricao, setDescricao] = useState(evento?.descricao ?? "");
  const [condominioId, setCondominioId] = useState(
    evento?.condominio_id ?? (condominios.length === 1 ? condominios[0].id : ""),
  );
  const [blocoId, setBlocoId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>(evento?.unidade_id ?? "none");
  const [moradorId, setMoradorId] = useState<string>(evento?.morador_id ?? "none");
  const [data, setData] = useState(evento?.data ?? new Date().toISOString().slice(0, 10));
  const [horario, setHorario] = useState(evento?.horario ? fmtTime(evento.horario) : "");
  const [local, setLocal] = useState<LocalEvento | "">(
    (evento?.local as LocalEvento) ?? "",
  );
  const [observacoes, setObservacoes] = useState(evento?.observacoes ?? "");
  const [convidadosTexto, setConvidadosTexto] = useState("");
  const [saving, setSaving] = useState(false);

  // Carregar blocos do condomínio
  const { data: blocos } = useQuery({
    queryKey: ["blocos", condominioId],
    enabled: !!condominioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocos").select("id, nome").eq("condominio_id", condominioId).order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Pré-resolver bloco a partir da unidade quando editando
  useEffect(() => {
    if (!evento?.unidade_id || blocoId) return;
    (async () => {
      const { data } = await supabase
        .from("unidades").select("bloco_id").eq("id", evento.unidade_id!).maybeSingle();
      if (data?.bloco_id) setBlocoId(data.bloco_id);
    })();
  }, [evento?.unidade_id, blocoId]);

  const { data: unidades } = useQuery({
    queryKey: ["unidades", blocoId],
    enabled: !!blocoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades").select("id, numero").eq("bloco_id", blocoId).order("numero");
      if (error) throw error;
      return data;
    },
  });

  const { data: moradores } = useQuery({
    queryKey: ["moradores", "by-unidade", unidadeId],
    enabled: !!unidadeId && unidadeId !== "none",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moradores").select("id, nome").eq("unidade_id", unidadeId).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    if (saving) return;
    if (!condominioId) { toast.error("Selecione um condomínio"); return; }
    if (!titulo.trim()) { toast.error("Informe o título do evento"); return; }
    if (!data) { toast.error("Informe a data"); return; }
    if (!local) { toast.error("Selecione o local"); return; }

    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        condominio_id: condominioId,
        unidade_id: unidadeId && unidadeId !== "none" ? unidadeId : null,
        morador_id: moradorId && moradorId !== "none" ? moradorId : null,
        data,
        horario: horario || null,
        local,
        observacoes: observacoes.trim() || null,
      };
      if (isEdit && evento) {
        const { error } = await supabase.from("eventos").update(payload).eq("id", evento.id);
        if (error) throw error;
        await inserirConvidadosDoTexto(evento.id, convidadosTexto);
      } else {
        const { data: novo, error } = await supabase
          .from("eventos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (novo?.id) await inserirConvidadosDoTexto(novo.id, convidadosTexto);
      }
      toast.success(isEdit ? "Evento atualizado" : "Evento cadastrado");
      await qc.invalidateQueries({ queryKey: ["eventos"], refetchType: "all" });
      await qc.refetchQueries({ queryKey: ["eventos", "full"] });
      await qc.invalidateQueries({ queryKey: ["evento_convidados"] });
      onClose();
    } catch (e) {
      reportError("Salvar evento", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev_titulo">Título *</Label>
            <Input
              id="ev_titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Aniversário 30 anos"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev_condo">Condomínio *</Label>
            <Select value={condominioId} onValueChange={(v) => { setCondominioId(v); setBlocoId(""); setUnidadeId("none"); setMoradorId("none"); }}>
              <SelectTrigger id="ev_condo"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {condominios.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Bloco (opcional)</Label>
              <Select
                value={blocoId || "none"}
                onValueChange={(v) => { setBlocoId(v === "none" ? "" : v); setUnidadeId("none"); setMoradorId("none"); }}
                disabled={!condominioId}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {blocos?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade (opcional)</Label>
              <Select
                value={unidadeId}
                onValueChange={(v) => { setUnidadeId(v); setMoradorId("none"); }}
                disabled={!blocoId}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhuma —</SelectItem>
                  {unidades?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Morador (opcional)</Label>
            <Select
              value={moradorId}
              onValueChange={setMoradorId}
              disabled={!unidadeId || unidadeId === "none"}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Nenhum —</SelectItem>
                {moradores?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ev_data">Data *</Label>
              <Input id="ev_data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev_hora">Horário (opcional)</Label>
              <Input id="ev_hora" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev_local">Local *</Label>
            <Select value={local} onValueChange={(v) => setLocal(v as LocalEvento)}>
              <SelectTrigger id="ev_local"><SelectValue placeholder="Selecione o local" /></SelectTrigger>
              <SelectContent>
                {LOCAIS_EVENTO.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev_obs">Observações (opcional)</Label>
            <Textarea
              id="ev_obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes, regras, restrições..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev_convidados">
              Lista de convidados {isEdit && <span className="text-xs text-muted-foreground font-normal">(adiciona aos existentes)</span>}
            </Label>
            <Textarea
              id="ev_convidados"
              value={convidadosTexto}
              onChange={(e) => setConvidadosTexto(e.target.value)}
              placeholder="Digite um nome por linha"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Um nome por linha. Linhas em branco são ignoradas. Você poderá editar a lista depois pelo botão de convidados do evento.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConvidadosDialog({
  evento,
  onClose,
}: {
  evento: EventoRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { canManageOperational } = useAuth();
  const [novoNome, setNovoNome] = useState("");
  const [novoDoc, setNovoDoc] = useState("");
  const [busca, setBusca] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: convidados, isLoading } = useQuery({
    queryKey: ["evento_convidados", evento.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_convidados")
        .select("id, evento_id, nome, documento, presente, horario_checkin, created_at")
        .eq("evento_id", evento.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Convidado[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (input: { nome: string; documento: string | null }) => {
      const { error } = await supabase
        .from("evento_convidados")
        .insert({ evento_id: evento.id, nome: input.nome, documento: input.documento });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovoNome("");
      setNovoDoc("");
      qc.invalidateQueries({ queryKey: ["evento_convidados", evento.id] });
      qc.invalidateQueries({ queryKey: ["evento_convidados", "counts"] });
    },
    onError: (e) => reportError("Adicionar convidado", e),
  });

  const togglePresenca = useMutation({
    mutationFn: async (c: Convidado) => {
      const { error } = await supabase
        .from("evento_convidados")
        .update({ presente: !c.presente })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evento_convidados", evento.id] });
      qc.invalidateQueries({ queryKey: ["evento_convidados", "counts"] });
    },
    onError: (e) => reportError("Marcar presença", e),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evento_convidados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convidado removido");
      qc.invalidateQueries({ queryKey: ["evento_convidados", evento.id] });
      qc.invalidateQueries({ queryKey: ["evento_convidados", "counts"] });
    },
    onError: (e) => reportError("Remover convidado", e),
  });

  const handleAdd = () => {
    const nome = novoNome.trim();
    if (!nome) { toast.error("Informe o nome do convidado"); return; }
    if (adding || addMutation.isPending) return;
    setAdding(true);
    addMutation.mutate(
      { nome, documento: novoDoc.trim() || null },
      { onSettled: () => setAdding(false) },
    );
  };

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = q
      ? (convidados ?? []).filter((c) =>
          `${c.nome} ${c.documento ?? ""}`.toLowerCase().includes(q),
        )
      : (convidados ?? []);
    // Ordenação: não-presentes primeiro, depois presentes (mantendo ordem de criação dentro de cada grupo)
    return [...base].sort((a, b) => {
      if (a.presente === b.presente) return 0;
      return a.presente ? 1 : -1;
    });
  }, [convidados, busca]);

  const total = convidados?.length ?? 0;
  const presentes = convidados?.filter((c) => c.presente).length ?? 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convidados — {evento.titulo || evento.descricao || "Evento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contador */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="font-semibold text-foreground">{presentes}</span>
              <span className="text-muted-foreground">de</span>
              <span className="font-semibold text-foreground">{total}</span>
              <span className="text-muted-foreground">presentes</span>
            </div>
            {evento.local && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {evento.local}
              </span>
            )}
          </div>

          {/* Adicionar convidado */}
          {canManageOperational && (
            <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/30">
              <Label className="text-xs">Adicionar convidado</Label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
                <Input
                  placeholder="Nome *"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                />
                <Input
                  placeholder="Documento (opcional)"
                  value={novoDoc}
                  onChange={(e) => setNovoDoc(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                />
                <Button
                  onClick={handleAdd}
                  disabled={adding || addMutation.isPending || !novoNome.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </div>
          )}

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar convidado..."
              className="pl-9"
            />
          </div>

          {/* Lista checklist */}
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando convidados...</div>
          ) : !filtered.length ? (
            <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
              {total === 0 ? "Nenhum convidado cadastrado" : "Nenhum resultado para a busca"}
            </div>
          ) : (
            <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {filtered.map((c) => {
                const disabled = togglePresenca.isPending && togglePresenca.variables?.id === c.id;
                const handleToggle = () => {
                  if (!canManageOperational || disabled) return;
                  // Confirmação leve ao desmarcar para evitar clique acidental
                  if (c.presente) {
                    const ok = window.confirm(`Desmarcar presença de ${c.nome}?`);
                    if (!ok) return;
                  }
                  togglePresenca.mutate(c);
                };
                return (
                  <li
                    key={c.id}
                    onClick={handleToggle}
                    role={canManageOperational ? "button" : undefined}
                    tabIndex={canManageOperational ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (!canManageOperational) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggle();
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border p-3 transition-all",
                      canManageOperational && "cursor-pointer hover:border-primary/40 hover:bg-muted/30",
                      c.presente && "bg-success/5 border-success/30 opacity-70",
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle();
                      }}
                      disabled={!canManageOperational || disabled}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        c.presente
                          ? "bg-success border-success text-success-foreground"
                          : "border-muted-foreground/40 hover:border-primary",
                        !canManageOperational && "cursor-not-allowed opacity-60",
                      )}
                      aria-label={c.presente ? "Desmarcar presença" : "Marcar presença"}
                      title={c.presente ? "Desmarcar presença" : "Marcar presença"}
                    >
                      {c.presente && <Check className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm font-medium text-foreground break-words",
                        c.presente && "line-through text-muted-foreground",
                      )}>
                        {c.nome}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                        {c.documento && <span>Doc: {c.documento}</span>}
                        {c.presente && c.horario_checkin && (
                          <span className="inline-flex items-center gap-1 text-success">
                            <Clock className="h-3 w-3" />
                            Check-in {fmtDateTimeISO(c.horario_checkin)}
                          </span>
                        )}
                      </div>
                    </div>
                    {canManageOperational && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMutation.mutate(c.id);
                        }}
                        disabled={removeMutation.isPending}
                        title="Remover convidado"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}