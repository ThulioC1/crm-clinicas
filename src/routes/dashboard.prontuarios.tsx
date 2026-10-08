import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatients, useRecords, useTenantId } from "@/hooks/use-tenant";
import { recordsRepo } from "@/services/db";
import { recordSchema } from "@/lib/schemas";

export const Route = createFileRoute("/dashboard/prontuarios")({
  head: () => ({
    meta: [
      { title: "Prontuários — Cuidar+" },
      { name: "description", content: "Evoluções e anotações por consulta." },
      { property: "og:title", content: "Prontuários — Cuidar+" },
      { property: "og:description", content: "Evoluções e anotações por consulta." },
    ],
  }),
  component: Records,
});

function Records() {
  const tenantId = useTenantId();
  const { data: records } = useRecords();
  const { data: patients } = usePatients();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: "", date: new Date().toISOString().slice(0, 10), title: "", content: "" });
  const name = (id: string) => patients.find((p) => p.id === id)?.name ?? "—";
  const list = records.filter((r) => filter === "all" || r.patientId === filter).sort((a, b) => b.date.localeCompare(a.date));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = recordSchema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    await recordsRepo.create(tenantId, r.data);
    toast.success("Evolução registrada");
    setOpen(false);
    setForm({ ...form, title: "", content: "" });
  };

  return (
    <>
      <PageHeader title="Prontuários" subtitle="Evoluções por consulta" action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova evolução</Button>} />
      <div className="mb-6 max-w-xs">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pacientes</SelectItem>
            {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ol className="relative space-y-4 border-l-2 border-secondary pl-6">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma evolução registrada.</p>}
        {list.map((r) => (
          <li key={r.id} className="relative rounded-xl border bg-card p-5">
            <span className="absolute -left-[31px] top-6 h-3 w-3 rounded-full bg-primary" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{r.title}</h3>
              <span className="text-xs text-muted-foreground">{r.date.split("-").reverse().join("/")}</span>
            </div>
            <p className="text-sm text-primary">{name(r.patientId)}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{r.content}</p>
          </li>
        ))}
      </ol>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova evolução</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Paciente</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1"><Label>Evolução</Label><Textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <Button className="w-full">Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
