import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { MoradoresManager } from "@/components/MoradoresManager";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function MoradoresPage() {
  const [condominioId, setCondominioId] = useState<string>("");

  const { data: condominios, isLoading } = useQuery({
    queryKey: ["condominios", "lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!condominioId && condominios && condominios.length > 0) {
      setCondominioId(condominios[0].id);
    }
  }, [condominios, condominioId]);

  return (
    <div className="pb-24">
      <PageHeader
        title="Moradores"
        description="Cadastre e gerencie os moradores de cada condomínio."
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando condomínios...</div>
      ) : !condominios?.length ? (
        <EmptyState
          title="Nenhum condomínio cadastrado"
          description="Cadastre um condomínio primeiro para gerenciar moradores."
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-4 max-w-md">
            <Label className="text-xs text-muted-foreground">Condomínio</Label>
            <Select value={condominioId} onValueChange={setCondominioId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione um condomínio" />
              </SelectTrigger>
              <SelectContent>
                {condominios.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {condominioId && <MoradoresManager condominioId={condominioId} />}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/moradores")({
  component: () => (
    <RequireAuth>
      <MoradoresPage />
    </RequireAuth>
  ),
});
