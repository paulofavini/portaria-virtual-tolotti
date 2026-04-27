import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";

function ChamadosLayout() {
  const location = useLocation();

  return (
    <RequireAuth>
      {location.pathname === "/chamados" ? (
        <div className="pb-24">
          <PageHeader title="Chamados técnicos" description="Em construção." />
          <EmptyState title="Em breve" description="Esta seção será implementada na próxima etapa." />
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
