import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Bell, AlertTriangle, Wrench, Pin, PinOff } from "lucide-react";
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

export function AvisosManager({ openNew = false }: { openNew?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { canManageOperational } = useAuth();
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoAviso>("todos");
  const [filtroCondo, setFiltroCondo] = useState<string>("todos");
  const [editing, setEditing] = useState<AvisoRow | "new" | null>(openNew ? "new" : null);
  const [removing, setRemoving] = useState<AvisoRow | null>(null);

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
        .select("id, titulo, descricao, tipo, data, ativo, fixado, condominio_id, created_at, created_by, condominios(nome)")
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

  const filtered = useMemo(() => {
    if (!avisos) return [];
    return avisos.filter((a) => {
      if (filtroTipo !== "todos" && a.tipo !== filtroTipo) return false;
      if (filtroCondo !== "todos" && a.condominio_id !== filtroCondo) return false;
      return true;
    });
  }, [avisos, filtroTipo, filtroCondo]);

  const handleClose = () => {
    setEditing(null);
    if (openNew) navigate({ to: "/avisos" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as typeof filtroTipo)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="informativo">Informativo</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
              <SelectItem value="manutencao">Manutenção</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroCondo} onValueChange={setFiltroCondo}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Condomínio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os condomínios</SelectItem>
              {condominios?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            {avisos?.length ? "Nenhum aviso para os filtros aplicados" : "Nenhum aviso cadastrado"}
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
                  "bg-card rounded-xl border p-4",
                  a.fixado ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
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
                      <h3 className="font-semibold text-foreground">{a.titulo || a.descricao.slice(0, 60)}</h3>
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
                    {a.titulo && a.descricao && (
                      <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{a.descricao}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{a.condominios?.nome ?? "—"}</span>
                      <span>•</span>
                      <span>{new Date(a.data).toLocaleDateString("pt-BR")}</span>
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
                  {canManageOperational && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title={a.fixado ? "Desafixar" : "Fixar no topo"}
                        onClick={() => togglePin.mutate(a)}
                        disabled={togglePin.isPending}
                      >
                        {a.fixado ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(a)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoving(a)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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
              Esta ação removerá permanentemente o aviso <strong>{removing?.titulo || removing?.descricao.slice(0, 40)}</strong>. Não pode ser desfeita.
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
  const [ativo, setAtivo] = useState(aviso?.ativo ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!condominioId) { toast.error("Selecione um condomínio"); return; }
    if (!titulo.trim()) { toast.error("Informe o título"); return; }
    if (!descricao.trim()) { toast.error("Informe a descrição"); return; }

    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo,
        condominio_id: condominioId,
        data,
        ativo,
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
