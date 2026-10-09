import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePatients, useRecords, useAppointments, useTenantId } from "@/hooks/use-tenant";
import { patientsRepo } from "@/services/db";
import { patientSchema } from "@/lib/schemas";
import { useAuth } from "@/lib/auth";
import { resolveSpecialty } from "@/lib/specialties";
import { ACTIVITY_FACTORS } from "@/lib/calculations/nutrition";
import type { ActivityLevel, Gender, Patient, WeightGoal } from "@/lib/types";

export const Route = createFileRoute("/dashboard/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — SaudePro" },
      { name: "description", content: "Seus pacientes e clientes." },
      { property: "og:title", content: "Clientes — SaudePro" },
      { property: "og:description", content: "Seus pacientes e clientes." },
    ],
  }),
  component: Clients,
});

const PAGE = 6;
const empty = {
  name: "",
  email: "",
  phone: "",
  birthDate: "",
  notes: "",
  gender: "" as "" | Gender,
  heightCm: "",
  weightKg: "",
  waistCm: "",
  hipCm: "",
  activityLevel: "" as "" | ActivityLevel,
  goal: "" as "" | WeightGoal,
};

const vazioPara = (v: string | number | undefined) =>
  v === "" || v === undefined ? "" : String(v);

/** Monta o estado do formulário a partir de um paciente existente. */
const fromPatient = (p: Patient) => ({
  name: p.name,
  email: p.email,
  phone: p.phone,
  birthDate: p.birthDate,
  notes: p.notes,
  gender: p.gender ?? ("" as const),
  heightCm: vazioPara(p.heightCm),
  weightKg: vazioPara(p.weightKg),
  waistCm: vazioPara(p.waistCm),
  hipCm: vazioPara(p.hipCm),
  activityLevel: p.activityLevel ?? ("" as const),
  goal: p.goal ?? ("" as const),
});

function Clients() {
  const tenantId = useTenantId();
  const { user } = useAuth();
  const specialty = resolveSpecialty(user?.specialty);
  const usaComposicao = specialty.modules.includes("avaliacao_nutricional");
  const { data } = usePatients();
  const { data: records } = useRecords();
  const { data: appts } = useAppointments();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [selected, setSelected] = useState<Patient | null>(null);

  const filtered = useMemo(
    () =>
      data
        .filter((p) => `${p.name} ${p.email} ${p.phone}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data, q],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = patientSchema.safeParse(form);
    if (!r.success) {
      // Mostra todos os problemas, não só o primeiro
      toast.error(r.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    try {
      if (editing) {
        await patientsRepo.update(tenantId, editing.id, r.data);
        toast.success("Paciente atualizado");
      } else {
        await patientsRepo.create(tenantId, { ...r.data, notes: r.data.notes ?? "" });
        toast.success("Paciente cadastrado");
      }
      setForm(empty);
      setEditing(null);
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm(fromPatient(p));
    setSelected(null);
    setOpen(true);
  };

  const set =
    (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${data.length} cadastrados`}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        }
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, e-mail ou telefone"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead className="hidden md:table-cell">Nascimento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell className="hidden md:table-cell">{p.email}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {p.birthDate.split("-").reverse().join("/")}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        <span className="text-muted-foreground">
          Página {page + 1} de {pages}
        </span>
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Anterior
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page + 1 >= pages}
          onClick={() => setPage(page + 1)}
        >
          Próxima
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <Label>Nome completo</Label>
              <Input value={form.name} onChange={set("name")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={set("phone")} />
              </div>
              <div className="space-y-1">
                <Label>Nascimento</Label>
                <Input type="date" value={form.birthDate} onChange={set("birthDate")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={set("email")} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={set("notes")} />
            </div>

            {usaComposicao && (
              <>
                <Separator className="my-2" />
                <p className="text-sm font-semibold text-muted-foreground">
                  Dados de composição corporal
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Sexo biológico</Label>
                    <Select
                      value={form.gender ?? ""}
                      onValueChange={(v) => setForm({ ...form, gender: v as Gender })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Feminino</SelectItem>
                        <SelectItem value="male">Masculino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Altura (cm)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form.heightCm}
                      onChange={set("heightCm")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Peso (kg)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form.weightKg}
                      onChange={set("weightKg")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cintura (cm)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form.waistCm}
                      onChange={set("waistCm")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Quadril (cm)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form.hipCm}
                      onChange={set("hipCm")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Atividade física</Label>
                    <Select
                      value={form.activityLevel ?? ""}
                      onValueChange={(v) => setForm({ ...form, activityLevel: v as ActivityLevel })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTIVITY_FACTORS).map(([value, info]) => (
                          <SelectItem key={value} value={value}>
                            {info.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Objetivo</Label>
                  <Select
                    value={form.goal ?? ""}
                    onValueChange={(v) => setForm({ ...form, goal: v as WeightGoal })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lose">Emagrecer</SelectItem>
                      <SelectItem value="maintain">Manter</SelectItem>
                      <SelectItem value="gain">Ganhar massa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button className="w-full">{editing ? "Salvar alterações" : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="flex-row items-center justify-between space-y-0 pr-12">
                <SheetTitle>{selected.name}</SheetTitle>
                <Button variant="outline" size="sm" onClick={() => openEdit(selected)}>
                  Editar
                </Button>
              </SheetHeader>
              <div className="space-y-2 px-4 text-sm">
                <p>
                  <span className="text-muted-foreground">Telefone:</span> {selected.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">E-mail:</span> {selected.email || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Nascimento:</span>{" "}
                  {selected.birthDate.split("-").reverse().join("/")}
                </p>
                {(selected.gender || selected.heightCm || selected.weightKg) && (
                  <>
                    <p>
                      <span className="text-muted-foreground">Sexo:</span>{" "}
                      {selected.gender === "female"
                        ? "Feminino"
                        : selected.gender === "male"
                          ? "Masculino"
                          : "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Altura:</span>{" "}
                      {selected.heightCm ? `${selected.heightCm} cm` : "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Peso:</span>{" "}
                      {selected.weightKg ? `${selected.weightKg} kg` : "—"}
                    </p>
                  </>
                )}
                {usaComposicao &&
                  (!selected.gender || !selected.heightCm || !selected.weightKg) && (
                    <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      Faltam dados para o cálculo nutricional. Use <strong>Editar</strong> para
                      preencher sexo, altura e peso.
                    </p>
                  )}
                {selected.notes && (
                  <p>
                    <span className="text-muted-foreground">Observações:</span> {selected.notes}
                  </p>
                )}
                <h3 className="pt-4 font-semibold">Consultas</h3>
                {appts
                  .filter((a) => a.patientId === selected.id)
                  .map((a) => (
                    <p key={a.id} className="text-muted-foreground">
                      {a.date.split("-").reverse().join("/")} {a.time} — {a.type}
                    </p>
                  ))}
                <h3 className="pt-4 font-semibold">Evoluções</h3>
                {records
                  .filter((r) => r.patientId === selected.id)
                  .map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <p className="font-medium">{r.title}</p>
                      <p className="mt-1 text-muted-foreground">{r.content}</p>
                    </div>
                  ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
