import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, User, Phone, Home, Car, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Veiculo = {
  id?: string;
  placa: string;
  modelo: string | null;
  cor: string | null;
};

type MoradorWithRel = {
  id: string;
  nome: string;
  telefone: string | null;
  unidade_id: string;
  vaga: string | null;
  subsolo: string | null;
  created_at?: string | null;
  created_by?: string | null;
  creator?: { id: string; nome_completo: string | null } | null;
  unidades: {
    id: string;
    numero: string;
    bloco_id: string;
    blocos: {
      id: string;
      nome: string;
      condominio_id: string;
    } | null;
  } | null;
  veiculos: Veiculo[];
};

function reportError(scope: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[MoradoresManager] ${scope}:`, error);
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : "Erro desconhecido";
  toast.error(`Erro: ${scope}`, { description: msg });
}

export function MoradoresManager({ condominioId }: { condominioId: string }) {
  const qc = useQueryClient();
  const { canManageOperational } = useAuth();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MoradorWithRel | "new" | null>(null);
  const [removing, setRemoving] = useState<MoradorWithRel | null>(null);

  const { data: moradores, isLoading } = useQuery({
    queryKey: ["moradores", "condo", condominioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moradores")
        .select(
          "id, nome, telefone, unidade_id, vaga, subsolo, created_at, created_by, unidades!inner(id, numero, bloco_id, blocos!inner(id, nome, condominio_id)), veiculos(id, placa, modelo, cor)",
        )
        .eq("unidades.blocos.condominio_id", condominioId)
        .order("nome");
      if (error) throw error;
      const list = (data ?? []) as unknown as MoradorWithRel[];
      const creatorIds = Array.from(
        new Set(list.map((m) => m.created_by).filter(Boolean) as string[]),
      );
      if (creatorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome_completo")
          .in("id", creatorIds);
        const byId = new Map((profs ?? []).map((p) => [p.id, p]));
        for (const m of list) {
          if (m.created_by) m.creator = byId.get(m.created_by) ?? null;
        }
      }
      return list;
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: vErr } = await supabase.from("veiculos").delete().eq("morador_id", id);
      if (vErr) throw vErr;
      const { error } = await supabase.from("moradores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Morador removido");
      qc.invalidateQueries({ queryKey: ["moradores"] });
      setRemoving(null);
    },
    onError: (e) => reportError("Remover morador", e),
  });

  const filtered = useMemo(() => {
    if (!moradores) return [];
    const term = search.trim().toLowerCase();
    if (!term) return moradores;
    return moradores.filter(
      (m) =>
        m.nome.toLowerCase().includes(term) ||
        (m.telefone ?? "").toLowerCase().includes(term) ||
        (m.unidades?.numero ?? "").toLowerCase().includes(term),
    );
  }, [moradores, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-foreground">Moradores</h3>
        {canManageOperational && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4 mr-1" /> Novo morador
          </Button>
        )}
      </div>

      <Input
        placeholder="Buscar por nome, telefone ou unidade..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando moradores...</div>
      ) : !filtered.length ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
          {moradores?.length
            ? "Nenhum morador encontrado para a busca."
            : "Nenhum morador cadastrado neste condomínio."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="bg-card rounded-xl border border-border p-4"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{m.nome}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-0.5">
                    {m.unidades && (
                      <span className="inline-flex items-center gap-1">
                        <Home className="h-3 w-3" />
                        {m.unidades.blocos?.nome
                          ? `Bloco ${m.unidades.blocos.nome} · `
                          : ""}
                        Unid. {m.unidades.numero}
                        {m.vaga ? ` · Vaga ${m.vaga}` : ""}
                        {m.subsolo ? ` · Subsolo ${m.subsolo}` : ""}
                      </span>
                    )}
                    {m.telefone && (
                      <a href={`tel:${m.telefone}`} className="inline-flex items-center gap-1 hover:text-primary">
                        <Phone className="h-3 w-3" />
                        {m.telefone}
                      </a>
                    )}
                  </div>
                  {m.veiculos?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.veiculos.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground/80"
                        >
                          <Car className="h-3 w-3" />
                          {v.placa}
                          {v.modelo ? ` · ${v.modelo}` : ""}
                          {v.cor ? ` · ${v.cor}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {(m.creator?.nome_completo || m.created_at) && (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Cadastrado por{" "}
                      <span className="font-medium text-foreground/80">
                        {m.creator?.nome_completo ?? "—"}
                      </span>
                      {m.created_at && (
                        <>
                          {" "}em{" "}
                          {new Date(m.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
                {canManageOperational && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoving(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <MoradorDialog
          condominioId={condominioId}
          morador={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover morador</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>{removing?.nome}</strong> e todos os veículos vinculados. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removing && removeMutation.mutate(removing.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MoradorDialog({
  condominioId,
  morador,
  onClose,
}: {
  condominioId: string;
  morador: MoradorWithRel | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!morador;
  const [nome, setNome] = useState(morador?.nome ?? "");
  const [telefone, setTelefone] = useState(morador?.telefone ?? "");
  const [vaga, setVaga] = useState(morador?.vaga ?? "");
  const [subsolo, setSubsolo] = useState(morador?.subsolo ?? "");
  const [blocoId, setBlocoId] = useState<string>(morador?.unidades?.bloco_id ?? "");
  const [unidadeId, setUnidadeId] = useState<string>(morador?.unidade_id ?? "");
  const [veiculos, setVeiculos] = useState<Veiculo[]>(morador?.veiculos ?? []);
  const [saving, setSaving] = useState(false);

  // Carregar blocos do condomínio
  const blocosQ = useQuery({
    queryKey: ["blocos", condominioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocos")
        .select("id, nome")
        .eq("condominio_id", condominioId)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Carregar unidades do bloco selecionado
  const unidadesQ = useQuery({
    queryKey: ["unidades", blocoId],
    enabled: !!blocoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("id, numero")
        .eq("bloco_id", blocoId)
        .order("numero");
      if (error) throw error;
      return data;
    },
  });

  // Mutation: criar bloco
  const criarBloco = useMutation({
    mutationFn: async (nomeBloco: string) => {
      const { data, error } = await supabase
        .from("blocos")
        .insert({ condominio_id: condominioId, nome: nomeBloco })
        .select("id, nome")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Bloco "${data.nome}" criado`);
      qc.invalidateQueries({ queryKey: ["blocos"] });
      setBlocoId(data.id);
      setUnidadeId("");
    },
    onError: (e) => reportError("Criar bloco", e),
  });

  // Mutation: criar unidade
  const criarUnidade = useMutation({
    mutationFn: async (numero: string) => {
      if (!blocoId) throw new Error("Selecione um bloco antes de criar a unidade");
      const { data, error } = await supabase
        .from("unidades")
        .insert({ bloco_id: blocoId, numero })
        .select("id, numero")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Unidade ${data.numero} criada`);
      qc.invalidateQueries({ queryKey: ["unidades", blocoId] });
      setUnidadeId(data.id);
    },
    onError: (e) => reportError("Criar unidade", e),
  });

  const updateVeiculo = (i: number, k: keyof Veiculo, v: string) =>
    setVeiculos((arr) => arr.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));

  const addVeiculo = () =>
    setVeiculos((arr) => [...arr, { placa: "", modelo: "", cor: "" }]);

  const removeVeiculo = (i: number) =>
    setVeiculos((arr) => arr.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do morador");
      return;
    }
    if (!blocoId) {
      toast.error("Selecione ou crie um bloco");
      return;
    }
    if (!unidadeId) {
      toast.error("Selecione ou crie uma unidade");
      return;
    }

    setSaving(true);
    try {
      // 1. Inserir / atualizar morador
      let moradorId = morador?.id;
      if (isEdit && moradorId) {
        const { error } = await supabase
          .from("moradores")
          .update({
            nome: nome.trim(),
            telefone: telefone.trim() || null,
            unidade_id: unidadeId,
            vaga: vaga.trim() || null,
            subsolo: subsolo.trim() || null,
          })
          .eq("id", moradorId);
        if (error) throw error;
      } else {
        const { data: newMorador, error } = await supabase
          .from("moradores")
          .insert({
            nome: nome.trim(),
            telefone: telefone.trim() || null,
            unidade_id: unidadeId,
            vaga: vaga.trim() || null,
            subsolo: subsolo.trim() || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        moradorId = newMorador.id;
      }

      // 2. Sincronizar veículos
      const validVeiculos = veiculos.filter((v) => v.placa.trim());
      const existingIds = morador?.veiculos.map((v) => v.id).filter(Boolean) as string[] | undefined;
      const keptIds = validVeiculos.map((v) => v.id).filter(Boolean) as string[];

      const toDelete = (existingIds ?? []).filter((id) => !keptIds.includes(id));
      if (toDelete.length) {
        const { error } = await supabase.from("veiculos").delete().in("id", toDelete);
        if (error) throw error;
      }

      for (const v of validVeiculos) {
        if (v.id) {
          const { error } = await supabase
            .from("veiculos")
            .update({
              placa: v.placa.trim().toUpperCase(),
              modelo: v.modelo?.trim() || null,
              cor: v.cor?.trim() || null,
            })
            .eq("id", v.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("veiculos").insert({
            morador_id: moradorId!,
            placa: v.placa.trim().toUpperCase(),
            modelo: v.modelo?.trim() || null,
            cor: v.cor?.trim() || null,
          });
          if (error) throw error;
        }
      }

      toast.success(isEdit ? "Morador atualizado" : "Morador cadastrado");
      qc.invalidateQueries({ queryKey: ["moradores"] });
      onClose();
    } catch (e) {
      reportError("Salvar morador", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar morador" : "Novo morador"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m_nome">Nome *</Label>
            <Input id="m_nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m_tel">Telefone</Label>
            <Input id="m_tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Bloco *</Label>
              <BlocoPicker
                blocos={blocosQ.data ?? []}
                value={blocoId}
                onChange={(v) => {
                  setBlocoId(v);
                  setUnidadeId("");
                }}
                onCreate={(nome) => criarBloco.mutate(nome)}
                creating={criarBloco.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <UnidadePicker
                unidades={unidadesQ.data ?? []}
                value={unidadeId}
                onChange={setUnidadeId}
                onCreate={(numero) => criarUnidade.mutate(numero)}
                creating={criarUnidade.isPending}
                disabled={!blocoId}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m_vaga">Vaga</Label>
              <Input
                id="m_vaga"
                value={vaga}
                onChange={(e) => setVaga(e.target.value)}
                placeholder="Ex.: 12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m_subsolo">Subsolo</Label>
              <Input
                id="m_subsolo"
                value={subsolo}
                onChange={(e) => setSubsolo(e.target.value)}
                placeholder="Ex.: -1"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Veículos</Label>
              <Button type="button" size="sm" variant="outline" onClick={addVeiculo}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {!veiculos.length ? (
              <p className="text-xs text-muted-foreground">Nenhum veículo.</p>
            ) : (
              <div className="space-y-2">
                {veiculos.map((v, i) => (
                  <div
                    key={v.id ?? `new-${i}`}
                    className="grid grid-cols-12 gap-2 items-end bg-muted/40 p-2 rounded-md"
                  >
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px]">Placa</Label>
                      <Input
                        value={v.placa}
                        onChange={(e) => updateVeiculo(i, "placa", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px]">Modelo</Label>
                      <Input
                        value={v.modelo ?? ""}
                        onChange={(e) => updateVeiculo(i, "modelo", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-[10px]">Cor</Label>
                      <Input
                        value={v.cor ?? ""}
                        onChange={(e) => updateVeiculo(i, "cor", e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="col-span-1 h-8 w-8 text-destructive"
                      onClick={() => removeVeiculo(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlocoPicker({
  blocos,
  value,
  onChange,
  onCreate,
  creating,
}: {
  blocos: { id: string; nome: string }[];
  value: string;
  onChange: (v: string) => void;
  onCreate: (nome: string) => void;
  creating: boolean;
}) {
  const [novo, setNovo] = useState("");
  const [showNew, setShowNew] = useState(false);

  if (showNew) {
    return (
      <div className="flex gap-1">
        <Input
          autoFocus
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Ex.: A"
          className="h-9"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (novo.trim()) {
              onCreate(novo.trim());
              setNovo("");
              setShowNew(false);
            }
          }}
          disabled={creating || !novo.trim()}
        >
          OK
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowNew(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <Select value={value || "_none"} onValueChange={(v) => onChange(v === "_none" ? "" : v)}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">— selecione —</SelectItem>
          {blocos.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="icon" variant="outline" onClick={() => setShowNew(true)} title="Novo bloco">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function UnidadePicker({
  unidades,
  value,
  onChange,
  onCreate,
  creating,
  disabled,
}: {
  unidades: { id: string; numero: string }[];
  value: string;
  onChange: (v: string) => void;
  onCreate: (numero: string) => void;
  creating: boolean;
  disabled: boolean;
}) {
  const [novo, setNovo] = useState("");
  const [showNew, setShowNew] = useState(false);

  if (showNew) {
    return (
      <div className="flex gap-1">
        <Input
          autoFocus
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Ex.: 101"
          className="h-9"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (novo.trim()) {
              onCreate(novo.trim());
              setNovo("");
              setShowNew(false);
            }
          }}
          disabled={creating || !novo.trim()}
        >
          OK
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setShowNew(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <Select
        value={value || "_none"}
        onValueChange={(v) => onChange(v === "_none" ? "" : v)}
        disabled={disabled}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={disabled ? "Selecione um bloco" : "Selecione..."} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">— selecione —</SelectItem>
          {unidades.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.numero}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => setShowNew(true)}
        disabled={disabled}
        title="Nova unidade"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
