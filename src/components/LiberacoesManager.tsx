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
  Copy,
  RefreshCw,
  DoorOpen,
  AlertTriangle,
  Clock,
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
import { formatUnidadeBloco } from "@/lib/address";

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
  created_by: string | null;
  updated_at: string | null;
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
  if (s === "ativa")
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-transparent">
        Ativa
      </Badge>
    );
  if (s === "expirada")
    return (
      <Badge className="bg-red-600 hover:bg-red-600 text-white border-transparent">
        Expirada
      </Badge>
    );
  return (
    <Badge className="bg-zinc-500 hover:bg-zinc-500 text-white border-transparent">
      Revogada
    </Badge>
  );
}

function validadeTexto(r: LiberacaoRow) {
  if (r.tipo_validade === "permanente") return "Permanente";
  if (r.tipo_validade === "unica") return "Única";
  return `${formatDate(r.data_inicio)} → ${formatDate(r.data_fim)}`;
}

/** Returns 'today', 'soon' (<= 3 days) or null. Only meaningful for active 'periodo' liberações. */
function expiryAlert(r: LiberacaoRow): "today" | "soon" | null {
  if (r.status !== "ativa" || r.tipo_validade !== "periodo" || !r.data_fim) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${r.data_fim}T00:00:00`);
  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays > 0 && diffDays <= 3) return "soon";
  return null;
}

function generateKeyword(format: "numeric" | "alpha", length = 6): string {
  const charset =
    format === "numeric"
      ? "0123456789"
      : "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I para evitar confusão
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length];
  return out;
}

function formatTimestamp(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SectionTone = "today" | "periodo" | "permanente";

function Section({
  title,
  icon,
  tone,
  count,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone: SectionTone;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  const headerBg =
    tone === "today"
      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40"
      : tone === "periodo"
      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40"
      : "bg-muted/40";
  return (
    <section className="bg-card border rounded-xl overflow-hidden">
      <header
        className={cn(
          "flex items-center justify-between px-4 py-2.5 border-b",
          headerBg,
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          <span>{title}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {count}
        </Badge>
      </header>
      {count === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="divide-y">{children}</div>
      )}
    </section>
  );
}

function LiberacaoRowItem({
  r,
  tone,
  condoMap,
  profileMap,
  canManage,
  onGrant,
  grantPending,
  onEdit,
  onRevoke,
  onCopyKey,
}: {
  r: LiberacaoRow;
  tone: SectionTone;
  condoMap: Map<string, string>;
  profileMap: Map<string, string>;
  canManage: boolean;
  onGrant: () => void;
  grantPending: boolean;
  onEdit: () => void;
  onRevoke: () => void;
  onCopyKey: () => void;
}) {
  const autor =
    r.origem === "morador"
      ? r.autorizador_morador_nome ?? "Morador"
      : r.origem === "sindico"
      ? `Síndico: ${r.autorizador_sindico_nome ?? "—"}`
      : `Empresa: ${r.autorizador_empresa_nome ?? "—"}`;
  const alertKind = expiryAlert(r);
  const wasEdited =
    !!r.updated_at && !!r.created_at && r.updated_at.slice(0, 19) !== r.created_at.slice(0, 19);
  const criadoPor = r.created_by ? profileMap.get(r.created_by) ?? "—" : "—";
  const rowBg = tone === "today" ? "bg-red-50/40 dark:bg-red-950/10" : "";

  return (
    <div className={cn("px-4 py-3 grid gap-3 md:grid-cols-12 items-start", rowBg)}>
      {/* Visitante */}
      <div className="md:col-span-3">
        <div className="font-medium">{r.visitante_nome}</div>
        <div className="text-xs text-muted-foreground">{r.visitante_documento}</div>
        <div className="text-xs text-muted-foreground capitalize mt-0.5">{r.tipo_visita}</div>
      </div>

      {/* Condomínio + Autor */}
      <div className="md:col-span-3 text-sm">
        <div className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          {condoMap.get(r.condominio_id) ?? "—"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">Autorizado por: {autor}</div>
      </div>

      {/* Validade + Palavra-chave */}
      <div className="md:col-span-3 text-sm">
        <div className="inline-flex items-center gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {validadeTexto(r)}
        </div>
        {alertKind === "today" && (
          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 mt-1">
            <AlertTriangle className="h-3 w-3" /> Expira hoje
          </div>
        )}
        {alertKind === "soon" && (
          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 mt-1">
            <Clock className="h-3 w-3" /> Expira em breve
          </div>
        )}
        <div className="mt-1">
          {r.palavra_chave ? (
            <button
              type="button"
              onClick={onCopyKey}
              className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/70 transition-colors"
              title="Copiar palavra-chave"
            >
              <KeyRound className="h-3 w-3" /> {r.palavra_chave}
              <Copy className="h-3 w-3 opacity-60" />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">Sem palavra-chave</span>
          )}
        </div>
      </div>

      {/* Status + Ações */}
      <div className="md:col-span-3 flex flex-col items-start md:items-end gap-2">
        {statusBadge(r.status)}
        {canManage && (
          <div className="inline-flex gap-1 items-center">
            {r.status === "ativa" && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                onClick={onGrant}
                disabled={grantPending}
                title="Liberar acesso agora"
              >
                <DoorOpen className="h-4 w-4" /> Liberar
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={onEdit} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            {r.status !== "revogada" && (
              <Button size="icon" variant="ghost" onClick={onRevoke} title="Revogar">
                <ShieldOff className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Auditoria */}
      <div className="md:col-span-12 text-[11px] text-muted-foreground border-t pt-2 flex flex-wrap gap-x-4 gap-y-0.5">
        <span>Criado por: <span className="font-medium text-foreground/80">{criadoPor}</span></span>
        <span>Data/Hora: {formatTimestamp(r.created_at)}</span>
        {wasEdited && <span>Última alteração: {formatTimestamp(r.updated_at)}</span>}
      </div>
    </div>
  );
}

export function LiberacoesManager() {
  const qc = useQueryClient();
  const { canManageOperational } = useAuth();
  const canManage = canManageOperational;

  const { data: condominios = [] } = useCondominios();
  const { data: moradores = [] } = useMoradores();

  const [filterCondo, setFilterCondo] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
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

  // Profiles for audit metadata ("Criado por")
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", "names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome_completo, email");
      if (error) throw error;
      return data ?? [];
    },
  });
  const profileMap = useMemo(() => {
    const m = new Map<string, string>();
    (profiles as any[]).forEach((p) => {
      m.set(p.id, p.nome_completo || p.email || "Usuário");
    });
    return m;
  }, [profiles]);

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

  // Apenas ativas no painel principal. Aplica filtros + busca.
  const filteredAtivas = useMemo(() => {
    return liberacoes.filter((r) => {
      if (r.status !== "ativa") return false;
      if (filterCondo !== "all" && r.condominio_id !== filterCondo) return false;
      if (filterTipo !== "all" && r.tipo_visita !== filterTipo) return false;
      if (search) {
        const s = search.trim().toLowerCase();
        const hay = `${r.visitante_nome} ${r.visitante_documento} ${r.palavra_chave ?? ""} ${r.visitante_empresa ?? ""} ${r.autorizador_morador_nome ?? ""} ${r.autorizador_sindico_nome ?? ""} ${r.autorizador_empresa_nome ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [liberacoes, filterCondo, filterTipo, search]);

  const todayIso = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const sections = useMemo(() => {
    const hoje: LiberacaoRow[] = [];
    const periodo: LiberacaoRow[] = [];
    const permanente: LiberacaoRow[] = [];

    for (const r of filteredAtivas) {
      // 1) Hoje: tipo única (created hoje) OU período cobrindo hoje
      const isUnicaHoje =
        r.tipo_validade === "unica" &&
        r.created_at.slice(0, 10) === todayIso;
      const isPeriodoHoje =
        r.tipo_validade === "periodo" &&
        !!r.data_inicio &&
        !!r.data_fim &&
        r.data_inicio <= todayIso &&
        r.data_fim >= todayIso;

      if (isUnicaHoje || isPeriodoHoje) {
        hoje.push(r);
        continue;
      }

      // 2) Período (futuras ou em andamento já não capturadas)
      if (r.tipo_validade === "periodo") {
        periodo.push(r);
        continue;
      }

      // 3) Permanente
      if (r.tipo_validade === "permanente") {
        permanente.push(r);
      }
    }

    // Ordenações
    hoje.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    periodo.sort((a, b) => {
      const ax = a.data_fim ?? "9999-12-31";
      const bx = b.data_fim ?? "9999-12-31";
      return ax < bx ? -1 : ax > bx ? 1 : 0;
    });
    permanente.sort((a, b) => {
      const ax = (a.autorizador_empresa_nome || a.visitante_nome || "").toLowerCase();
      const bx = (b.autorizador_empresa_nome || b.visitante_nome || "").toLowerCase();
      return ax < bx ? -1 : ax > bx ? 1 : 0;
    });

    return { hoje, periodo, permanente };
  }, [filteredAtivas, todayIso]);

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

  const grantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("liberacao_acessos" as any)
        .insert({ liberacao_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso liberado e registrado.");
      qc.invalidateQueries({ queryKey: ["liberacoes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registrar acesso."),
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Palavra-chave copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border rounded-xl p-4 grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por visitante, documento ou palavra-chave…"
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
      </div>

      <div className="flex justify-end">
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nova liberação
          </Button>
        )}
      </div>

      {/* Sectioned listing */}
      {isLoading ? (
        <div className="bg-card border rounded-xl p-10 text-center text-muted-foreground">
          Carregando…
        </div>
      ) : (
        <div className="space-y-6">
          <Section
            title="Liberações de hoje"
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            tone="today"
            count={sections.hoje.length}
            empty="Nenhuma liberação para hoje."
          >
            {sections.hoje.map((r) => (
              <LiberacaoRowItem
                key={r.id}
                r={r}
                tone="today"
                condoMap={condoMap}
                profileMap={profileMap}
                canManage={canManage}
                onGrant={() => grantMutation.mutate(r.id)}
                grantPending={grantMutation.isPending}
                onEdit={() => openEdit(r)}
                onRevoke={() => setRevokeTarget(r)}
                onCopyKey={() => r.palavra_chave && copyToClipboard(r.palavra_chave)}
              />
            ))}
          </Section>

          <Section
            title="Liberações por período"
            icon={<CalendarIcon className="h-4 w-4 text-amber-600" />}
            tone="periodo"
            count={sections.periodo.length}
            empty="Nenhuma liberação por período pendente."
          >
            {sections.periodo.map((r) => (
              <LiberacaoRowItem
                key={r.id}
                r={r}
                tone="periodo"
                condoMap={condoMap}
                profileMap={profileMap}
                canManage={canManage}
                onGrant={() => grantMutation.mutate(r.id)}
                grantPending={grantMutation.isPending}
                onEdit={() => openEdit(r)}
                onRevoke={() => setRevokeTarget(r)}
                onCopyKey={() => r.palavra_chave && copyToClipboard(r.palavra_chave)}
              />
            ))}
          </Section>

          <Section
            title="Liberações permanentes"
            icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
            tone="permanente"
            count={sections.permanente.length}
            empty="Nenhuma liberação permanente."
          >
            {sections.permanente.map((r) => (
              <LiberacaoRowItem
                key={r.id}
                r={r}
                tone="permanente"
                condoMap={condoMap}
                profileMap={profileMap}
                canManage={canManage}
                onGrant={() => grantMutation.mutate(r.id)}
                grantPending={grantMutation.isPending}
                onEdit={() => openEdit(r)}
                onRevoke={() => setRevokeTarget(r)}
                onCopyKey={() => r.palavra_chave && copyToClipboard(r.palavra_chave)}
              />
            ))}
          </Section>
        </div>
      )}

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
                          {m.nome}{m.unidades ? ` — ${formatUnidadeBloco(m.unidades)}` : ""}
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
                <div className="flex gap-1.5">
                  <Input
                    value={form.palavra_chave}
                    onChange={(e) => setForm((f) => ({ ...f, palavra_chave: e.target.value }))}
                    placeholder="Validação na portaria"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Gerar numérica (6 dígitos)"
                    onClick={() =>
                      setForm((f) => ({ ...f, palavra_chave: generateKeyword("numeric", 6) }))
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Gerar alfanumérica (6 caracteres)"
                    onClick={() =>
                      setForm((f) => ({ ...f, palavra_chave: generateKeyword("alpha", 6) }))
                    }
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Copiar"
                    disabled={!form.palavra_chave}
                    onClick={() => copyToClipboard(form.palavra_chave)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Use os botões para gerar numérica, alfanumérica ou copiar.
                </p>
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