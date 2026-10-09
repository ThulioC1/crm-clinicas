import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Mail, Plus, UserPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth";
import { usersRepo } from "@/services/db";
import { useLive } from "@/hooks/use-tenant-data";
import { sendPasswordResetEmail, getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { createAuthAccount } from "@/lib/auth";
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

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await usersRepo.remove(me, id);
      toast.success("Profissional excluído");
      setDeleteId(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onSubmit = async (values: ProfessionalInput) => {
    try {
      // 1. Cria a conta no Firebase Auth (senha aleatória) para o e-mail de reset funcionar
      await createAuthAccount(values.email);

      // 2. Cadastra o perfil no Firestore
      await usersRepo.create(me, {
        name: values.name,
        email: values.email,
        role: "professional",
        tenantId: crypto.randomUUID(),
        specialty: values.specialty,
        status: "active",
        plan: values.plan,
        mustChangePassword: true,
      });

      // 3. Envia o e-mail para o profissional redefinir a senha
      await sendPasswordResetEmail(getAuth(app!), values.email);

      setOpenCreate(false);
      form.reset({ plan: "pro" });
      toast.success(`Profissional cadastrado! E-mail de redefinição enviado para ${values.email}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resendReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(getAuth(app!), email);
      toast.success(`E-mail de redefinição enviado para ${email}`);
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
                render={({
                  field,
                }: {
                  field: {
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
                    value: string;
                    onBlur: () => void;
                    ref: (el: HTMLInputElement | null) => void;
                  };
                }) => (
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
                render={({
                  field,
                }: {
                  field: {
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
                    value: string;
                    onBlur: () => void;
                    ref: (el: HTMLInputElement | null) => void;
                  };
                }) => (
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
                render={({
                  field,
                }: {
                  field: {
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
                    value: string;
                    onBlur: () => void;
                    ref: (el: HTMLInputElement | null) => void;
                  };
                }) => (
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
                render={({
                  field,
                }: {
                  field: { onChange: (value: string) => void; value: string };
                }) => (
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
              <TableHead className="text-right">Ações</TableHead>
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
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={`Enviar redefinição de senha para ${p.email}`}
                      onClick={() => resendReset(p.email)}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      title="Excluir profissional"
                      onClick={() => setDeleteId(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir profissional</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-muted-foreground">
            Tem certeza? Esta ação não pode ser desfeita.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteId!)}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
