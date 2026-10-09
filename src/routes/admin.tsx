import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth";
import { usersRepo } from "@/services/db";
import { useLive } from "@/hooks/use-tenant-data";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { professionalSchema, type ProfessionalInput } from "@/lib/schemas";
import type { Plan, UserProfile } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel Admin — SaudePro" },
      { name: "description", content: "Gestão global de profissionais e planos." },
      { property: "og:title", content: "Painel Admin — SaudePro" },
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
  const [openCreate, setOpenCreate] = useState(false);

  const form = useForm<ProfessionalInput>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { plan: "pro" },
  });

  const update = async (id: string, patch: Partial<Pick<UserProfile, "status" | "plan">>) => {
    try {
      await usersRepo.update(me, id, patch);
      toast.success("Profissional atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onSubmit = async (values: ProfessionalInput) => {
    try {
      const newId = await usersRepo.create(me, {
        name: values.name,
        email: values.email,
        role: "professional",
        tenantId: crypto.randomUUID(),
        specialty: values.specialty,
        status: "active",
        plan: values.plan,
      });
      toast.success("Profissional cadastrado com sucesso");
      setOpenCreate(false);
      form.reset({ plan: "pro" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const stats = [
    { label: "Profissionais", value: pros.length },
    { label: "Ativos", value: pros.filter((p) => p.status === "active").length },
    { label: "Bloqueados", value: pros.filter((p) => p.status === "blocked").length },
    { label: "Plano Pro", value: pros.filter((p) => p.plan === "pro").length },
    { label: "Plano Clínica", value: pros.filter((p) => p.plan === "clinic").length },
  ];

  return (
    <>
      <PageHeader
        title="Visão geral da plataforma"
        subtitle="Status: todos os serviços operacionais"
        action={
          <Button onClick={() => setOpenCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Profissional
          </Button>
        }
      />
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Cadastrar novo profissional</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }: { field: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; value: string; onBlur: () => void; ref: (el: HTMLInputElement | null) => void } }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Dra. Marina Lopes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }: { field: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; value: string; onBlur: () => void; ref: (el: HTMLInputElement | null) => void } }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="marina@saude.app" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialty"
                render={({ field }: { field: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; value: string; onBlur: () => void; ref: (el: HTMLInputElement | null) => void } }) => (
                  <FormItem>
                    <FormLabel>Especialidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Nutricionista" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plan"
                render={({ field }: { field: { onChange: (value: string) => void; value: string } }) => (
                  <FormItem>
                    <FormLabel>Plano</FormLabel>
                    <Select
                      onValueChange={(value: string) => field.onChange(value)}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="clinic">Clínica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
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
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pros.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </TableCell>
                <TableCell>{p.specialty}</TableCell>
                <TableCell>
                  <Select value={p.plan} onValueChange={(v) => update(p.id, { plan: v as Plan })}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="clinic">Clínica</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "secondary" : "destructive"}>
                    {p.status === "active" ? "Ativo" : "Bloqueado"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Switch
                    checked={p.status === "active"}
                    onCheckedChange={(c) => update(p.id, { status: c ? "active" : "blocked" })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
