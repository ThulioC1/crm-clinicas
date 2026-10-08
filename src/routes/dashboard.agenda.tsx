import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { addDays, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointments, usePatients, useTenantId } from "@/hooks/use-tenant";
import { appointmentsRepo } from "@/services/db";
import { appointmentSchema } from "@/lib/schemas";

export const Route = createFileRoute("/dashboard/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Cuidar+" },
      { name: "description", content: "Calendário semanal de atendimentos." },
      { property: "og:title", content: "Agenda — Cuidar+" },
      { property: "og:description", content: "Calendário semanal de atendimentos." },
    ],
  }),
  component: Agenda,
});

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);

function Agenda() {
  const tenantId = useTenantId();
  const { data: appts } = useAppointments();
  const { data: patients } = usePatients();
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [form, setForm] = useState<{ patientId: string; date: string; time: string; duration: string; type: string } | null>(null);
  const days = Array.from({ length: 6 }, (_, i) => addDays(week, i));
  const name = (id: string) => patients.find((p) => p.id === id)?.name ?? "—";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = appointmentSchema.safeParse(form);
    if (!r.success) return toast.error(r.error.issues[0].message);
    if (appts.some((a) => a.date === r.data.date && a.time === r.data.time)) return toast.error("Horário já ocupado");
    await appointmentsRepo.create(tenantId, r.data);
    toast.success("Consulta agendada");
    setForm(null);
  };

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={`${format(week, "d MMM", { locale: ptBR })} – ${format(addDays(week, 5), "d MMM yyyy", { locale: ptBR })}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={() => setWeek(addDays(week, 7))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        }
      />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="grid min-w-[760px] grid-cols-[60px_repeat(6,1fr)]">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="border-b border-l p-3 text-center">
              <p className="text-xs uppercase text-muted-foreground">{format(d, "EEE", { locale: ptBR })}</p>
              <p className="font-display text-lg font-semibold">{format(d, "d")}</p>
            </div>
          ))}
          {HOURS.map((h) => (
            <div key={h} className="contents">
              <div className="border-b p-2 text-right text-xs text-muted-foreground">{h}:00</div>
              {days.map((d) => {
                const date = format(d, "yyyy-MM-dd");
                const items = appts.filter((a) => a.date === date && Number(a.time.slice(0, 2)) === h);
                return (
                  <div
                    key={date + h}
                    className="min-h-16 cursor-pointer space-y-1 border-b border-l p-1 transition-colors hover:bg-muted"
                    onClick={() => setForm({ patientId: "", date, time: `${String(h).padStart(2, "0")}:00`, duration: "45", type: "Consulta" })}
                  >
                    {items.map((a) => (
                      <div key={a.id} onClick={(e) => e.stopPropagation()} className="group relative rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground">
                        <p className="font-semibold">{a.time} · {name(a.patientId).split(" ")[0]}</p>
                        <p className="opacity-80">{a.type}</p>
                        <button
                          aria-label="Cancelar consulta"
                          className="absolute right-1 top-1 hidden group-hover:block"
                          onClick={async () => { await appointmentsRepo.remove(tenantId, a.id); toast.success("Consulta cancelada"); }}
                        ><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar consulta</DialogTitle></DialogHeader>
          {form && (
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1">
                <Label>Paciente</Label>
                <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Horário</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
                <div className="space-y-1"><Label>Minutos</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Tipo</Label><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div>
              <Button className="w-full">Agendar</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
