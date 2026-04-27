import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { MudancasManager } from "@/components/MudancasManager";

function MudancasLayout() {
  const location = useLocation();

  return (
    <RequireAuth>
      {location.pathname === "/mudancas" ? (
        <div className="pb-24">
          <PageHeader
            title="Mudanças"
            description="Controle de entrada e saída de moradores."
          />
          <MudancasManager />
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
