import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCondominios } from "@/lib/queries";
import { Plus, Building2, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/condominios/")({
  component: CondosPage,
});

function CondosPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useCondominios();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (c) =>
        c.nome?.toLowerCase().includes(term) ||
        (c.cnpj ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <div className="pb-24">
      <PageHeader
        title="Condomínios"
        description="Cadastro completo de condomínios."
        action={
          isAdmin ? (
            <Button onClick={() => navigate({ to: "/condominios/novo" })}>
              <Plus className="h-4 w-4 mr-1" />
              Novo condomínio
            </Button>
          ) : null
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou CNPJ..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !data?.length ? (
        <EmptyState
          title="Nenhum condomínio cadastrado"
          description="Cadastre o primeiro condomínio para começar."
        />
      ) : !filtered.length ? (
        <EmptyState
          title="Nenhum resultado"
          description={`Nada encontrado para "${q}".`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate({ to: "/condominios/$id", params: { id: c.id } })}
              className="text-left bg-card rounded-xl border border-border p-4 hover:border-primary/40 hover:shadow-md transition-all"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{c.nome}</div>
                  {c.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {c.cnpj}</p>}
                  {c.sindico_nome && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Síndico: {c.sindico_nome}
                      {c.sindico_telefone ? ` · ${c.sindico_telefone}` : ""}
                    </p>
                  )}
                  {c.zelador_nome && (
                    <p className="text-xs text-muted-foreground">
                      Zelador: {c.zelador_nome}
                      {c.zelador_telefone ? ` · ${c.zelador_telefone}` : ""}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}