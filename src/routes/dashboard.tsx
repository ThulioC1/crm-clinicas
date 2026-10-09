import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth";
import { hasModule } from "@/lib/specialties";

function DashboardLayout() {
  const { user } = useAuth();

  // O menu muda conforme a especialidade: cada profissão vê só as ferramentas dela.
  const nav: NavItem[] = [
    { to: "/dashboard", label: "Início", icon: LayoutDashboard, exact: true },
    { to: "/dashboard/clientes", label: "Clientes", icon: Users },
    { to: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  ];
  if (hasModule(user?.specialty, "avaliacao_nutricional") || hasModule(user?.specialty, "eav")) {
    nav.push({ to: "/dashboard/avaliacao", label: "Avaliação", icon: Stethoscope });
  }
  nav.push(
    { to: "/dashboard/prontuarios", label: "Prontuários", icon: FileText },
    { to: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  );

  return (
    <RequireRole role="professional">
      <AppShell nav={nav}>
        <Outlet />
      </AppShell>
    </RequireRole>
  );
}

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardLayout,
});
