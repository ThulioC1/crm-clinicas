import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CalendarDays, FileText, LayoutDashboard, Settings, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: () => (
    <RequireRole role="professional">
      <AppShell
        nav={[
          { to: "/dashboard", label: "Início", icon: LayoutDashboard, exact: true },
          { to: "/dashboard/clientes", label: "Clientes", icon: Users },
          { to: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
          { to: "/dashboard/prontuarios", label: "Prontuários", icon: FileText },
          { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
        ]}
      >
        <Outlet />
      </AppShell>
    </RequireRole>
  ),
});
