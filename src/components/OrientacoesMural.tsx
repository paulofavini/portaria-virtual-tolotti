import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Megaphone,
  Info,
  AlertTriangle,
  AlertOctagon,
  Pin,
  Plus,
  Pencil,
  Trash2,
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
import { cn } from "@/lib/utils";

type TipoOrientacao = "informativo" | "alerta" | "urgente";
type OrigemOrientacao = "interna" | "sindico" | "morador";

type OrientacaoRow = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoOrientacao;
  origem: OrigemOrientacao | null;
  fixado: boolean;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
};

type ProfileRow = { id: string; nome_completo: string | null };

const TIPO_LABEL: Record<TipoOrientacao, string> = {
  informativo: "Informativo",
  alerta: "Alerta",
  urgente: "Urgente",
};

const ORIGEM_LABEL: Record<OrigemOrientacao, string> = {
  interna: "Interna",
  sindico: "Síndico",
  morador: "Morador",
};

function tipoStyles(tipo: TipoOrientacao) {
  switch (tipo) {
    case "urgente":
      return {
        Icon: AlertOctagon,
        bar: "bg-destructive",
        iconWrap: "bg-destructive/10 text-destructive",
        ring: "border-destructive/30",
      };
    case "alerta":
      return {
        Icon: AlertTriangle,
        bar: "bg-amber-500",
        iconWrap: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        ring: "border-amber-500/30",
      };
    default:
      return {
        Icon: Info,
        bar: "bg-primary",
        iconWrap: "bg-primary/10 text-primary",
        ring: "border-border",
      };
  }
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function reportError(scope: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[OrientacoesMural] ${scope}:`, error);
  const msg = error instanceof Error ? error.message : "Erro desconhecido";
  toast.error(`Erro: ${scope}`, { description: msg });
}

export function OrientacoesMural() {
  const qc = useQueryClient();
  const { user, isAdmin, isOperador } = useAuth();
  const canCreate = isAdmin || isOperador;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrientacaoRow | null>(null);
  const [deleting, setDeleting] = useState<OrientacaoRow | null>(null);

  const orientacoes = useQuery({
    queryKey: ["orientacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orientacoes")
        .select("*")
        .eq("ativo", true)
        .order("fixado", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrientacaoRow[];
    },
  });

  const creatorIds = useMemo(() => {
    const ids = new Set<string>();
    (orientacoes.data ?? []).forEach((o) => { if (o.created_by) ids.add(o.created_by); });
    return Array.from(ids);
  }, [orientacoes.data]);

  const profiles = useQuery({
    queryKey: ["profiles", "for-orientacoes", creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome_completo")
        .in("id", creatorIds);
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    (profiles.data ?? []).forEach((p) => map.set(p.id, p.nome_completo ?? ""));
    return map;
  }, [profiles.data]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orientacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orientação excluída");
      qc.invalidateQueries({ queryKey: ["orientacoes"] });
      setDeleting(null);
    },
    onError: (e) => reportError("excluir orientação", e),
  });

  const items = orientacoes.data ?? [];

  return (
    <div
      className="bg-card rounded-xl border border-border p-4 sm:p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Megaphone className="h-5 w-5 text-primary shrink-0" />
          <h2 className="font-semibold text-foreground truncate">
            📢 Orientações aos operadores
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {items.length}
          </span>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova orientação
          </Button>
        )}
      </div>

      {orientacoes.isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          Nenhuma orientação ativa no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((o) => {
            const s = tipoStyles(o.tipo);
            const isOwner = !!user && o.created_by === user.id;
            const canEdit = isAdmin || (isOperador && isOwner);
            const canDelete = isAdmin || (isOperador && isOwner);
            const isAlertish = o.tipo === "urgente" || o.tipo === "alerta";
            const tone =
              o.tipo === "urgente"
                ? "bg-red-50 dark:bg-red-950/20"
                : o.tipo === "alerta"
                ? "bg-amber-50 dark:bg-amber-950/20"
                : "bg-card";
            const softShadow =
              o.tipo === "urgente"
                ? "0 2px 8px rgba(239,68,68,0.15)"
                : o.tipo === "alerta"
                ? "0 2px 8px rgba(245,158,11,0.12)"
                : "var(--shadow-card)";
            return (
              <article
                key={o.id}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-4 pl-5 transition-shadow hover:shadow-md",
                  tone,
                  s.ring,
                  o.fixado && !isAlertish && "border-2",
                )}
                style={{ boxShadow: softShadow }}
              >
                <span aria-hidden className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", s.bar)} />
                <div className="flex items-start gap-3">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", s.iconWrap)}>
                    <s.Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground leading-tight">
                        {o.titulo}
                      </h3>
                      {o.fixado && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          <Pin className="h-3 w-3" /> Fixado
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                        o.tipo === "urgente" ? "bg-destructive text-destructive-foreground"
                        : o.tipo === "alerta" ? "bg-amber-500 text-white"
                        : "bg-primary text-primary-foreground"
                      )}>
                        {TIPO_LABEL[o.tipo]}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">
                      {o.mensagem}
                    </p>
                    <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                      {o.origem && (
                        <span className="px-1.5 py-0.5 rounded border border-border">
                          Origem: {ORIGEM_LABEL[o.origem]}
                        </span>
                      )}
                      <span>
                        Cadastrado por {profileMap.get(o.created_by ?? "") || "—"} em {fmtDateTime(o.created_at)}
                      </span>
                    </div>
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {canEdit && (
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setOpen(true); }} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="icon" variant="ghost" onClick={() => setDeleting(o)} aria-label="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <OrientacaoFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orientação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A orientação "{deleting?.titulo}" será removida.
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

function OrientacaoFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: OrientacaoRow | null;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipo, setTipo] = useState<TipoOrientacao>("informativo");
  const [origem, setOrigem] = useState<OrigemOrientacao | "none">("none");
  const [fixado, setFixado] = useState(false);

  // Reset on open/editing change
  useMemo(() => {
    if (open) {
      setTitulo(editing?.titulo ?? "");
      setMensagem(editing?.mensagem ?? "");
      setTipo(editing?.tipo ?? "informativo");
      setOrigem((editing?.origem as OrigemOrientacao | null) ?? "none");
      setFixado(editing?.fixado ?? false);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!titulo.trim()) throw new Error("Título é obrigatório");
      if (!mensagem.trim()) throw new Error("Mensagem é obrigatória");
      const payload = {
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        tipo,
        origem: origem === "none" ? null : origem,
        fixado,
      };
      if (editing) {
        const { error } = await supabase
          .from("orientacoes")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("orientacoes")
          .insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Orientação atualizada" : "Orientação criada");
      qc.invalidateQueries({ queryKey: ["orientacoes"] });
      onOpenChange(false);
    },
    onError: (e) => reportError("salvar orientação", e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar orientação" : "Nova orientação"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="o-titulo">Título *</Label>
            <Input id="o-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Procedimento para retirada de encomendas" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="o-mensagem">Mensagem *</Label>
            <Textarea id="o-mensagem" rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Detalhe a orientação para o operador" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoOrientacao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="informativo">Informativo</SelectItem>
                  <SelectItem value="alerta">Alerta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Select value={origem} onValueChange={(v) => setOrigem(v as OrigemOrientacao | "none")}>
                <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhuma —</SelectItem>
                  <SelectItem value="interna">Interna</SelectItem>
                  <SelectItem value="sindico">Síndico</SelectItem>
                  <SelectItem value="morador">Morador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="o-fixado" checked={fixado} onCheckedChange={(v) => setFixado(!!v)} />
            <Label htmlFor="o-fixado" className="cursor-pointer">Fixar no topo</Label>
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