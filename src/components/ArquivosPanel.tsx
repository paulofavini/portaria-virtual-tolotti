import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Eye,
  Download,
  Trash2,
  FileText,
  FileImage,
  File as FileIcon,
  Upload,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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

const BUCKET = "condominio-arquivos";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPT =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";

type Arquivo = {
  id: string;
  condominio_id: string;
  nome: string;
  descricao: string;
  url: string;
  storage_path: string;
  tipo: string | null;
  tamanho: number | null;
  criado_por: string | null;
  criado_por_nome: string | null;
  ativo: boolean;
  created_at: string;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function iconFor(tipo: string | null) {
  if (!tipo) return FileIcon;
  if (tipo.startsWith("image/")) return FileImage;
  if (tipo === "application/pdf") return FileText;
  if (tipo.includes("word") || tipo.includes("msword")) return FileText;
  return FileIcon;
}

function isImage(tipo: string | null) {
  return !!tipo && tipo.startsWith("image/");
}

function isPdf(tipo: string | null) {
  return tipo === "application/pdf";
}

async function getSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export function ArquivosPanel({ condominioId }: { condominioId: string }) {
  const { canManageOperational, isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<{ arquivo: Arquivo; url: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Arquivo | null>(null);
  const [editing, setEditing] = useState<Arquivo | null>(null);

  const { data: arquivos, isLoading } = useQuery({
    queryKey: ["arquivos", condominioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("arquivos")
        .select("*")
        .eq("condominio_id", condominioId)
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Arquivo[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (arq: Arquivo) => {
      let nomeUsuario: string | null = null;
      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("nome_completo")
          .eq("id", user.id)
          .maybeSingle();
        nomeUsuario = p?.nome_completo ?? user.email ?? null;
      }
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("arquivos")
        .update({
          ativo: false,
          deletado_em: now,
          deletado_por: user?.id ?? null,
          deletado_por_nome: nomeUsuario,
        })
        .eq("id", arq.id);
      if (error) throw error;
      await supabase.from("arquivo_logs").insert({
        arquivo_id: arq.id,
        acao: "delete",
        usuario_id: user?.id ?? null,
        nome_usuario: nomeUsuario,
      });
    },
    onSuccess: () => {
      toast.success("Arquivo excluído");
      qc.invalidateQueries({ queryKey: ["arquivos", condominioId] });
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const handleVisualizar = async (arq: Arquivo) => {
    try {
      const url = await getSignedUrl(arq.storage_path);
      setPreview({ arquivo: arq, url });
    } catch (e) {
      toast.error("Erro ao abrir arquivo", { description: (e as Error).message });
    }
  };

  const handleDownload = async (arq: Arquivo) => {
    try {
      const url = await getSignedUrl(arq.storage_path);
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = arq.nome || "arquivo";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      toast.error("Erro no download", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-foreground">Arquivos</h3>
          <p className="text-xs text-muted-foreground">
            Documentos e imagens do condomínio (PDF, DOC, DOCX, imagens até 10MB).
          </p>
        </div>
        {canManageOperational && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Enviar arquivo
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !arquivos?.length ? (
        <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
          Nenhum arquivo enviado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {arquivos.map((arq) => {
            const Icon = iconFor(arq.tipo);
            return (
              <div
                key={arq.id}
                className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="h-24 rounded-lg bg-muted flex items-center justify-center">
                  {isImage(arq.tipo) ? (
                    <ThumbImage path={arq.storage_path} alt={arq.nome} />
                  ) : (
                    <Icon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground text-sm truncate" title={arq.nome}>
                    {arq.nome}
                  </div>
                  <div
                    className="text-xs text-muted-foreground line-clamp-2"
                    title={arq.descricao}
                  >
                    {arq.descricao}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {new Date(arq.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Por {arq.criado_por_nome ?? "—"} · {formatSize(arq.tamanho)}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleVisualizar(arq)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(arq)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" /> Baixar
                  </Button>
                  {canManageOperational && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing(arq)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(arq)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        condominioId={condominioId}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["arquivos", condominioId] })}
      />

      <EditArquivoDialog
        arquivo={editing}
        onClose={() => setEditing(null)}
        onSuccess={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["arquivos", condominioId] });
        }}
      />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{preview?.arquivo.nome}</DialogTitle>
            <DialogDescription>{preview?.arquivo.descricao}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="w-full h-[70vh] bg-muted rounded-lg overflow-hidden">
              {isPdf(preview.arquivo.tipo) ? (
                <iframe src={preview.url} className="w-full h-full" title={preview.arquivo.nome} />
              ) : isImage(preview.arquivo.tipo) ? (
                <div className="w-full h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.url}
                    alt={preview.arquivo.nome}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <FileIcon className="h-12 w-12" />
                  <p className="text-sm">Pré-visualização não disponível para este tipo.</p>
                  <Button onClick={() => handleDownload(preview.arquivo)}>
                    <Download className="h-4 w-4 mr-1" /> Baixar arquivo
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo "{confirmDelete?.nome}" será ocultado. A ação ficará registrada
              no log de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ThumbImage({ path, alt }: { path: string; alt: string }) {
  const { data } = useQuery({
    queryKey: ["arquivo-thumb", path],
    queryFn: () => getSignedUrl(path),
    staleTime: 60 * 1000 * 5,
  });
  if (!data) return <FileImage className="h-10 w-10 text-muted-foreground" />;
  return (
    <img
      src={data}
      alt={alt}
      className="w-full h-full object-cover rounded-lg"
    />
  );
}

function UploadDialog({
  open,
  onOpenChange,
  condominioId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  condominioId: string;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setNome("");
    setDescricao("");
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Selecione um arquivo");
      return;
    }
    if (!descricao.trim()) {
      toast.error("A descrição é obrigatória");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande", {
        description: "O limite é de 10MB.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? "." + ext : ""}`;
      const storagePath = `${condominioId}/${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      let nomeUsuario: string | null = null;
      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("nome_completo")
          .eq("id", user.id)
          .maybeSingle();
        nomeUsuario = p?.nome_completo ?? user.email ?? null;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("arquivos")
        .insert({
          condominio_id: condominioId,
          nome: nome.trim() || file.name,
          descricao: descricao.trim(),
          url: pub.publicUrl,
          storage_path: storagePath,
          tipo: file.type || null,
          tamanho: file.size,
          criado_por: user?.id ?? null,
          criado_por_nome: nomeUsuario,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      await supabase.from("arquivo_logs").insert({
        arquivo_id: inserted.id,
        acao: "upload",
        usuario_id: user?.id ?? null,
        nome_usuario: nomeUsuario,
      });

      toast.success("Arquivo enviado");
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      toast.error("Erro ao enviar", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Enviar arquivo</DialogTitle>
            <DialogDescription>
              PDF, DOC, DOCX ou imagem. Tamanho máximo: 10MB.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="arq-nome">Nome (opcional)</Label>
            <Input
              id="arq-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Convenção do condomínio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arq-desc">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="arq-desc"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Breve descrição do arquivo"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arq-file">Arquivo</Label>
            <Input
              id="arq-file"
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {formatSize(file.size)}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>Enviando...</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" /> Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditArquivoDialog({
  arquivo,
  onClose,
  onSuccess,
}: {
  arquivo: Arquivo | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (arquivo) {
      setNome(arquivo.nome ?? "");
      setDescricao(arquivo.descricao ?? "");
    }
  }, [arquivo?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) return;
    if (!descricao.trim()) {
      toast.error("A descrição é obrigatória");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("arquivos")
        .update({ nome: nome.trim() || arquivo.nome, descricao: descricao.trim() })
        .eq("id", arquivo.id);
      if (error) throw error;
      toast.success("Arquivo atualizado");
      onSuccess();
    } catch (err) {
      toast.error("Erro ao salvar", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!arquivo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Editar arquivo</DialogTitle>
            <DialogDescription>
              Atualize o nome e a descrição do arquivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="arq-edit-nome">Nome</Label>
            <Input
              id="arq-edit-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do arquivo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arq-edit-desc">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="arq-edit-desc"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

