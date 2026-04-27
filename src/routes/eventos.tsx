import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { PageHeader } from "@/components/PageHeader";
import { EventosManager } from "@/components/EventosManager";

function EventosLayout() {
  const location = useLocation();
  return (
    <RequireAuth>
      {location.pathname === "/eventos" ? <EventosPage /> : <Outlet />}
    </RequireAuth>
  );
}

export const Route = createFileRoute("/eventos")({
  component: EventosLayout,
});

function EventosPage() {
  return (
    <div className="pb-24">
      <PageHeader
        title="Eventos"
        description="Reservas de áreas comuns, festas e cerimônias com lista de convidados."
      />
      <EventosManager />
    </div>
  );
}
