import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, MapPin, Pencil, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { MoradoresManager } from "@/components/MoradoresManager";
import { OcorrenciasPanel } from "@/components/OcorrenciasPanel";
import { InfoOperacionalPanel } from "@/components/InfoOperacionalPanel";
import { formatEndereco } from "@/lib/address";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/condominios/$id/")({
  component: CondoDetailPage,
});

function CondoDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
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
          <PageHeader
            title={data.nome}
            description={data.cnpj ? `CNPJ: ${data.cnpj}` : undefined}
            action={
              isAdmin ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/condominios/$id/editar" params={{ id: data.id }}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Link>
                </Button>
              ) : null
            }
          />
          <Tabs defaultValue="geral" className="mt-2">
            <TabsList>
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="operacional">Informações operacionais</TabsTrigger>
              <TabsTrigger value="moradores">Moradores</TabsTrigger>
              <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="mt-4 space-y-3">
              {formatEndereco(data) && (
                <div
                  className="bg-card rounded-xl border border-border p-4 flex items-start gap-3"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Endereço</div>
                    <div className="text-sm text-foreground">{formatEndereco(data)}</div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ContactCard role="Síndico" name={data.sindico_nome} phone={data.sindico_telefone} />
                <ContactCard role="Subsíndico" name={data.subsindico_nome} phone={data.subsindico_telefone} />
                <ContactCard role="Zelador" name={data.zelador_nome} phone={data.zelador_telefone} />
                <ContactCard role="Limpeza" name={data.limpeza_nome} phone={data.limpeza_telefone} />
              </div>
            </TabsContent>

            <TabsContent value="operacional" className="mt-4">
              <InfoOperacionalPanel condominio={data} />
            </TabsContent>

            <TabsContent value="moradores" className="mt-4">
              <MoradoresManager condominioId={data.id} />
            </TabsContent>

            <TabsContent value="ocorrencias" className="mt-4">
              <OcorrenciasPanel condominioId={data.id} />
            </TabsContent>
          </Tabs>
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
