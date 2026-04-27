import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import {
  CondominioForm,
  condominioFormToPayload,
  condominioRowToForm,
  type CondominioFormValues,
} from "@/components/CondominioForm";

export const Route = createFileRoute("/condominios/$id/editar")({
  component: EditarCondominioPage,
});

function EditarCondominioPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Acesso restrito a administradores");
      navigate({ to: "/condominios" });
    }
  }, [authLoading, isAdmin, navigate]);

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

  if (authLoading || !isAdmin || isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pb-24 max-w-2xl">
        <EmptyState title="Condomínio não encontrado" description="Este condomínio não existe ou foi removido." />
      </div>
    );
  }

  const initialValues = condominioRowToForm(data as Partial<Record<keyof CondominioFormValues, string | null>>);

  const handleSubmit = async (form: CondominioFormValues) => {
    setSaving(true);
    const payload = condominioFormToPayload(form);
    const { error } = await supabase
      .from("condominios")
      .update(payload as never)
      .eq("id", id);
    setSaving(false);
    if (error) {
      console.log(error);
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Condomínio atualizado");
    qc.invalidateQueries({ queryKey: ["condominios"] });
    qc.invalidateQueries({ queryKey: ["condominio", id] });
    navigate({ to: "/condominios/$id", params: { id } });
  };

  return (
    <div className="pb-24 max-w-2xl">
      <button
        onClick={() => navigate({ to: "/condominios/$id", params: { id } })}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <PageHeader
        title={`Editar ${data.nome}`}
        description="Atualize os dados do condomínio."
      />

      <CondominioForm
        initialValues={initialValues}
        saving={saving}
        submitLabel="Salvar alterações"
        onCancel={() => navigate({ to: "/condominios/$id", params: { id } })}
        onSubmit={handleSubmit}
      />
    </div>
  );
}