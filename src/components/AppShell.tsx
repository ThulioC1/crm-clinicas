import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LogOut, Stethoscope, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Senha provisória ainda não trocada: bloqueia o app até a troca
  useEffect(() => {
    if (user?.mustChangePassword) navigate({ to: "/trocar-senha", replace: true });
  }, [user?.mustChangePassword, navigate]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold text-sidebar-accent-foreground">
            SaudePro
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact ?? false }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
              }}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
            {user?.name}
          </p>
          <p className="truncate text-xs opacity-70">{user?.specialty ?? "Super Admin"}</p>
          <button
            onClick={async () => {
              await logout();
              navigate({ to: "/login", replace: true });
            }}
            className="mt-3 flex items-center gap-2 text-xs opacity-80 hover:opacity-100"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <span className="font-display font-semibold">SaudePro</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await logout();
              navigate({ to: "/login" });
            }}
          >
            Sair
          </Button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-2 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact ?? false }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm"
              activeProps={{ className: "bg-secondary font-semibold" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {!isFirebaseConfigured && (
          <div className="bg-accent px-6 py-2 text-xs text-accent-foreground">
            Modo demonstração — dados mockados. Configure as variáveis do Firebase para usar dados
            reais.
          </div>
        )}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
