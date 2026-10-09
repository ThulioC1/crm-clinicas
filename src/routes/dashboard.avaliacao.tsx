import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, Printer } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { usePatients } from "@/hooks/use-tenant";
import { resolveSpecialty } from "@/lib/specialties";
import {
  ACTIVITY_FACTORS,
  BMI_LABELS,
  MEAL_SPLIT,
  TMB_FORMULA_LABELS,
  ageFrom,
  calcBmi,
  calcIem,
  calcPlanoAlimentar,
  calcRcq,
  type TmbFormula,
} from "@/lib/calculations/nutrition";
import { PrintableNutritionReport } from "@/components/documents/nutrition-report";
import type { Patient } from "@/lib/types";

export const Route = createFileRoute("/dashboard/avaliacao")({
  head: () => ({
    meta: [
      { title: "Avaliação — SaudePro" },
      { name: "description", content: "IEM, composição corporal e plano alimentar." },
      { property: "og:title", content: "Avaliação — SaudePro" },
      { property: "og:description", content: "IEM, composição corporal e plano alimentar." },
    ],
  }),
  component: Avaliacao,
});

function Avaliacao() {
  const { user } = useAuth();
  const specialty = resolveSpecialty(user?.specialty);
  const { data: patients } = usePatients();
  const [patientId, setPatientId] = useState("");
  const [formula, setFormula] = useState<TmbFormula>("mifflin");
  const [notes, setNotes] = useState("");

  const patient = patients.find((p) => p.id === patientId) ?? null;
  const elegiveis = useMemo(
    () => patients.filter((p) => p.gender && p.heightCm && p.weightKg),
    [patients],
  );

  const resultado = useMemo(() => {
    if (!patient?.gender || !patient.heightCm || !patient.weightKg) return null;
    const activityLevel = patient.activityLevel ?? "sedentary";

    const iem = calcIem({
      weightKg: patient.weightKg,
      heightCm: patient.heightCm,
      age: ageFrom(patient.birthDate),
      gender: patient.gender,
      activityLevel,
      formula,
      leanMassKg: undefined,
    });
    const bmi = calcBmi(patient.weightKg, patient.heightCm);
    const rcq = patient.waistCm && patient.hipCm ? calcRcq(patient.waistCm, patient.hipCm) : null;
    const plano = patient.goal
      ? calcPlanoAlimentar({ goal: patient.goal, weightKg: patient.weightKg, tdee: iem.tdee })
      : null;

    return { iem, bmi, rcq, plano, activityLevel };
  }, [patient, formula]);

  if (!specialty.modules.includes("avaliacao_nutricional")) {
    return (
      <>
        <PageHeader title="Avaliação" subtitle="Módulo não disponível para esta especialidade" />
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Módulo restrito</CardTitle>
            <CardDescription>
              A avaliação nutricional está disponível para nutricionistas e personal trainers. Sua
              especialidade registrada é {specialty.label}.
            </CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Avaliação nutricional"
        subtitle="IEM, composição corporal e plano alimentar"
        action={
          resultado ? (
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          ) : undefined
        }
      />

      <div className="no-print grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Paciente</Label>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o paciente" />
            </SelectTrigger>
            <SelectContent>
              {elegiveis.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {patients.length > 0 && elegiveis.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum paciente com sexo, altura e peso preenchidos. Cadastre esses dados em Clientes.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Equação do IEM</Label>
          <Select value={formula} onValueChange={(v) => setFormula(v as TmbFormula)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TMB_FORMULA_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!resultado && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Calculator className="h-4 w-4" />
          Selecione um paciente para calcular.
        </p>
      )}

      {resultado && patient && (
        <div className="mt-6 space-y-4">
          <PrintableNutritionReport
            patient={patient}
            formulaLabel={TMB_FORMULA_LABELS[formula]}
            result={resultado}
            professionalName={user?.name ?? ""}
            professionalSpecialty={specialty.label}
            registerLabel={specialty.registerLabel}
          />

          <div className="no-print space-y-2">
            <Label>Orientações / conduta</Label>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Registre as orientações dadas ao paciente..."
            />
          </div>
        </div>
      )}
    </>
  );
}
