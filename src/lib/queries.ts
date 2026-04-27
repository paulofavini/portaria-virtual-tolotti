import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCondominios = () =>
  useQuery({
    queryKey: ["condominios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

export const useBlocos = (condominioId?: string) =>
  useQuery({
    queryKey: ["blocos", condominioId],
    enabled: !!condominioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocos")
        .select("*")
        .eq("condominio_id", condominioId!)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

export const useUnidades = (blocoId?: string) =>
  useQuery({
    queryKey: ["unidades", blocoId],
    enabled: !!blocoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("*")
        .eq("bloco_id", blocoId!)
        .order("numero");
      if (error) throw error;
      return data;
    },
  });

export const useMoradores = () =>
  useQuery({
    queryKey: ["moradores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moradores")
        .select("*, unidades(numero, blocos(nome, condominios(nome)))")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

export const useFornecedores = () =>
  useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

export const useAvisos = () =>
  useQuery({
    queryKey: ["avisos"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("avisos")
        .select("*, condominios(nome), unidades(numero, blocos(nome))")
        .eq("ativo", true)
        .or(`data_expiracao.is.null,data_expiracao.gt.${nowIso}`)
        .order("fixado", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useEventos = () =>
  useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*, condominios(nome), unidades(numero, blocos(nome)), moradores(nome)")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useMudancas = () =>
  useQuery({
    queryKey: ["mudancas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mudancas")
        .select("*, condominios(nome), unidades(numero, blocos(nome)), moradores(nome)")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useOcorrencias = () =>
  useQuery({
    queryKey: ["ocorrencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select(
          "id, tipo, descricao, nome_pessoa, documento, status, data_hora, imagem_url, condominio_id, unidade_id, morador_id, condominios(nome), unidades(numero, blocos(nome)), moradores(nome)",
        )
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useOcorrenciasByCondo = (condominioId?: string) =>
  useQuery({
    queryKey: ["ocorrencias", "condo", condominioId],
    enabled: !!condominioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ocorrencias")
        .select(
          "id, tipo, descricao, nome_pessoa, documento, status, data_hora, imagem_url, unidade_id, morador_id, unidades(numero, blocos(nome)), moradores(nome)",
        )
        .eq("condominio_id", condominioId!)
        .order("data_hora", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

export const useChamados = () =>
  useQuery({
    queryKey: ["chamados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados_tecnicos")
        .select("*, condominios(nome)")
        .order("data_abertura", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const isToday = (iso: string | null | undefined) => {
  if (!iso) return false;
  const d = parseLocalDate(iso);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
};

export const isYesterday = (iso: string | null | undefined) => {
  if (!iso) return false;
  const d = parseLocalDate(iso);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return (
    d.getFullYear() === y.getFullYear() &&
    d.getMonth() === y.getMonth() &&
    d.getDate() === y.getDate()
  );
};

export const isFuture = (iso: string | null | undefined) => {
  if (!iso) return false;
  const d = parseLocalDate(iso);
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dStart > today.getTime();
};

/**
 * Parse a date value from Supabase safely in the user's local timezone.
 * - Plain "YYYY-MM-DD" (date columns) is parsed as local midnight
 *   to avoid the UTC-shift bug that made events/mudanças appear on the wrong day.
 * - Full ISO timestamps with time/zone info are parsed normally.
 */
function parseLocalDate(value: string): Date {
  // Detect plain date (no time component): YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) {
    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  return new Date(value);
}