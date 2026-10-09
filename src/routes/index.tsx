import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, FileText, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SaudePro — Pacientes, agenda e prontuários em um só lugar" },
      {
        name: "description",
        content:
          "Plataforma para nutricionistas, fisioterapeutas e personal trainers gerenciarem pacientes, agenda e evoluções.",
      },
      { property: "og:title", content: "SaudePro — Gestão para profissionais de saúde" },
      {
        property: "og:description",
        content: "Pacientes, agenda e prontuários com dados isolados e seguros.",
      },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Users, title: "Pacientes", text: "Cadastro completo e busca rápida." },
  { icon: CalendarDays, title: "Agenda", text: "Calendário semanal interativo." },
  { icon: FileText, title: "Prontuários", text: "Evoluções por consulta." },
  { icon: ShieldCheck, title: "Dados isolados", text: "Cada profissional vê só os seus." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold">SaudePro</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/login">Entrar</Link>
        </Button>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center md:pt-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
          Seu consultório organizado,{" "}
          <span className="text-primary">do primeiro contato à evolução.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
          Para nutricionistas, fisioterapeutas, personal trainers e outros profissionais autônomos.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/login">Acessar a plataforma</Link>
        </Button>
        <div className="mt-20 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
