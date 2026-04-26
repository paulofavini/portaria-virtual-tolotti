import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/condominios")({
  component: () => (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  ),
});