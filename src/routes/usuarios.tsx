import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useCondominios } from "@/lib/queries";
import { Plus, Pencil, Trash2, Users as UsersIcon, ShieldCheck, ShieldAlert, User } from "lucide-react";
import { toast } from "sonner";

type AppRole = "admin" | "operador" | "sindico";

interface AdminUser {
  id: string;
  email: string | null;
  nome_completo: string;
  roles: AppRole[];
  created_at: string;
  last_sign_in_at: string | null;
  condominios?: string[];
}

export const Route = createFileRoute("/usuarios")({
  component: () => (
    <RequireAuth>
      <UsuariosPage />
    </RequireAuth>
  ),
});

async function callAdminFn<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

function UsuariosPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Acesso restrito a administradores");
      navigate({ to: "/" });
    }
  }, [loading, isAdmin, navigate]);

  const load = async () => {
    setBusy(true);
    try {
      const res = await callAdminFn<{ users: AdminUser[] }>({ action: "list" });
      setUsers(res.users);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar usuários");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="pb-24">
      <PageHeader
        title="Usuários"
        description="Gestão de usuários do sistema e seus perfis de acesso."
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo usuário
          </Button>
        }
      />

      {busy && !users ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !users?.length ? (
        <EmptyState title="Nenhum usuário" description="Cadastre o primeiro usuário do sistema." />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-card rounded-xl border border-border p-4 flex items-center gap-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {(u.nome_completo || u.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{u.nome_completo || u.email}</div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {u.roles.length === 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      sem perfil
                    </span>
                  ) : (
                    u.roles.map((r) => (
                      <RoleBadge key={r} role={r} />
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditing(u)} title="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(u)}
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateUserDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {
          setOpenCreate(false);
          load();
        }}
      />

      <EditUserDialog
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.email} será removido permanentemente do sistema. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await callAdminFn({ action: "delete", user_id: deleting.id });
                  toast.success("Usuário removido");
                  setDeleting(null);
                  load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao remover");
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  const cfg =
    role === "admin"
      ? { label: "Admin", cls: "bg-primary text-primary-foreground", icon: ShieldCheck }
      : role === "operador"
        ? { label: "Operador", cls: "bg-success/15 text-success", icon: ShieldAlert }
        : { label: "Síndico", cls: "bg-muted text-foreground", icon: User };
  const Icon = cfg.icon;
  return (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("operador");
  const [condominioIds, setCondominioIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data: condominios } = useCondominios();

  useEffect(() => {
    if (open) {
      setEmail("");
      setNome("");
      setPassword("");
      setRole("operador");
      setCondominioIds([]);
    }
  }, [open]);

  const submit = async () => {
    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (role === "sindico" && condominioIds.length === 0) {
      toast.error("Síndico deve ter pelo menos 1 condomínio vinculado");
      return;
    }
    setBusy(true);
    try {
      await callAdminFn({
        action: "create",
        email: email.trim(),
        password,
        nome_completo: nome.trim() || email.trim(),
        role,
        condominio_ids: role === "sindico" ? condominioIds : [],
      });
      toast.success("Usuário criado");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar usuário");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>Cadastre um usuário e atribua o perfil de acesso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div>
            <Label>Senha provisória</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <Label>Perfil de acesso</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="sindico">Síndico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "sindico" && (
            <div>
              <Label>
                Condomínios vinculados <span className="text-destructive">*</span>
              </Label>
              <CondominiosMultiSelect
                condominios={condominios ?? []}
                value={condominioIds}
                onChange={setCondominioIds}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Síndico só poderá ver dados dos condomínios selecionados.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Criando..." : "Criar usuário"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<AppRole>("operador");
  const [password, setPassword] = useState("");
  const [condominioIds, setCondominioIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data: condominios } = useCondominios();

  useEffect(() => {
    if (user) {
      setNome(user.nome_completo);
      setRole((user.roles[0] as AppRole) ?? "operador");
      setPassword("");
      setCondominioIds(user.condominios ?? []);
    }
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (role === "sindico" && condominioIds.length === 0) {
      toast.error("Síndico deve ter pelo menos 1 condomínio vinculado");
      return;
    }
    setBusy(true);
    try {
      await callAdminFn({
        action: "update",
        user_id: user.id,
        nome_completo: nome,
        role,
        password: password || undefined,
        condominio_ids: role === "sindico" ? condominioIds : [],
      });
      toast.success("Usuário atualizado");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome completo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Perfil de acesso</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="sindico">Síndico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "sindico" && (
            <div>
              <Label>
                Condomínios vinculados <span className="text-destructive">*</span>
              </Label>
              <CondominiosMultiSelect
                condominios={condominios ?? []}
                value={condominioIds}
                onChange={setCondominioIds}
              />
            </div>
          )}
          <div>
            <Label>Nova senha (opcional)</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Deixe em branco para manter" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CondominiosMultiSelect({
  condominios,
  value,
  onChange,
}: {
  condominios: { id: string; nome: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };
  if (!condominios.length) {
    return (
      <p className="text-xs text-muted-foreground p-3 border border-border rounded-md">
        Nenhum condomínio cadastrado.
      </p>
    );
  }
  return (
    <div className="border border-border rounded-md max-h-48 overflow-y-auto divide-y divide-border">
      {condominios.map((c) => {
        const checked = value.includes(c.id);
        return (
          <label
            key={c.id}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer"
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={checked}
              onChange={() => toggle(c.id)}
            />
            <span className="flex-1">{c.nome}</span>
          </label>
        );
      })}
      <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30">
        {value.length} selecionado(s)
      </div>
    </div>
  );
}