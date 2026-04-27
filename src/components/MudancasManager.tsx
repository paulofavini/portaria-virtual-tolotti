import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Truck,
  Search,
  Building2,
  MapPin,
  Calendar,
  ArrowDownToLine,
  ArrowUpFromLine,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMudancas, isFuture, isToday } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type TipoMudanca = "entrada" | "saida";

export type MudancaRow = {
  id: string;
  condominio_id: string;
  unidade_id: string;
  morador_id: string | null;
  tipo: TipoMudanca;
  data: string;
  created_at: string | null;
  condominios: { nome: string } | null;
  unidades: { numero: string; blocos: { nome: string } | null } | null;
  moradores: { nome: string } | null;
};

function reportError(scope: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[MudancasManager] ${scope}:`, error);
  const msg =
    error instanceof Error ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Erro desconhecido";
  toast.error(`Erro: ${scope}`, { description: msg });
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function MudancasManager({ openNew = false }: { openNew?: boolean }) {
  const qc = useQueryClient();
  const { canManageOperational } = useAuth();
  // Lê ?periodo=passadas|hoje|futuras|todas vindo do Dashboard.
  const search = (useSearch({ strict: false }) as { periodo?: string }) ?? {};
  const periodoInicial = (search.periodo === "passadas" || search.periodo === "hoje" || search.periodo === "futuras")
    ? search.periodo
    : "todas";
  const [filtroCondo, setFiltroCondo] = useState<string>("all");
  const [filtroTipo, setFiltroTipo] = useState<"all" | TipoMudanca>("all");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"todas" | "passadas" | "hoje" | "futuras">(periodoInicial);
  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");
  const [editing, setEditing] = useState<"new" | null>(openNew ? "new" : null);
  const [removing, setRemoving] = useState<MudancaRow | null>(null);

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

  const mudancasQuery = useMudancas();
  const mudancas = (mudancasQuery.data ?? []) as unknown as MudancaRow[];
  const isLoading = mudancasQuery.isLoading;

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mudancas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mudança removida");
      qc.invalidateQueries({ queryKey: ["mudancas"] });
      setRemoving(null);
    },
    onError: (e) => reportError("Remover mudança", e),
  });

  const filtered = useMemo(() => {
    return mudancas.filter((m) => {
      if (filtroCondo !== "all" && m.condominio_id !== filtroCondo) return false;
      if (filtroTipo !== "all" && m.tipo !== filtroTipo) return false;
      if (filtroPeriodo === "hoje" && !isToday(m.data)) return false;
      if (filtroPeriodo === "futuras" && !isFuture(m.data)) return false;
      if (filtroPeriodo === "passadas" && (isToday(m.data) || isFuture(m.data))) return false;
      if (buscaDeb) {
        const hay = `${m.condominios?.nome ?? ""} ${m.moradores?.nome ?? ""} ${m.unidades?.numero ?? ""} ${m.unidades?.blocos?.nome ?? ""}`.toLowerCase();
        if (!hay.includes(buscaDeb)) return false;
      }
      return true;
    });
  }, [mudancas, filtroCondo, filtroTipo, filtroPeriodo, buscaDeb]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar morador, unidade ou condomínio..."
            className="pl-9"
          />
        </div>
        <Select value={filtroCondo} onValueChange={setFiltroCondo}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Condomínio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os condomínios</SelectItem>
            {condominios?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as "all" | TipoMudanca)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroPeriodo} onValueChange={(v) => setFiltroPeriodo(v as typeof filtroPeriodo)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os períodos</SelectItem>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="futuras">Futuras</SelectItem>
            <SelectItem value="passadas">Passadas</SelectItem>
          </SelectContent>
        </Select>
        {(filtroCondo !== "all" || filtroTipo !== "all" || filtroPeriodo !== "todas" || busca) && (
          <Button variant="outline" size="sm"
            onClick={() => { setFiltroCondo("all"); setFiltroTipo("all"); setFiltroPeriodo("todas"); setBusca(""); }}>
            Limpar filtros
          </Button>
        )}
        {canManageOperational && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4 mr-1" /> Nova mudança
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando mudanças...</div>
      ) : !filtered.length ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <h3 className="font-semibold text-foreground">Nenhuma mudança encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {mudancas.length > 0
              ? "Os filtros aplicados não retornaram resultados."
              : canManageOperational ? "Clique em + Nova mudança para começar." : "Aguarde novas mudanças."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const isEntrada = m.tipo === "entrada";
            return (
              <div
                key={m.id}
                className="relative overflow-hidden rounded-xl border border-border p-4 sm:p-5 pl-5 sm:pl-6 bg-card transition-shadow hover:shadow-md"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <span aria-hidden className={cn(
                  "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
                  isEntrada ? "bg-success" : "bg-destructive",
                )} />
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                    isEntrada ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
                  )}>
                    {isEntrada ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Building2 className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                        <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight break-words">
                          {m.condominios?.nome ?? "Sem condomínio"}
                        </h2>
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border shrink-0",
                        isEntrada
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-destructive/10 text-destructive border-destructive/30",
                      )}>
                        {isEntrada ? "Entrada" : "Saída"}
                      </span>
                    </div>
                    <div className="text-sm text-foreground/80 flex flex-wrap gap-x-3 gap-y-1">
                      {m.unidades && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          Bloco {m.unidades.blocos?.nome} / Unidade {m.unidades.numero}
                        </span>
                      )}
                      {m.moradores && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {m.moradores.nome}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR", {
                        weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                    </div>
                  </div>
                  {canManageOperational && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(m)} title="Remover">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de cadastro */}
      <MudancaFormDialog
        open={editing === "new"}
        onClose={() => setEditing(null)}
      />

      {/* Confirmação remoção */}
      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover mudança?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removing && removeMutation.mutate(removing.id)}
              disabled={removeMutation.isPending}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MudancaFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [condominioId, setCondominioId] = useState<string>("");
  const [blocoId, setBlocoId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [moradorId, setMoradorId] = useState<string>("none");
  const [tipo, setTipo] = useState<TipoMudanca>("entrada");
  const [data, setData] = useState<string>(todayISO());

  useEffect(() => {
    if (!open) {
      setCondominioId(""); setBlocoId(""); setUnidadeId("");
      setMoradorId("none"); setTipo("entrada"); setData(todayISO());
    }
  }, [open]);

  const { data: condominios } = useQuery({
    queryKey: ["condominios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("condominios").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

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
    enabled: !!unidadeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moradores").select("id, nome").eq("unidade_id", unidadeId).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!condominioId || !unidadeId || !tipo || !data) {
        throw new Error("Preencha condomínio, unidade, tipo e data.");
      }
      const payload = {
        condominio_id: condominioId,
        unidade_id: unidadeId,
        morador_id: moradorId !== "none" ? moradorId : null,
        tipo,
        data,
      };
      const { error } = await supabase.from("mudancas").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mudança cadastrada");
      qc.invalidateQueries({ queryKey: ["mudancas"] });
      onClose();
    },
    onError: (e) => reportError("Salvar mudança", e),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Nova mudança
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Condomínio *</Label>
            <Select value={condominioId} onValueChange={(v) => { setCondominioId(v); setBlocoId(""); setUnidadeId(""); setMoradorId("none"); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {condominios?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bloco *</Label>
              <Select value={blocoId} onValueChange={(v) => { setBlocoId(v); setUnidadeId(""); setMoradorId("none"); }} disabled={!condominioId}>
                <SelectTrigger><SelectValue placeholder={condominioId ? "Selecione" : "Selecione o condomínio"} /></SelectTrigger>
                <SelectContent>
                  {blocos?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unidade *</Label>
              <Select value={unidadeId} onValueChange={(v) => { setUnidadeId(v); setMoradorId("none"); }} disabled={!blocoId}>
                <SelectTrigger><SelectValue placeholder={blocoId ? "Selecione" : "Selecione o bloco"} /></SelectTrigger>
                <SelectContent>
                  {unidades?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Morador</Label>
            <Select value={moradorId} onValueChange={setMoradorId} disabled={!unidadeId}>
              <SelectTrigger><SelectValue placeholder={unidadeId ? "Selecione (opcional)" : "Selecione a unidade"} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem morador vinculado</SelectItem>
                {moradores?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMudanca)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}