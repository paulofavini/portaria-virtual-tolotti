import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { AvisosManager } from "@/components/AvisosManager";

function AvisosLayout() {
  const location = useLocation();
  return (
    <RequireAuth>
      {location.pathname === "/avisos" ? <AvisosPage /> : <Outlet />}
    </RequireAuth>
  );
}

export const Route = createFileRoute("/avisos")({
  component: AvisosLayout,
});

function AvisosPage() {
  return (
    <div className="pb-24">
      <PageHeader
        title="Avisos"
        description="Comunicados, urgências e manutenções dos condomínios."
      />
      <AvisosManager />
    </div>
  );
}
