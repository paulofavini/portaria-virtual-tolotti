import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { Camera, X, Upload, Loader2 } from "lucide-react";

export const Route = createFileRoute("/ocorrencias/novo")({
  component: () => (
    <RequireAuth>
      <NovaOcorrenciaPage />
    </RequireAuth>
  ),
});

const TIPOS = [
  "Incidente",
  "Barulho",
  "Vandalismo",
  "Visitante não autorizado",
  "Quebra de regra",
  "Acidente",
  "Outro",
];

function NovaOcorrenciaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState(TIPOS[0]);
  const [descricao, setDescricao] = useState("");
  const [condominioId, setCondominioId] = useState<string>("");
  const [blocoId, setBlocoId] = useState<string>("");
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const condominios = useCondominios();
  const blocos = useBlocos(condominioId || undefined);
  const unidades = useUnidades(blocoId || undefined);

  const handleFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 10 MB");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!condominioId) {
      toast.error("Selecione o condomínio");
      return;
    }
    if (!descricao.trim()) {
      toast.error("Descreva a ocorrência");
      return;
    }
    setBusy(true);
    try {
      let imagem_url: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user?.id ?? "anon"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("ocorrencias").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("ocorrencias").getPublicUrl(path);
        imagem_url = pub.publicUrl;
      }

      const { error } = await supabase.from("ocorrencias").insert({
        tipo,
        descricao: descricao.trim(),
        condominio_id: condominioId,
        unidade_id: unidadeId || null,
        imagem_url,
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
      <PageHeader title="Nova ocorrência" description="Registre rapidamente o que foi observado." />

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Condomínio</Label>
          <Select value={condominioId} onValueChange={(v) => { setCondominioId(v); setBlocoId(""); setUnidadeId(""); }}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {(condominios.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {condominioId && (blocos.data?.length ?? 0) > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bloco (opcional)</Label>
              <Select value={blocoId} onValueChange={(v) => { setBlocoId(v); setUnidadeId(""); }}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(blocos.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade (opcional)</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId} disabled={!blocoId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(unidades.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div>
          <Label>Descrição</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} placeholder="Detalhe o ocorrido..." />
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
            {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando...</> : "Registrar ocorrência"}
          </Button>
        </div>
      </div>
    </div>
  );
}