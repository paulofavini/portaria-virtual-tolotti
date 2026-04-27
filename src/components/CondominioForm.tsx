import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UF_LIST, maskCep, fetchViaCep } from "@/lib/address";

export type CondominioFormValues = {
  nome: string;
  cnpj: string;
  sindico_nome: string;
  sindico_telefone: string;
  subsindico_nome: string;
  subsindico_telefone: string;
  zelador_nome: string;
  zelador_telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export const emptyCondominioForm: CondominioFormValues = {
  nome: "",
  cnpj: "",
  sindico_nome: "",
  sindico_telefone: "",
  subsindico_nome: "",
  subsindico_telefone: "",
  zelador_nome: "",
  zelador_telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export function condominioRowToForm(
  row: Partial<Record<keyof CondominioFormValues, string | null>> | null | undefined,
): CondominioFormValues {
  if (!row) return emptyCondominioForm;
  const out = { ...emptyCondominioForm };
  (Object.keys(emptyCondominioForm) as (keyof CondominioFormValues)[]).forEach((k) => {
    out[k] = (row[k] ?? "") as string;
  });
  return out;
}

export function condominioFormToPayload(form: CondominioFormValues) {
  const payload = Object.fromEntries(
    Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]),
  ) as Record<keyof CondominioFormValues, string | null>;
  payload.nome = form.nome.trim();
  return payload;
}

type Props = {
  initialValues?: CondominioFormValues;
  saving?: boolean;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (values: CondominioFormValues) => void | Promise<void>;
};

export function CondominioForm({
  initialValues,
  saving = false,
  submitLabel = "Salvar condomínio",
  onCancel,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CondominioFormValues>(
    initialValues ?? emptyCondominioForm,
  );
  const [cepLoading, setCepLoading] = useState(false);

  const update = (k: keyof CondominioFormValues, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const lookupCep = async (cep: string) => {
    setCepLoading(true);
    const data = await fetchViaCep(cep);
    setCepLoading(false);
    if (!data) {
      toast.error("CEP não encontrado");
      return;
    }
    // Não sobrescrever se o usuário já digitou algo
    setForm((f) => ({
      ...f,
      logradouro: f.logradouro?.trim() ? f.logradouro : data.logradouro || "",
      bairro: f.bairro?.trim() ? f.bairro : data.bairro || "",
      cidade: f.cidade?.trim() ? f.cidade : data.localidade || "",
      estado: f.estado?.trim() ? f.estado : data.uf || "",
    }));
  };

  const handleCepChange = (raw: string) => {
    const masked = maskCep(raw);
    update("cep", masked);
    if (masked.replace(/\D/g, "").length === 8) {
      void lookupCep(masked);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("Informe o nome do condomínio");
      return;
    }
    void onSubmit(form);
  };

  return (
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
          <Field id="sindico_nome" label="Nome" value={form.sindico_nome} onChange={(v) => update("sindico_nome", v)} />
          <Field id="sindico_telefone" label="Telefone" value={form.sindico_telefone} onChange={(v) => update("sindico_telefone", v)} type="tel" />
        </div>
      </Section>

      <Section title="Subsíndico">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field id="subsindico_nome" label="Nome" value={form.subsindico_nome} onChange={(v) => update("subsindico_nome", v)} />
          <Field id="subsindico_telefone" label="Telefone" value={form.subsindico_telefone} onChange={(v) => update("subsindico_telefone", v)} type="tel" />
        </div>
      </Section>

      <Section title="Zelador">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field id="zelador_nome" label="Nome" value={form.zelador_nome} onChange={(v) => update("zelador_nome", v)} />
          <Field id="zelador_telefone" label="Telefone" value={form.zelador_telefone} onChange={(v) => update("zelador_telefone", v)} type="tel" />
        </div>
      </Section>

      <Section title="Endereço">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cep">
              CEP {cepLoading && <span className="text-xs text-muted-foreground">(buscando...)</span>}
            </Label>
            <Input
              id="cep"
              value={form.cep}
              onChange={(e) => handleCepChange(e.target.value)}
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="logradouro">Rua</Label>
            <Input id="logradouro" value={form.logradouro} onChange={(e) => update("logradouro", e.target.value)} placeholder="Rua / Avenida" />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" value={form.numero} onChange={(e) => update("numero", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" value={form.bairro} onChange={(e) => update("bairro", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" value={form.cidade} onChange={(e) => update("cidade", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="estado">UF</Label>
            <Select value={form.estado} onValueChange={(v) => update("estado", v)}>
              <SelectTrigger id="estado">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {UF_LIST.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
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