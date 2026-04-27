import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCondominios } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Camera, X, Upload, Loader2, UserCheck, Package, Wrench, AlertTriangle } from "lucide-react";

type SearchParams = { condominioId?: string };

export const Route = createFileRoute("/ocorrencias/novo")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    condominioId: typeof s.condominioId === "string" ? s.condominioId : undefined,
  }),
  component: () => (
    <RequireAuth>
      <NovaOcorrenciaPage />
    </RequireAuth>
  ),
});

const TIPOS = [
  { value: "visitante", label: "Visitante", icon: UserCheck },
  { value: "entrega", label: "Entrega", icon: Package },
  { value: "prestador", label: "Prestador de serviço", icon: Wrench },
  { value: "geral", label: "Ocorrência geral", icon: AlertTriangle },
] as const;

type TipoValue = (typeof TIPOS)[number]["value"];

function NovaOcorrenciaPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/ocorrencias/novo" });
  const { user, canManageOperational } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState<TipoValue>("visitante");
  const [nomePessoa, setNomePessoa] = useState("");
  const [documento, setDocumento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [condominioId, setCondominioId] = useState<string>(search.condominioId ?? "");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [moradorId, setMoradorId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const condominios = useCondominios();

  // Lista plana de unidades do condomínio (bloco/numero)
  const { data: unidades } = useQuery({
    queryKey: ["unidades-flat", condominioId],
    enabled: !!condominioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("id, numero, blocos!inner(id, nome, condominio_id)")
        .eq("blocos.condominio_id", condominioId)
        .order("numero");
      if (error) throw error;
      return data as unknown as Array<{
        id: string;
        numero: string;
        blocos: { id: string; nome: string; condominio_id: string };
      }>;
    },
  });

  const { data: moradores } = useQuery({
    queryKey: ["moradores-flat", condominioId, unidadeId],
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

  // Auto-fill nome quando seleciona morador
  useEffect(() => {
    if (!moradorId || nomePessoa.trim()) return;
    const m = moradores?.find((x) => x.id === moradorId);
    if (m) setNomePessoa(m.nome);
  }, [moradorId, moradores, nomePessoa]);

  const handleFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem válida");
    if (f.size > 10 * 1024 * 1024) return toast.error("Imagem deve ter no máximo 10 MB");
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const tipoLabel = useMemo(
    () => TIPOS.find((t) => t.value === tipo)?.label ?? tipo,
    [tipo],
  );

  const submit = async () => {
    if (!canManageOperational) {
      toast.error("Sem permissão para registrar ocorrências");
      return;
    }
    if (!condominioId) return toast.error("Selecione o condomínio");
    if (!nomePessoa.trim() && tipo !== "geral")
      return toast.error("Informe o nome da pessoa");
    if (tipo === "geral" && !observacao.trim())
      return toast.error("Descreva a ocorrência");

    setBusy(true);
    try {
      let imagem_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user?.id ?? "anon"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("ocorrencias")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        imagem_url = supabase.storage.from("ocorrencias").getPublicUrl(path).data.publicUrl;
      }

      const descricao =
        observacao.trim() ||
        (nomePessoa.trim() ? `${tipoLabel}: ${nomePessoa.trim()}` : tipoLabel);

      const { error } = await supabase.from("ocorrencias").insert({
        tipo,
        descricao,
        nome_pessoa: nomePessoa.trim() || null,
        documento: documento.trim() || null,
        condominio_id: condominioId,
        unidade_id: unidadeId || null,
        morador_id: moradorId || null,
        imagem_url,
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
    <div className="pb-24 max-w-2xl">
      <PageHeader title="Nova ocorrência" description="Registro rápido para portaria." />

      <div
        className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Tipo: chips */}
        <div>
          <Label>Tipo *</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {TIPOS.map((t) => {
              const Icon = t.icon;
              const active = tipo === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-muted text-foreground/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label>Condomínio *</Label>
          <Select
            value={condominioId}
            onValueChange={(v) => {
              setCondominioId(v);
              setUnidadeId("");
              setMoradorId("");
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

        {tipo !== "geral" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Nome da pessoa *</Label>
              <Input
                value={nomePessoa}
                onChange={(e) => setNomePessoa(e.target.value)}
                placeholder="Ex.: João Silva"
                autoFocus
              />
            </div>
            <div>
              <Label>Documento (opcional)</Label>
              <Input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="RG / CPF / placa"
              />
            </div>
          </div>
        )}

        {condominioId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Unidade</Label>
              <Select
                value={unidadeId || "_none"}
                onValueChange={(v) => {
                  setUnidadeId(v === "_none" ? "" : v);
                  setMoradorId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— sem unidade —</SelectItem>
                  {(unidades ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      Bl. {u.blocos.nome} · {u.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Morador (opcional)</Label>
              <Select
                value={moradorId || "_none"}
                onValueChange={(v) => setMoradorId(v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— nenhum —</SelectItem>
                  {(moradores ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome} · Bl. {m.unidades.blocos.nome}/{m.unidades.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div>
          <Label>Observação {tipo === "geral" ? "*" : "(opcional)"}</Label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            placeholder="Detalhes adicionais..."
          />
        </div>

        <div>
          <Label>Foto (opcional)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {previewUrl ? (
            <div className="relative inline-block mt-2">
              <img src={previewUrl} alt="preview" className="rounded-lg max-h-64 border border-border" />
              <button
                type="button"
                onClick={() => handleFile(null)}
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1" /> Tirar foto
              </Button>
              <Button type="button" variant="outline" onClick={() => galleryRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Da galeria
              </Button>
            </div>
          )}
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
