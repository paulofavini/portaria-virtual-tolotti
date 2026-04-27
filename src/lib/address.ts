export const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export type UF = (typeof UF_LIST)[number];

export const maskCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

export type ViaCepResult = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function fetchViaCep(cep: string): Promise<ViaCepResult | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResult;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

export function formatEndereco(c: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}): string {
  const parts: string[] = [];
  const rua = [c.logradouro, c.numero].filter(Boolean).join(", ");
  if (rua) parts.push(rua);
  if (c.bairro) parts.push(c.bairro);
  const cidadeUf = [c.cidade, c.estado].filter(Boolean).join(" - ");
  if (cidadeUf) parts.push(cidadeUf);
  if (c.cep) parts.push(`CEP ${c.cep}`);
  return parts.join(" · ");
}