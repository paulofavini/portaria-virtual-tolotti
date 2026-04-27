import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/condominios/novo")({
  component: NovoCondominioPage,
});

function NovoCondominioPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    sindico_nome: "",
    sindico_telefone: "",
    subsindico_nome: "",
    subsindico_telefone: "",
    zelador_nome: "",
    zelador_telefone: "",
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Acesso restrito a administradores");
      navigate({ to: "/condominios" });
    }
  }, [authLoading, isAdmin, navigate]);

  if (authLoading || !isAdmin) {
    return (
      <div className="py-12 flex justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome do condomínio");
      return;
    }
    setSaving(true);
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]),
    ) as typeof form;
    payload.nome = form.nome.trim();

    const { error } = await supabase.from("condominios").insert(payload);
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Condomínio cadastrado");
    qc.invalidateQueries({ queryKey: ["condominios"] });
    navigate({ to: "/condominios" });
  };

  return (
    <div className="pb-24 max-w-2xl">
      <button
        onClick={() => navigate({ to: "/condominios" })}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <PageHeader
        title="Novo condomínio"
        description="Preencha os dados principais do condomínio."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl p-5 space-y-5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nome">Nome do condomínio *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => update("nome", e.target.value)}
              placeholder="Ex.: Residencial Tolotti"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={form.cnpj}
              onChange={(e) => update("cnpj", e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>
        </div>

        <Section title="Síndico">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              id="sindico_nome"
              label="Nome"
              value={form.sindico_nome}
              onChange={(v) => update("sindico_nome", v)}
            />
            <Field
              id="sindico_telefone"
              label="Telefone"
              value={form.sindico_telefone}
              onChange={(v) => update("sindico_telefone", v)}
              type="tel"
            />
          </div>
        </Section>

        <Section title="Subsíndico">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              id="subsindico_nome"
              label="Nome"
              value={form.subsindico_nome}
              onChange={(v) => update("subsindico_nome", v)}
            />
            <Field
              id="subsindico_telefone"
              label="Telefone"
              value={form.subsindico_telefone}
              onChange={(v) => update("subsindico_telefone", v)}
              type="tel"
            />
          </div>
        </Section>

        <Section title="Zelador">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              id="zelador_nome"
              label="Nome"
              value={form.zelador_nome}
              onChange={(v) => update("zelador_nome", v)}
            />
            <Field
              id="zelador_telefone"
              label="Telefone"
              value={form.zelador_telefone}
              onChange={(v) => update("zelador_telefone", v)}
              type="tel"
            />
          </div>
        </Section>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/condominios" })}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar condomínio"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}