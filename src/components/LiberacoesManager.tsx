import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Search,
  ShieldCheck,
  ShieldOff,
  Building2,
  KeyRound,
  Calendar as CalendarIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCondominios, useBlocos, useUnidades, useMoradores } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Origem = "morador" | "sindico" | "empresa";
type TipoValidade = "unica" | "periodo" | "permanente";
type Status = "ativa" | "expirada" | "revogada";

type LiberacaoRow = {
  id: string;
  condominio_id: string;
  origem: Origem;
  tipo_visita: string;
  autorizador_morador_id: string | null;
  autorizador_morador_nome: string | null;
  autorizador_unidade_id: string | null;
  autorizador_sindico_nome: string | null;
  autorizador_empresa_nome: string | null;
  visitante_nome: string;
  visitante_documento: string;
  visitante_empresa: string | null;
  observacoes: string | null;
  palavra_chave: string | null;
  tipo_validade: TipoValidade;
  data_inicio: string | null;
  data_fim: string | null;
  status: Status;
  revogada_em: string | null;
  revogada_motivo: string | null;
  created_at: string;
};

const TIPOS_VISITA = [
  "prestador",
  "parente",
  "corretor",
  "funcionario",
  "buffet",
  "entrega",
  "amigo",
  "outro",
] as const;

type FormState = {
  id?: string;
  condominio_id: string;
  origem: Origem;
  tipo_visita: string;
  autorizador_morador_id: string;
  autorizador_unidade_id: string;
  autorizador_unidade_bloco_id: string;
  autorizador_sindico_nome: string;
  autorizador_empresa_nome: string;
  visitante_nome: string;
  visitante_documento: string;
  visitante_empresa: string;
  observacoes: string;
  palavra_chave: string;
  tipo_validade: TipoValidade;
  data_inicio: string;
  data_fim: string;
};

const emptyForm = (): FormState => ({
  condominio_id: "",
  origem: "morador",
  tipo_visita: "prestador",
  autorizador_morador_id: "",
  autorizador_unidade_id: "",
  autorizador_unidade_bloco_id: "",
  autorizador_sindico_nome: "",
  autorizador_empresa_nome: "",
  visitante_nome: "",
  visitante_documento: "",
  visitante_empresa: "",
  observacoes: "",
  palavra_chave: "",
  tipo_validade: "unica",
  data_inicio: "",
  data_fim: "",
});

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = /^\d{4}-\d{2}-\d{2}$/.test(d)
    ? new Date(`${d}T00:00:00`)
    : new Date(d);
  return dt.toLocaleDateString("pt-BR");
}

function statusBadge(s: Status) {
  if (s === "ativa") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Ativa</Badge>;
  if (s === "expirada") return <Badge variant="secondary">Expirada</Badge>;
  return <Badge variant="destructive">Revogada</Badge>;
}

function validadeTexto(r: LiberacaoRow) {
  if (r.tipo_validade === "permanente") return "Permanente";
  if (r.tipo_validade === "unica") return "Única";
  return `${formatDate(r.data_inicio)} → ${formatDate(r.data_fim)}`;
}

export function LiberacoesManager() {
  const qc = useQueryClient();
  const { canManageOperational } = useAuth();
  const canManage = canManageOperational;

  const { data: condominios = [] } = useCondominios();
  const { data: moradores = [] } = useMoradores();

  const [filterCondo, setFilterCondo] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [revokeTarget, setRevokeTarget] = useState<LiberacaoRow | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const { data: liberacoes = [], isLoading } = useQuery({
    queryKey: ["liberacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liberacoes" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LiberacaoRow[];
    },
  });

  const condoMap = useMemo(() => {
    const m = new Map<string, string>();
    condominios.forEach((c: any) => m.set(c.id, c.nome));
    return m;
  }, [condominios]);

  const moradoresDoCondo = useMemo(() => {
    if (!form.condominio_id) return [] as any[];
    return (moradores as any[]).filter(
      (m) => m.unidades?.blocos?.condominios?.nome &&
        condoMap.get(form.condominio_id) === m.unidades.blocos.condominios.nome,
    );
  }, [moradores, form.condominio_id, condoMap]);

  // Para selects de bloco/unidade quando origem=morador
  const { data: blocos = [] } = useBlocos(form.condominio_id || undefined);
  const { data: unidades = [] } = useUnidades(form.autorizador_unidade_bloco_id || undefined);

  const filtered = useMemo(() => {
    return liberacoes.filter((r) => {
      if (filterCondo !== "all" && r.condominio_id !== filterCondo) return false;
      if (filterTipo !== "all" && r.tipo_visita !== filterTipo) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterFrom && r.created_at < filterFrom) return false;
      if (filterTo && r.created_at > `${filterTo}T23:59:59`) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${r.visitante_nome} ${r.visitante_documento} ${r.visitante_empresa ?? ""} ${r.autorizador_morador_nome ?? ""} ${r.autorizador_sindico_nome ?? ""} ${r.autorizador_empresa_nome ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [liberacoes, filterCondo, filterTipo, filterStatus, filterFrom, filterTo, search]);

  const openCreate = () => {
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (r: LiberacaoRow) => {
    setForm({
      id: r.id,
      condominio_id: r.condominio_id,
      origem: r.origem,
      tipo_visita: r.tipo_visita,
      autorizador_morador_id: r.autorizador_morador_id ?? "",
      autorizador_unidade_id: r.autorizador_unidade_id ?? "",
      autorizador_unidade_bloco_id: "",
      autorizador_sindico_nome: r.autorizador_sindico_nome ?? "",
      autorizador_empresa_nome: r.autorizador_empresa_nome ?? "",
      visitante_nome: r.visitante_nome,
      visitante_documento: r.visitante_documento,
      visitante_empresa: r.visitante_empresa ?? "",
      observacoes: r.observacoes ?? "",
      palavra_chave: r.palavra_chave ?? "",
      tipo_validade: r.tipo_validade,
      data_inicio: r.data_inicio ?? "",
      data_fim: r.data_fim ?? "",
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (f: FormState) => {
      if (!f.condominio_id) throw new Error("Selecione o condomínio.");
      if (!f.tipo_visita) throw new Error("Selecione o tipo de visita.");
      if (!f.visitante_nome.trim()) throw new Error("Informe o nome do visitante.");
      if (!f.visitante_documento.trim()) throw new Error("Informe o documento (RG ou CPF).");
      if (f.origem === "morador" && !f.autorizador_morador_id && !f.autorizador_unidade_id) {
        throw new Error("Informe o morador ou a unidade autorizadora.");
      }
      if (f.origem === "sindico" && !f.autorizador_sindico_nome.trim()) {
        throw new Error("Informe o nome do síndico.");
      }
      if (f.origem === "empresa" && !f.autorizador_empresa_nome.trim()) {
        throw new Error("Informe o nome da empresa.");
      }
      if (f.tipo_validade === "periodo" && (!f.data_inicio || !f.data_fim)) {
        throw new Error("Informe data de início e fim para o período.");
      }

      const moradorRef = f.autorizador_morador_id
        ? (moradores as any[]).find((m) => m.id === f.autorizador_morador_id)
        : null;

      const payload: any = {
        condominio_id: f.condominio_id,
        origem: f.origem,
        tipo_visita: f.tipo_visita,
        autorizador_morador_id: f.origem === "morador" ? (f.autorizador_morador_id || null) : null,
        autorizador_morador_nome: f.origem === "morador" ? (moradorRef?.nome ?? null) : null,
        autorizador_unidade_id: f.origem === "morador" ? (f.autorizador_unidade_id || moradorRef?.unidade_id || null) : null,
        autorizador_sindico_nome: f.origem === "sindico" ? f.autorizador_sindico_nome.trim() : null,
        autorizador_empresa_nome: f.origem === "empresa" ? f.autorizador_empresa_nome.trim() : null,
        visitante_nome: f.visitante_nome.trim(),
        visitante_documento: f.visitante_documento.trim(),
        visitante_empresa: f.visitante_empresa.trim() || null,
        observacoes: f.observacoes.trim() || null,
        palavra_chave: f.palavra_chave.trim() || null,
        tipo_validade: f.tipo_validade,
        data_inicio: f.tipo_validade === "periodo" ? f.data_inicio || null : null,
        data_fim: f.tipo_validade === "periodo" ? f.data_fim || null : null,
      };

      if (f.id) {
        const { error } = await supabase.from("liberacoes" as any).update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("liberacoes" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Liberação salva.");
      qc.invalidateQueries({ queryKey: ["liberacoes"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar."),
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from("liberacoes" as any)
        .update({
          status: "revogada",
          revogada_em: new Date().toISOString(),
          revogada_motivo: motivo || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Liberação revogada.");
      qc.invalidateQueries({ queryKey: ["liberacoes"] });
      setRevokeTarget(null);
      setRevokeReason("");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao revogar."),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border rounded-xl p-4 grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por visitante, documento, autorizador…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCondo} onValueChange={setFilterCondo}>
          <SelectTrigger><SelectValue placeholder="Condomínio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos condomínios</SelectItem>
            {condominios.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {TIPOS_VISITA.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="expirada">Expirada</SelectItem>
            <SelectItem value="revogada">Revogada</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end">
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova liberação
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Visitante</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Condomínio</th>
                <th className="px-4 py-3 font-medium">Autorizado por</th>
                <th className="px-4 py-3 font-medium">Validade</th>
                <th className="px-4 py-3 font-medium">Palavra-chave</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Nenhuma liberação encontrada.</td></tr>
              )}
              {filtered.map((r) => {
                const autor =
                  r.origem === "morador"
                    ? r.autorizador_morador_nome ?? "Morador"
                    : r.origem === "sindico"
                    ? `Síndico: ${r.autorizador_sindico_nome ?? "—"}`
                    : `Empresa: ${r.autorizador_empresa_nome ?? "—"}`;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.visitante_nome}</div>
                      <div className="text-xs text-muted-foreground">{r.visitante_documento}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">{r.tipo_visita}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {condoMap.get(r.condominio_id) ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{autor}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {validadeTexto(r)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.palavra_chave ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-muted">
                          <KeyRound className="h-3 w-3" /> {r.palavra_chave}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <div className="inline-flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {r.status !== "revogada" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setRevokeTarget(r)}
                              title="Revogar"
                            >
                              <ShieldOff className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {form.id ? "Editar liberação" : "Nova liberação"}
            </DialogTitle>
            <DialogDescription>
              Acesso pré-autorizado para entrada na portaria.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Origem da liberação *</Label>
              <Select
                value={form.origem}
                onValueChange={(v) => setForm((f) => ({ ...f, origem: v as Origem }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morador">Morador</SelectItem>
                  <SelectItem value="sindico">Síndico</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Condomínio *</Label>
              <Select
                value={form.condominio_id}
                onValueChange={(v) => setForm((f) => ({
                  ...f,
                  condominio_id: v,
                  autorizador_morador_id: "",
                  autorizador_unidade_id: "",
                  autorizador_unidade_bloco_id: "",
                }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {condominios.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de visita *</Label>
              <Select
                value={form.tipo_visita}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo_visita: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_VISITA.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de validade</Label>
              <Select
                value={form.tipo_validade}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo_validade: v as TipoValidade }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Única</SelectItem>
                  <SelectItem value="periodo">Por período</SelectItem>
                  <SelectItem value="permanente">Permanente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.tipo_validade === "periodo" && (
              <>
                <div className="space-y-1.5">
                  <Label>Data início *</Label>
                  <Input type="date" value={form.data_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data fim *</Label>
                  <Input type="date" value={form.data_fim}
                    onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} />
                </div>
              </>
            )}
          </div>

          {/* Quem autorizou */}
          <div className="border rounded-lg p-3 mt-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Quem autorizou
            </div>
            {form.origem === "morador" && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Morador</Label>
                  <Select
                    value={form.autorizador_morador_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, autorizador_morador_id: v }))}
                    disabled={!form.condominio_id}
                  >
                    <SelectTrigger><SelectValue placeholder={form.condominio_id ? "Selecionar morador" : "Escolha o condomínio"} /></SelectTrigger>
                    <SelectContent>
                      {moradoresDoCondo.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome} {m.unidades ? `— ${m.unidades.blocos?.nome ?? ""} ${m.unidades.numero}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Bloco (opcional)</Label>
                  <Select
                    value={form.autorizador_unidade_bloco_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, autorizador_unidade_bloco_id: v, autorizador_unidade_id: "" }))}
                    disabled={!form.condominio_id}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {blocos.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Unidade</Label>
                  <Select
                    value={form.autorizador_unidade_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, autorizador_unidade_id: v }))}
                    disabled={!form.autorizador_unidade_bloco_id}
                  >
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {unidades.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.numero}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {form.origem === "sindico" && (
              <div className="space-y-1.5">
                <Label>Nome do síndico *</Label>
                <Input
                  value={form.autorizador_sindico_nome}
                  onChange={(e) => setForm((f) => ({ ...f, autorizador_sindico_nome: e.target.value }))}
                />
              </div>
            )}
            {form.origem === "empresa" && (
              <div className="space-y-1.5">
                <Label>Nome da empresa *</Label>
                <Input
                  value={form.autorizador_empresa_nome}
                  onChange={(e) => setForm((f) => ({ ...f, autorizador_empresa_nome: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* Visitante */}
          <div className="border rounded-lg p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Dados do visitante
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome completo *</Label>
                <Input
                  value={form.visitante_nome}
                  onChange={(e) => setForm((f) => ({ ...f, visitante_nome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Documento (RG ou CPF) *</Label>
                <Input
                  value={form.visitante_documento}
                  onChange={(e) => setForm((f) => ({ ...f, visitante_documento: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Empresa (opcional)</Label>
                <Input
                  value={form.visitante_empresa}
                  onChange={(e) => setForm((f) => ({ ...f, visitante_empresa: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Palavra-chave (opcional)</Label>
                <Input
                  value={form.palavra_chave}
                  onChange={(e) => setForm((f) => ({ ...f, palavra_chave: e.target.value }))}
                  placeholder="Validação na portaria"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke dialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar liberação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta liberação não permitirá mais o acesso. Você pode informar o motivo abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label>Motivo (opcional)</Label>
            <Textarea
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Ex.: solicitado pelo morador"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              onClick={() => revokeTarget && revokeMutation.mutate({ id: revokeTarget.id, motivo: revokeReason })}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}