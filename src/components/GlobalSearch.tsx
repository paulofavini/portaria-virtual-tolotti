import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Building2, Home, User as UserIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatUnidadeBloco } from "@/lib/address";

interface SearchResults {
  condominios: Array<{ id: string; nome: string }>;
  unidades: Array<{
    id: string;
    numero: string;
    blocos: { nome: string; condominios: { id: string; nome: string } | null } | null;
  }>;
  moradores: Array<{
    id: string;
    nome: string;
    telefone: string | null;
    unidades: { id: string; numero: string; blocos: { nome: string; condominios: { id: string; nome: string } | null } | null } | null;
  }>;
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({ condominios: [], unidades: [], moradores: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults({ condominios: [], unidades: [], moradores: [] });
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults({ condominios: [], unidades: [], moradores: [] });
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [c, u, m] = await Promise.all([
          supabase
            .from("condominios")
            .select("id, nome")
            .ilike("nome", `%${term}%`)
            .limit(8),
          supabase
            .from("unidades")
            .select("id, numero, blocos(nome, condominios(id, nome))")
            .ilike("numero", `%${term}%`)
            .limit(8),
          supabase
            .from("moradores")
            .select("id, nome, telefone, unidades(id, numero, blocos(nome, condominios(id, nome)))")
            .or(`nome.ilike.%${term}%,telefone.ilike.%${term}%`)
            .limit(10),
        ]);
        setResults({
          condominios: c.data ?? [],
          unidades: (u.data as SearchResults["unidades"]) ?? [],
          moradores: (m.data as SearchResults["moradores"]) ?? [],
        });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const empty = !loading && results.condominios.length === 0 && results.unidades.length === 0 && results.moradores.length === 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar condomínio, unidade ou morador..."
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando...
          </div>
        )}
        {!loading && q.trim().length < 2 && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Digite pelo menos 2 caracteres.
          </div>
        )}
        {empty && q.trim().length >= 2 && <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>}

        {results.condominios.length > 0 && (
          <CommandGroup heading="Condomínios">
            {results.condominios.map((c) => (
              <CommandItem
                key={c.id}
                value={`cond-${c.id}-${c.nome}`}
                onSelect={() => {
                  onOpenChange(false);
                  navigate({ to: "/condominios" });
                }}
              >
                <Building2 className="h-4 w-4 mr-2 text-primary" />
                <span>{c.nome}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.unidades.length > 0 && (
          <CommandGroup heading="Unidades">
            {results.unidades.map((u) => (
              <CommandItem
                key={u.id}
                value={`uni-${u.id}-${u.numero}`}
                onSelect={() => {
                  onOpenChange(false);
                  navigate({ to: "/condominios" });
                }}
              >
                <Home className="h-4 w-4 mr-2 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Unidade {u.numero}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {u.blocos?.condominios?.nome}
                    {u.blocos?.nome ? ` · Bloco ${u.blocos.nome}` : ""}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.moradores.length > 0 && (
          <CommandGroup heading="Moradores">
            {results.moradores.map((m) => (
              <CommandItem
                key={m.id}
                value={`mor-${m.id}-${m.nome}`}
                onSelect={() => {
                  onOpenChange(false);
                  navigate({ to: "/moradores" });
                }}
              >
                <UserIcon className="h-4 w-4 mr-2 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.telefone ? `${m.telefone} · ` : ""}
                    {m.unidades?.blocos?.condominios?.nome}
                    {m.unidades ? ` · ${formatUnidadeBloco(m.unidades)}` : ""}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="px-3 py-2 border-t text-[10px] text-muted-foreground flex items-center gap-2">
        <Search className="h-3 w-3" /> Busca global · pressione Esc para fechar
      </div>
    </CommandDialog>
  );
}