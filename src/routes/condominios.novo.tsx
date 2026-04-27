import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import {
  CondominioForm,
  condominioFormToPayload,
  type CondominioFormValues,
} from "@/components/CondominioForm";

export const Route = createFileRoute("/condominios/novo")({
  component: NovoCondominioPage,
});

function NovoCondominioPage() {
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

  if (authLoading || !isAdmin) {
    return (
      <div className="py-12 flex justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (form: CondominioFormValues) => {
    setSaving(true);
    const payload = condominioFormToPayload(form);
    const { error } = await supabase
      .from("condominios")
      .insert(payload as never);
    setSaving(false);
    if (error) {
      console.log(error);
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

      <CondominioForm
        saving={saving}
        onCancel={() => navigate({ to: "/condominios" })}
        onSubmit={handleSubmit}
      />
    </div>
  );
}