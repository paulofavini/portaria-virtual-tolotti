import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Pencil, Trash2, Save, X, KeyRound, Phone as PhoneIcon, Building2, Wifi, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatEndereco } from "@/lib/address";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type CondoRow = {
  id: string;
  nome: string;
  cnpj: string | null;
  sindico_nome: string | null;
  sindico_telefone: string | null;
  subsindico_nome: string | null;
  subsindico_telefone: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
};

type InfoOp = {
  id?: string;
  condominio_id: string;
  ramal_principal: string | null;
  senha_guarita: string | null;
  senha_portao_terreo: string | null;
  senha_portao_subsolo: string | null;
  senha_bicicletario: string | null;
  senha_academia: string | null;
  senha_clausura: string | null;
  wifi_rede: string | null;
  wifi_senha: string | null;
  ddns: string | null;
};

type Contato = {
  id: string;
  condominio_id: string;
  tipo: string;
  empresa: string | null;
  telefone: string | null;
  observacoes: string | null;
};

type Ramal = {
  id: string;
  condominio_id: string;
  numero: string;
  descricao: string | null;
};

const SENHA_FIELDS: { key: keyof InfoOp; label: string }[] = [
  { key: "senha_guarita", label: "Guarita" },
  { key: "senha_portao_terreo", label: "Portão térreo" },
  { key: "senha_portao_subsolo", label: "Portão subsolo" },
  { key: "senha_bicicletario", label: "Bicicletário" },
  { key: "senha_academia", label: "Academia" },
  { key: "senha_clausura", label: "Clausura" },
];

function SectionCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="bg-card rounded-xl border border-border p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value || "—"}</div>
    </div>
  );
}

function PasswordRow({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string | null;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {editing ? (
        <div className="flex gap-2">
          <Input
            type={show ? "text" : "password"}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="—"
          />
          <Button type="button" size="icon" variant="outline" onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-background/50 min-h-9">
          <span className="text-sm font-mono text-foreground">
            {value ? (show ? value : "•".repeat(Math.min(value.length, 10))) : "—"}
          </span>
          {value && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function InfoOperacionalPanel({ condominio }: { condominio: CondoRow }) {
  const { canManageOperational } = useAuth();
  const qc = useQueryClient();
  const condoId = condominio.id;

  // ---- Info Operacional (1:1) ----
  const { data: info, isLoading: infoLoading } = useQuery({
    queryKey: ["info_operacional", condoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominio_info_operacional")
        .select("*")
        .eq("condominio_id", condoId)
        .maybeSingle();
      if (error) throw error;
      return data as InfoOp | null;
    },
  });

  const [editingInfo, setEditingInfo] = useState(false);
  const [infoDraft, setInfoDraft] = useState<InfoOp | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (!editingInfo) {
      setInfoDraft(
        info ?? {
          condominio_id: condoId,
          ramal_principal: null,
          senha_guarita: null,
          senha_portao_terreo: null,
          senha_portao_subsolo: null,
          senha_bicicletario: null,
          senha_academia: null,
          senha_clausura: null,
          wifi_rede: null,
          wifi_senha: null,
          ddns: null,
        },
      );
    }
  }, [info, editingInfo, condoId]);

  const startEditInfo = () => {
    setInfoDraft(
      info ?? {
        condominio_id: condoId,
        ramal_principal: null,
        senha_guarita: null,
        senha_portao_terreo: null,
        senha_portao_subsolo: null,
        senha_bicicletario: null,
        senha_academia: null,
        senha_clausura: null,
        wifi_rede: null,
        wifi_senha: null,
        ddns: null,
      },
    );
    setEditingInfo(true);
  };

  const saveInfo = async () => {
    if (!infoDraft) return;
    setSavingInfo(true);
    const payload = { ...infoDraft, condominio_id: condoId };
    const { error } = await supabase
      .from("condominio_info_operacional")
      .upsert(payload, { onConflict: "condominio_id" });
    setSavingInfo(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Informações atualizadas");
    setEditingInfo(false);
    qc.invalidateQueries({ queryKey: ["info_operacional", condoId] });
    qc.invalidateQueries({ queryKey: ["senha_historico", condoId] });
  };

  const updateDraft = <K extends keyof InfoOp>(k: K, v: InfoOp[K]) => {
    setInfoDraft((d) => (d ? { ...d, [k]: v } : d));
  };

  // ---- Contatos úteis ----
  const { data: contatos = [] } = useQuery({
    queryKey: ["contatos_uteis", condoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominio_contato_util")
        .select("*")
        .eq("condominio_id", condoId)
        .order("tipo");
      if (error) throw error;
      return data as Contato[];
    },
  });

  const [contatoModal, setContatoModal] = useState<{ open: boolean; row: Partial<Contato> | null }>({
    open: false,
    row: null,
  });

  const saveContato = async () => {
    const r = contatoModal.row;
    if (!r) return;
    if (!r.tipo?.trim()) {
      toast.error("Informe o tipo");
      return;
    }
    const payload = {
      condominio_id: condoId,
      tipo: r.tipo.trim(),
      empresa: r.empresa?.trim() || null,
      telefone: r.telefone?.trim() || null,
      observacoes: r.observacoes?.trim() || null,
    };
    const { error } = r.id
      ? await supabase.from("condominio_contato_util").update(payload).eq("id", r.id)
      : await supabase.from("condominio_contato_util").insert(payload);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success(r.id ? "Contato atualizado" : "Contato adicionado");
    setContatoModal({ open: false, row: null });
    qc.invalidateQueries({ queryKey: ["contatos_uteis", condoId] });
  };

  const deleteContato = async (id: string) => {
    if (!confirm("Remover este contato?")) return;
    const { error } = await supabase.from("condominio_contato_util").delete().eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success("Contato removido");
    qc.invalidateQueries({ queryKey: ["contatos_uteis", condoId] });
  };

  // ---- Ramais internos ----
  const { data: ramais = [] } = useQuery({
    queryKey: ["ramais_internos", condoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominio_ramal_interno")
        .select("*")
        .eq("condominio_id", condoId)
        .order("numero");
      if (error) throw error;
      return data as Ramal[];
    },
  });

  const [ramalModal, setRamalModal] = useState<{ open: boolean; row: Partial<Ramal> | null }>({
    open: false,
    row: null,
  });

  const saveRamal = async () => {
    const r = ramalModal.row;
    if (!r) return;
    if (!r.numero?.trim()) {
      toast.error("Informe o número");
      return;
    }
    const payload = {
      condominio_id: condoId,
      numero: r.numero.trim(),
      descricao: r.descricao?.trim() || null,
    };
    const { error } = r.id
      ? await supabase.from("condominio_ramal_interno").update(payload).eq("id", r.id)
      : await supabase.from("condominio_ramal_interno").insert(payload);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success(r.id ? "Ramal atualizado" : "Ramal adicionado");
    setRamalModal({ open: false, row: null });
    qc.invalidateQueries({ queryKey: ["ramais_internos", condoId] });
  };

  const deleteRamal = async (id: string) => {
    if (!confirm("Remover este ramal?")) return;
    const { error } = await supabase.from("condominio_ramal_interno").delete().eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success("Ramal removido");
    qc.invalidateQueries({ queryKey: ["ramais_internos", condoId] });
  };

  // ---- Histórico de senhas ----
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: historico = [] } = useQuery({
    queryKey: ["senha_historico", condoId],
    enabled: historyOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominio_senha_historico")
        .select("*")
        .eq("condominio_id", condoId)
        .order("alterado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const draft = infoDraft;
  const view = info;

  return (
    <div className="space-y-4">
      {/* Info do condomínio + ramal principal */}
      <SectionCard
        title="Informações do condomínio"
        icon={Building2}
        action={
          canManageOperational && !editingInfo ? (
            <Button size="sm" variant="outline" onClick={startEditInfo} disabled={infoLoading}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
          ) : null
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Nome" value={condominio.nome} />
          <InfoRow label="CNPJ" value={condominio.cnpj} />
          <InfoRow label="Endereço" value={formatEndereco(condominio)} />
          {editingInfo ? (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Ramal principal
              </Label>
              <Input
                value={draft?.ramal_principal ?? ""}
                onChange={(e) => updateDraft("ramal_principal", e.target.value)}
                placeholder="Ex.: 9000"
              />
            </div>
          ) : (
            <InfoRow label="Ramal principal" value={view?.ramal_principal} />
          )}
        </div>
      </SectionCard>

      {/* Responsáveis */}
      <SectionCard title="Responsáveis" icon={PhoneIcon}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Síndico</div>
            <div className="text-sm font-medium text-foreground">{condominio.sindico_nome || "—"}</div>
            {condominio.sindico_telefone && (
              <a href={`tel:${condominio.sindico_telefone}`} className="text-sm text-primary hover:underline">
                {condominio.sindico_telefone}
              </a>
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Subsíndico</div>
            <div className="text-sm font-medium text-foreground">{condominio.subsindico_nome || "—"}</div>
            {condominio.subsindico_telefone && (
              <a href={`tel:${condominio.subsindico_telefone}`} className="text-sm text-primary hover:underline">
                {condominio.subsindico_telefone}
              </a>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Senhas / Acessos */}
      <SectionCard
        title="Senhas e acessos"
        icon={KeyRound}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)}>
              <History className="h-3.5 w-3.5 mr-1" /> Histórico
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SENHA_FIELDS.map((f) => (
            <PasswordRow
              key={f.key}
              label={f.label}
              value={editingInfo ? (draft?.[f.key] as string | null) : (view?.[f.key] as string | null) ?? null}
              editing={editingInfo}
              onChange={(v) => updateDraft(f.key, v as never)}
            />
          ))}

          <div className="space-y-1.5 md:col-span-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Wifi className="h-3.5 w-3.5" /> Wi-Fi
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Rede</Label>
            {editingInfo ? (
              <Input
                value={draft?.wifi_rede ?? ""}
                onChange={(e) => updateDraft("wifi_rede", e.target.value)}
              />
            ) : (
              <div className="px-3 py-2 rounded-md border border-border bg-background/50 min-h-9 text-sm">
                {view?.wifi_rede || "—"}
              </div>
            )}
          </div>
          <PasswordRow
            label="Senha Wi-Fi"
            value={editingInfo ? draft?.wifi_senha ?? null : view?.wifi_senha ?? null}
            editing={editingInfo}
            onChange={(v) => updateDraft("wifi_senha", v)}
          />

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">DDNS</Label>
            {editingInfo ? (
              <Input
                value={draft?.ddns ?? ""}
                onChange={(e) => updateDraft("ddns", e.target.value)}
                placeholder="Ex.: condominio.ddns.net"
              />
            ) : (
              <div className="px-3 py-2 rounded-md border border-border bg-background/50 min-h-9 text-sm">
                {view?.ddns || "—"}
              </div>
            )}
          </div>
        </div>

        {editingInfo && (
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setEditingInfo(false)} disabled={savingInfo}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={saveInfo} disabled={savingInfo}>
              {savingInfo ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar
            </Button>
          </div>
        )}
      </SectionCard>

      {/* Contatos úteis */}
      <SectionCard
        title="Contatos úteis"
        icon={PhoneIcon}
        action={
          canManageOperational ? (
            <Button size="sm" variant="outline" onClick={() => setContatoModal({ open: true, row: {} })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          ) : null
        }
      >
        {contatos.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Nenhum contato cadastrado.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contatos.map((c) => (
              <div key={c.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.tipo}</div>
                  <div className="text-sm font-medium text-foreground">{c.empresa || "—"}</div>
                  {c.telefone && (
                    <a href={`tel:${c.telefone}`} className="text-sm text-primary hover:underline">
                      {c.telefone}
                    </a>
                  )}
                  {c.observacoes && (
                    <div className="text-xs text-muted-foreground mt-1">{c.observacoes}</div>
                  )}
                </div>
                {canManageOperational && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setContatoModal({ open: true, row: c })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteContato(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Ramais internos */}
      <SectionCard
        title="Ramais internos"
        icon={PhoneIcon}
        action={
          canManageOperational ? (
            <Button size="sm" variant="outline" onClick={() => setRamalModal({ open: true, row: {} })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          ) : null
        }
      >
        {ramais.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Nenhum ramal cadastrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ramais.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 py-2 px-3 rounded-md border border-border bg-background/50"
              >
                <div className="font-mono font-semibold text-primary text-sm w-16 shrink-0">
                  {r.numero}
                </div>
                <div className="text-sm text-foreground flex-1 min-w-0 truncate">
                  {r.descricao || "—"}
                </div>
                {canManageOperational && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setRamalModal({ open: true, row: r })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => deleteRamal(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Modal Contato */}
      <Dialog
        open={contatoModal.open}
        onOpenChange={(o) => setContatoModal({ open: o, row: o ? contatoModal.row : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{contatoModal.row?.id ? "Editar contato" : "Novo contato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Input
                value={contatoModal.row?.tipo ?? ""}
                onChange={(e) =>
                  setContatoModal((m) => ({ ...m, row: { ...(m.row ?? {}), tipo: e.target.value } }))
                }
                placeholder="Administradora, Elevador, Internet..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input
                value={contatoModal.row?.empresa ?? ""}
                onChange={(e) =>
                  setContatoModal((m) => ({ ...m, row: { ...(m.row ?? {}), empresa: e.target.value } }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={contatoModal.row?.telefone ?? ""}
                onChange={(e) =>
                  setContatoModal((m) => ({ ...m, row: { ...(m.row ?? {}), telefone: e.target.value } }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={contatoModal.row?.observacoes ?? ""}
                onChange={(e) =>
                  setContatoModal((m) => ({
                    ...m,
                    row: { ...(m.row ?? {}), observacoes: e.target.value },
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContatoModal({ open: false, row: null })}>
              Cancelar
            </Button>
            <Button onClick={saveContato}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ramal */}
      <Dialog
        open={ramalModal.open}
        onOpenChange={(o) => setRamalModal({ open: o, row: o ? ramalModal.row : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ramalModal.row?.id ? "Editar ramal" : "Novo ramal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Número *</Label>
              <Input
                value={ramalModal.row?.numero ?? ""}
                onChange={(e) =>
                  setRamalModal((m) => ({ ...m, row: { ...(m.row ?? {}), numero: e.target.value } }))
                }
                placeholder="Ex.: 101"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={ramalModal.row?.descricao ?? ""}
                onChange={(e) =>
                  setRamalModal((m) => ({
                    ...m,
                    row: { ...(m.row ?? {}), descricao: e.target.value },
                  }))
                }
                placeholder="Ex.: Portaria, Salão de festas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRamalModal({ open: false, row: null })}>
              Cancelar
            </Button>
            <Button onClick={saveRamal}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico de senhas */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de alterações de senhas</DialogTitle>
          </DialogHeader>
          {historico.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              Nenhuma alteração registrada.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {historico.map((h) => (
                <div key={h.id} className="py-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="text-sm font-medium text-foreground">{h.campo}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.alterado_em).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {h.valor_antigo || "—"} → {h.valor_novo || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}