import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { MoradoresManager } from "@/components/MoradoresManager";
import { OcorrenciasPanel } from "@/components/OcorrenciasPanel";

export const Route = createFileRoute("/condominios/$id")({
  component: CondoDetailPage,
});

function CondoDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["condominio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="pb-24 max-w-3xl">
      <button
        onClick={() => navigate({ to: "/condominios" })}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : !data ? (
        <EmptyState title="Condomínio não encontrado" description="Este condomínio não existe ou foi removido." />
      ) : (
        <>
          <PageHeader title={data.nome} description={data.cnpj ? `CNPJ: ${data.cnpj}` : undefined} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ContactCard role="Síndico" name={data.sindico_nome} phone={data.sindico_telefone} />
            <ContactCard role="Subsíndico" name={data.subsindico_nome} phone={data.subsindico_telefone} />
            <ContactCard role="Zelador" name={data.zelador_nome} phone={data.zelador_telefone} />
            <ContactCard role="Limpeza" name={data.limpeza_nome} phone={data.limpeza_telefone} />
          </div>

          <div className="mt-8">
            <MoradoresManager condominioId={data.id} />
          </div>

          <div className="mt-8">
            <OcorrenciasPanel condominioId={data.id} />
          </div>
        </>
      )}
    </div>
  );
}

function ContactCard({
  role,
  name,
  phone,
}: {
  role: string;
  name?: string | null;
  phone?: string | null;
}) {
  return (
    <div
      className="bg-card rounded-xl border border-border p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{role}</div>
          <div className="font-semibold text-foreground inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            {name || "—"}
          </div>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="text-sm text-primary inline-flex items-center gap-1.5 mt-1 hover:underline"
            >
              <Phone className="h-3.5 w-3.5" /> {phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
