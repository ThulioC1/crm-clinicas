import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth";
import { usersRepo } from "@/services/db";
import { useLive } from "@/hooks/use-tenant-data";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Plan, UserProfile } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel Admin — Cuidar+" },
      { name: "description", content: "Gestão global de profissionais e planos." },
      { property: "og:title", content: "Painel Admin — Cuidar+" },
      { property: "og:description", content: "Gestão global de profissionais e planos." },
    ],
  }),
  component: () => (
    <RequireRole role="super_admin">
      <AppShell nav={[{ to: "/admin", label: "Visão geral", icon: LayoutDashboard }]}>
        <AdminPage />
      </AppShell>
    </RequireRole>
  ),
});

function AdminPage() {
  const { user } = useAuth();
  const me = user as UserProfile;
  const { data } = useLive(usersRepo, () => usersRepo.listAll(me), [me.id]);
  const pros = data.filter((u) => u.role === "professional");

  const update = async (id: string, patch: Partial<Pick<UserProfile, "status" | "plan">>) => {
    try { await usersRepo.update(me, id, patch); toast.success("Profissional atualizado"); }
    catch (e) { toast.error((e as Error).message); }
  };

  const stats = [
    { label: "Profissionais", value: pros.length },
    { label: "Ativos", value: pros.filter((p) => p.status === "active").length },
    { label: "Bloqueados", value: pros.filter((p) => p.status === "blocked").length },
    { label: "Assinantes pagos", value: pros.filter((p) => p.plan !== "free").length },
  ];

  return (
    <>
      <PageHeader title="Visão geral da plataforma" subtitle="Status: todos os serviços operacionais" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Profissional</TableHead><TableHead>Especialidade</TableHead><TableHead>Plano</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ativo</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {pros.map((p) => (
              <TableRow key={p.id}>
                <TableCell><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.email}</p></TableCell>
                <TableCell>{p.specialty}</TableCell>
                <TableCell>
                  <Select value={p.plan} onValueChange={(v) => update(p.id, { plan: v as Plan })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="clinic">Clínica</SelectItem></SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Badge variant={p.status === "active" ? "secondary" : "destructive"}>{p.status === "active" ? "Ativo" : "Bloqueado"}</Badge></TableCell>
                <TableCell className="text-right"><Switch checked={p.status === "active"} onCheckedChange={(c) => update(p.id, { status: c ? "active" : "blocked" })} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
