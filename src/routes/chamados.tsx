import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { ChamadosManager } from "@/components/ChamadosManager";

function ChamadosLayout() {
  const location = useLocation();

  return (
    <RequireAuth>
      {location.pathname === "/chamados" ? (
        <div className="pb-24">
          <PageHeader
            title="Chamados técnicos"
            description="Manutenção, TI e terceiros — controle completo dos chamados."
          />
          <ChamadosManager />
        </div>
      ) : (
        <Outlet />
      )}
    </RequireAuth>
  );
}

export const Route = createFileRoute("/chamados")({
  component: ChamadosLayout,
});
