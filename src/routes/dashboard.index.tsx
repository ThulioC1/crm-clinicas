import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useAppointments, usePatients, useRecords } from "@/hooks/use-tenant";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Painel — SaudePro" },
      { name: "description", content: "Resumo do seu consultório." },
      { property: "og:title", content: "Painel — SaudePro" },
      { property: "og:description", content: "Resumo do seu consultório." },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  const { data: patients } = usePatients();
  const { data: appts } = useAppointments();
  const { data: records } = useRecords();
  const today = new Date().toISOString().slice(0, 10);
  const todays = appts.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time));
  const name = (id: string) => patients.find((p) => p.id === id)?.name ?? "—";

  const stats = [
    { label: "Pacientes", value: patients.length },
    { label: "Consultas hoje", value: todays.length },
    { label: "Próximos 7 dias", value: appts.filter((a) => a.date >= today).length },
    { label: "Evoluções registradas", value: records.length },
  ];

  return (
    <>
      <PageHeader
        title={`Olá, ${user?.name.split(" ").slice(0, 2).join(" ")}`}
        subtitle="Veja o resumo do seu dia."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agenda de hoje</h2>
          <Link to="/dashboard/agenda" className="text-sm text-primary">
            Ver agenda
          </Link>
        </div>
        <ul className="mt-4 divide-y">
          {todays.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">Nenhuma consulta hoje.</li>
          )}
          {todays.map((a) => (
            <li key={a.id} className="flex items-center gap-4 py-3">
              <span className="w-14 font-display font-semibold text-primary">{a.time}</span>
              <div>
                <p className="font-medium">{name(a.patientId)}</p>
                <p className="text-xs text-muted-foreground">
                  {a.type} · {a.duration} min
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
