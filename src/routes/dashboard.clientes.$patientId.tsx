import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, FileText, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useAppointments, usePatients, useRecords, useTenantId } from "@/hooks/use-tenant";
import { recordsRepo } from "@/services/db";
import { recordSchema } from "@/lib/schemas";
import { hasModule, resolveSpecialty } from "@/lib/specialties";
import { PatientDocumentActions } from "@/components/documents/patient-document-actions";
import { ageFrom } from "@/lib/calculations/nutrition";
import type { Patient } from "@/lib/types";

export const Route = createFileRoute("/dashboard/clientes/$patientId")({
  head: () => ({
    meta: [
      { title: "Ficha do paciente — SaudePro" },
      { name: "description", content: "Prontuário, evoluções e impressão de documentos." },
    ],
  }),
  component: PatientChart,
});

const br = (iso: string) => iso.split("-").reverse().join("/");

function PatientChart() {
  const { patientId } = Route.useParams();
  const navigate = useNavigate();
  const tenantId = useTenantId();
  const { user } = useAuth();
  const specialty = resolveSpecialty(user?.specialty);
  const { data: patients } = usePatients();
  const { data: records } = useRecords();
  const { data: appts } = useAppointments();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: "",
    content: "",
  });

  const patient = patients.find((p) => p.id === patientId);
  const evolucoes = records
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const consultas = appts
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  if (!patient) {
    return (
      <>
        <PageHeader title="Paciente não encontrado" />
        <Button variant="outline" onClick={() => navigate({ to: "/dashboard/clientes" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para clientes
        </Button>
      </>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = recordSchema.safeParse({ ...form, patientId });
    if (!r.success) {
      toast.error(r.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    try {
      await recordsRepo.create(tenantId, r.data);
      toast.success("Evolução registrada");
      setOpen(false);
      setForm({ date: new Date().toISOString().slice(0, 10), title: "", content: "" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const faltaComposicao = !patient.gender || !patient.heightCm || !patient.weightKg;

  return (
    <>
      <div className="mb-4">
        <Link
          to="/dashboard/clientes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Clientes
        </Link>
      </div>

      <PageHeader
        title={patient.name}
        subtitle={`${ageFrom(patient.birthDate)} anos · ${patient.phone}${patient.email ? ` · ${patient.email}` : ""}`}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova evolução
          </Button>
        }
      />

      <div className="no-print mb-6">
        <PatientDocumentActions
          patient={patient}
          records={evolucoes}
          permitePlano={hasModule(specialty.id, "avaliacao_nutricional")}
        />
      </div>

      {faltaComposicao && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Sexo, altura ou peso não preenchidos — sem eles não é possível calcular IEM, IMC e plano
          alimentar.{" "}
          <Link to="/dashboard/clientes" className="underline">
            Edite o cadastro do paciente
          </Link>
          .
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Linha label="Nascimento" value={br(patient.birthDate)} />
            <Linha
              label="Sexo"
              value={
                patient.gender === "female"
                  ? "Feminino"
                  : patient.gender === "male"
                    ? "Masculino"
                    : "—"
              }
            />
            <Linha label="Altura" value={patient.heightCm ? `${patient.heightCm} cm` : "—"} />
            <Linha label="Peso" value={patient.weightKg ? `${patient.weightKg} kg` : "—"} />
            <Linha label="Cintura" value={patient.waistCm ? `${patient.waistCm} cm` : "—"} />
            <Linha label="Quadril" value={patient.hipCm ? `${patient.hipCm} cm` : "—"} />
            <Linha label="Objetivo" value={objetivo(patient)} />
            {patient.notes && (
              <>
                <Separator className="my-2" />
                <p className="text-muted-foreground">{patient.notes}</p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Evoluções
                <Badge variant="secondary">{evolucoes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evolucoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma evolução registrada. Use <strong>Nova evolução</strong> para começar.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l-2 border-secondary pl-6">
                  {evolucoes.map((r) => (
                    <li key={r.id} className="relative rounded-xl border bg-card p-4">
                      <span className="absolute -left-[31px] top-5 h-3 w-3 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-semibold">{r.title}</h3>
                        <span className="text-xs text-muted-foreground">{br(r.date)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                        {r.content}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Consultas
                <Badge variant="secondary">{consultas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {consultas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma consulta agendada.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {consultas.map((a) => (
                    <li key={a.id} className="text-muted-foreground">
                      {br(a.date)} às {a.time} — {a.type}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova evolução — {patient.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Título</Label>
              <Input
                placeholder="Ex: Avaliação inicial, Retorno 1"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Evolução</Label>
              <Textarea
                rows={8}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <Button className="w-full">Salvar evolução</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}:</span> {value}
    </p>
  );
}

function objetivo(p: Patient): string {
  if (p.goal === "lose") return "Emagrecer";
  if (p.goal === "gain") return "Ganhar massa";
  if (p.goal === "maintain") return "Manter";
  return "—";
}
