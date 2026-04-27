import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader, EmptyState } from "@/components/PageHeader";

function MudancasLayout() {
  const location = useLocation();

  return (
    <RequireAuth>
      {location.pathname === "/mudancas" ? (
        <div className="pb-24">
          <PageHeader title="Mudanças" description="Em construção." />
          <EmptyState title="Em breve" description="Esta seção será implementada na próxima etapa." />
        </div>
      ) : (
        <Outlet />
      )}
    </RequireAuth>
  );
}

export const Route = createFileRoute("/mudancas")({
  component: MudancasLayout,
});
