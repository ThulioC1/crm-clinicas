import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePatients, useRecords, useAppointments, useTenantId } from "@/hooks/use-tenant";
import { patientsRepo } from "@/services/db";
import { patientSchema } from "@/lib/schemas";
import type { Patient } from "@/lib/types";

export const Route = createFileRoute("/dashboard/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Cuidar+" },
      { name: "description", content: "Seus pacientes e clientes." },
      { property: "og:title", content: "Clientes — Cuidar+" },
      { property: "og:description", content: "Seus pacientes e clientes." },
    ],
  }),
  component: Clients,
});

const PAGE = 6;
const empty = { name: "", email: "", phone: "", birthDate: "", notes: "" };

function Clients() {
  const tenantId = useTenantId();
  const { data } = usePatients();
  const { data: records } = useRecords();
  const { data: appts } = useAppointments();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState<Patient | null>(null);

  const filtered = useMemo(
    () => data.filter((p) => `${p.name} ${p.email} ${p.phone}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)),
    [data, q],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = patientSchema.safeParse(form);
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? 'Dados inválidos'); return; }
    await patientsRepo.create(tenantId, { ...r.data, notes: r.data.notes ?? "" });
    toast.success("Paciente cadastrado");
    setForm(empty);
    setOpen(false);
  };

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${data.length} cadastrados`} action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo cliente</Button>} />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, e-mail ou telefone" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead className="hidden md:table-cell">E-mail</TableHead><TableHead className="hidden md:table-cell">Nascimento</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell className="hidden md:table-cell">{p.email}</TableCell>
                <TableCell className="hidden md:table-cell">{p.birthDate.split("-").reverse().join("/")}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        <span className="text-muted-foreground">Página {page + 1} de {pages}</span>
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
        <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Próxima</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>Nome completo</Label><Input value={form.name} onChange={set("name")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Telefone</Label><Input value={form.phone} onChange={set("phone")} /></div>
              <div className="space-y-1"><Label>Nascimento</Label><Input type="date" value={form.birthDate} onChange={set("birthDate")} /></div>
            </div>
            <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={form.email} onChange={set("email")} /></div>
            <div className="space-y-1"><Label>Observações</Label><Textarea value={form.notes} onChange={set("notes")} /></div>
            <Button className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader><SheetTitle>{selected.name}</SheetTitle></SheetHeader>
              <div className="space-y-2 px-4 text-sm">
                <p><span className="text-muted-foreground">Telefone:</span> {selected.phone}</p>
                <p><span className="text-muted-foreground">E-mail:</span> {selected.email || "—"}</p>
                <p><span className="text-muted-foreground">Nascimento:</span> {selected.birthDate.split("-").reverse().join("/")}</p>
                {selected.notes && <p><span className="text-muted-foreground">Observações:</span> {selected.notes}</p>}
                <h3 className="pt-4 font-semibold">Consultas</h3>
                {appts.filter((a) => a.patientId === selected.id).map((a) => (
                  <p key={a.id} className="text-muted-foreground">{a.date.split("-").reverse().join("/")} {a.time} — {a.type}</p>
                ))}
                <h3 className="pt-4 font-semibold">Evoluções</h3>
                {records.filter((r) => r.patientId === selected.id).map((r) => (
                  <div key={r.id} className="rounded-lg border p-3"><p className="font-medium">{r.title}</p><p className="mt-1 text-muted-foreground">{r.content}</p></div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
