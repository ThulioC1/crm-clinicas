import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const allowed = user && user.role === role && user.status === "active";

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login", replace: true });
    else if (!allowed)
      navigate({ to: user.role === "super_admin" ? "/admin" : "/dashboard", replace: true });
  }, [loading, user, allowed, navigate]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Verificando acesso…
      </div>
    );
  }
  return <>{children}</>;
}
