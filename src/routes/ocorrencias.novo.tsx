import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCondominios, useBlocos, useUnidades } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

type SearchParams = { condominioId?: string };

export const Route = createFileRoute("/ocorrencias/novo")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    condominioId: typeof s.condominioId === "string" ? s.condominioId : undefined,
  }),
  component: NovaOcorrenciaPage,
});

const TIPOS_OCORRENCIA = [
  "Barulho",
  "Vazamento",
  "Animal",
  "Discussão entre moradores",
  "Dano ao patrimônio",
  "Visitante",
  "Entrega",
  "Prestador de serviço",
  "Mudança irregular",
  "Estacionamento",
  "Segurança",
  "Lixo",
  "Outro",
] as const;

function nowDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function NovaOcorrenciaPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/ocorrencias/novo" });
  const { user, canManageOperational } = useAuth();

  const [data, setData] = useState(nowDate());
  const [hora, setHora] = useState(nowTime());
  const [condominioId, setCondominioId] = useState<string>(search.condominioId ?? "");
  const [blocoId, setBlocoId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [reclamanteMoradorId, setReclamanteMoradorId] = useState<string>("");
  const [reclamanteNome, setReclamanteNome] = useState<string>("");
  const [reclamadoMoradorId, setReclamadoMoradorId] = useState<string>("");
  const [reclamadoNome, setReclamadoNome] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  const [descricao, setDescricao] = useState<string>("");
  const [sindicoCiente, setSindicoCiente] = useState(false);
  const [emersonCiente, setEmersonCiente] = useState(false);
  const [providencia, setProvidencia] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const condominios = useCondominios();
  const blocos = useBlocos(condominioId || undefined);
  const unidades = useUnidades(blocoId || undefined);

  // Moradores filtrados por unidade (se selecionada) ou condomínio
  const { data: moradores } = useQuery({
    queryKey: ["moradores-ocorrencia", condominioId, unidadeId],
    enabled: !!condominioId,
    queryFn: async () => {
      let q = supabase
        .from("moradores")
        .select("id, nome, unidade_id, unidades!inner(id, numero, blocos!inner(condominio_id, nome))")
        .eq("unidades.blocos.condominio_id", condominioId)
        .order("nome");
      if (unidadeId) q = q.eq("unidade_id", unidadeId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Array<{
        id: string;
        nome: string;
        unidade_id: string;
        unidades: { id: string; numero: string; blocos: { nome: string } };
      }>;
    },
  });

  // Auto-preenche o nome quando seleciona morador
  useEffect(() => {
    if (!reclamanteMoradorId) return;
    const m = moradores?.find((x) => x.id === reclamanteMoradorId);
    if (m) setReclamanteNome(m.nome);
  }, [reclamanteMoradorId, moradores]);
  useEffect(() => {
    if (!reclamadoMoradorId) return;
    const m = moradores?.find((x) => x.id === reclamadoMoradorId);
    if (m) setReclamadoNome(m.nome);
  }, [reclamadoMoradorId, moradores]);

  const dataHoraIso = useMemo(() => {
    if (!data) return null;
    const time = hora || "00:00";
    return new Date(`${data}T${time}:00`).toISOString();
  }, [data, hora]);

  const submit = async () => {
    if (!canManageOperational) {
      toast.error("Sem permissão para registrar ocorrências");
      return;
    }
    if (!condominioId) return toast.error("Selecione o condomínio");
    if (!tipo) return toast.error("Selecione o tipo de ocorrência");
    if (!descricao.trim()) return toast.error("Descreva a ocorrência");
    if (!dataHoraIso) return toast.error("Informe a data");

    setBusy(true);
    try {
      const { error } = await supabase.from("ocorrencias").insert({
        tipo,
        descricao: descricao.trim(),
        data_hora: dataHoraIso,
        condominio_id: condominioId,
        bloco_id: blocoId || null,
        unidade_id: unidadeId || null,
        reclamante_morador_id: reclamanteMoradorId || null,
        reclamante_nome: reclamanteNome.trim() || null,
        reclamado_morador_id: reclamadoMoradorId || null,
        reclamado_nome: reclamadoNome.trim() || null,
        sindico_ciente: sindicoCiente,
        emerson_ciente: emersonCiente,
        providencia: providencia.trim() || null,
        status: "em_andamento",
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Ocorrência registrada");
      navigate({ to: "/ocorrencias" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-24 max-w-3xl">
      <PageHeader title="Nova ocorrência" description="Registro de ocorrência da portaria." />

      <div
        className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Data e hora */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Data *</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <Label>Hora *</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>

        {/* Condomínio / Bloco / Unidade */}
        <div>
          <Label>Condomínio *</Label>
          <Select
            value={condominioId}
            onValueChange={(v) => {
              setCondominioId(v);
              setBlocoId("");
              setUnidadeId("");
              setReclamanteMoradorId("");
              setReclamadoMoradorId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {(condominios.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {condominioId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Bloco</Label>
              <Select
                value={blocoId || "_none"}
                onValueChange={(v) => {
                  setBlocoId(v === "_none" ? "" : v);
                  setUnidadeId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— sem bloco —</SelectItem>
                  {(blocos.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade (Apto)</Label>
              <Select
                value={unidadeId || "_none"}
                onValueChange={(v) => {
                  setUnidadeId(v === "_none" ? "" : v);
                  setReclamanteMoradorId("");
                  setReclamadoMoradorId("");
                }}
                disabled={!blocoId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={blocoId ? "—" : "Selecione o bloco"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— sem unidade —</SelectItem>
                  {(unidades.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Reclamante */}
        <div className="space-y-2">
          <Label>Reclamante</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              value={reclamanteMoradorId || "_none"}
              onValueChange={(v) => setReclamanteMoradorId(v === "_none" ? "" : v)}
              disabled={!condominioId}
            >
              <SelectTrigger>
                <SelectValue placeholder={condominioId ? "Selecionar morador" : "Selecione o condomínio"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— preencher manualmente —</SelectItem>
                {(moradores ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome} · Bl. {m.unidades.blocos.nome}/{m.unidades.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={reclamanteNome}
              onChange={(e) => setReclamanteNome(e.target.value)}
              placeholder="Nome do reclamante"
            />
          </div>
        </div>

        {/* Reclamado */}
        <div className="space-y-2">
          <Label>Reclamado</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              value={reclamadoMoradorId || "_none"}
              onValueChange={(v) => setReclamadoMoradorId(v === "_none" ? "" : v)}
              disabled={!condominioId}
            >
              <SelectTrigger>
                <SelectValue placeholder={condominioId ? "Selecionar morador" : "Selecione o condomínio"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— preencher manualmente —</SelectItem>
                {(moradores ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome} · Bl. {m.unidades.blocos.nome}/{m.unidades.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={reclamadoNome}
              onChange={(e) => setReclamadoNome(e.target.value)}
              placeholder="Nome do reclamado"
            />
          </div>
        </div>

        {/* Tipo */}
        <div>
          <Label>Tipo de ocorrência *</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_OCORRENCIA.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Descrição */}
        <div>
          <Label>Descrição detalhada *</Label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            placeholder="Descreva o que aconteceu..."
          />
        </div>

        {/* Cientes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 cursor-pointer">
            <Checkbox
              checked={sindicoCiente}
              onCheckedChange={(v) => setSindicoCiente(v === true)}
            />
            <span className="text-sm font-medium text-foreground">Síndico ciente</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 cursor-pointer">
            <Checkbox
              checked={emersonCiente}
              onCheckedChange={(v) => setEmersonCiente(v === true)}
            />
            <span className="text-sm font-medium text-foreground">Emerson ciente</span>
          </label>
        </div>

        {/* Providência */}
        <div>
          <Label>Providência adotada</Label>
          <Textarea
            value={providencia}
            onChange={(e) => setProvidencia(e.target.value)}
            rows={3}
            placeholder="Ações tomadas, encaminhamentos, etc."
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => navigate({ to: "/ocorrencias" })} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando...
              </>
            ) : (
              "Registrar ocorrência"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}