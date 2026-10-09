import { useMemo, useState } from "react";
import { FilePlus2, Pill, Printer, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  PrintablePrescriptionReport,
  PrintableRecordReport,
  type PrescriptionItem,
} from "@/components/documents/clinical-reports";
import { PrintableNutritionReport } from "@/components/documents/nutrition-report";
import { useAuth } from "@/lib/auth";
import { resolveSpecialty } from "@/lib/specialties";
import {
  TMB_FORMULA_LABELS,
  ageFrom,
  calcBmi,
  calcIem,
  calcPlanoAlimentar,
  calcRcq,
} from "@/lib/calculations/nutrition";
import type { MedicalRecord, Patient } from "@/lib/types";

type DocKind = "prontuario" | "receita" | "plano";

const TITULOS: Record<DocKind, string> = {
  prontuario: "Imprimir prontuário",
  receita: "Imprimir receita",
  plano: "Imprimir plano alimentar",
};

const vazio = () => [{ name: "", dosage: "", instructions: "" }];

interface Props {
  patient: Patient;
  records: MedicalRecord[];
  /** Só mostra o plano alimentar para quem tem o módulo. */
  permitePlano: boolean;
}

/**
 * Impressão de documentos clínicos a partir da ficha do paciente.
 * Cada documento abre em diálogo e usa `window.print()`, que imprime só o
 * `.doc` visível (as regras de impressão escondem o resto da interface).
 */
export function PatientDocumentActions({ patient, records, permitePlano }: Props) {
  const { user } = useAuth();
  const specialty = resolveSpecialty(user?.specialty);
  const [kind, setKind] = useState<DocKind | null>(null);
  const [itens, setItens] = useState<PrescriptionItem[]>(vazio());
  const [orientacoes, setOrientacoes] = useState("");
  const [retorno, setRetorno] = useState("");

  const brand = useMemo(
    () => ({
      professionalName: user?.name ?? "",
      professionalSpecialty: specialty.label,
      registerLabel: specialty.registerLabel,
    }),
    [user?.name, specialty],
  );

  const nutritional = useMemo(() => {
    if (!patient.gender || !patient.heightCm || !patient.weightKg) return null;
    const activityLevel = patient.activityLevel ?? "sedentary";
    const iem = calcIem({
      weightKg: patient.weightKg,
      heightCm: patient.heightCm,
      age: ageFrom(patient.birthDate),
      gender: patient.gender,
      activityLevel,
    });
    return {
      iem,
      bmi: calcBmi(patient.weightKg, patient.heightCm),
      rcq: patient.waistCm && patient.hipCm ? calcRcq(patient.waistCm, patient.hipCm) : null,
      plano: patient.goal
        ? calcPlanoAlimentar({ goal: patient.goal, weightKg: patient.weightKg, tdee: iem.tdee })
        : null,
      activityLevel,
    };
  }, [patient]);

  const fechar = () => {
    setKind(null);
    setItens(vazio());
    setOrientacoes("");
    setRetorno("");
  };

  const imprimir = () => window.print();

  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setKind("prontuario")}>
          <Printer className="mr-2 h-4 w-4" />
          Prontuário
        </Button>
        <Button variant="outline" onClick={() => setKind("receita")}>
          <Pill className="mr-2 h-4 w-4" />
          Receita
        </Button>
        {permitePlano && (
          <Button variant="outline" onClick={() => setKind("plano")}>
            <Utensils className="mr-2 h-4 w-4" />
            Plano alimentar
          </Button>
        )}
      </div>

      <Dialog open={kind !== null} onOpenChange={(o) => !o && fechar()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{kind ? TITULOS[kind] : ""}</DialogTitle>
          </DialogHeader>

          {kind === "receita" && (
            <div className="no-print space-y-3">
              {itens.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-5"
                    placeholder="Medicamento ou suplemento"
                    value={item.name}
                    onChange={(e) =>
                      setItens(itens.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                    }
                  />
                  <Input
                    className="col-span-3"
                    placeholder="Dose"
                    value={item.dosage}
                    onChange={(e) =>
                      setItens(
                        itens.map((x, j) => (j === i ? { ...x, dosage: e.target.value } : x)),
                      )
                    }
                  />
                  <Input
                    className="col-span-4"
                    placeholder="Orientações"
                    value={item.instructions}
                    onChange={(e) =>
                      setItens(
                        itens.map((x, j) => (j === i ? { ...x, instructions: e.target.value } : x)),
                      )
                    }
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItens([...itens, { name: "", dosage: "", instructions: "" }])}
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                Adicionar item
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Orientações gerais</Label>
                  <Textarea
                    rows={3}
                    value={orientacoes}
                    onChange={(e) => setOrientacoes(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data de retorno</Label>
                  <Input type="date" value={retorno} onChange={(e) => setRetorno(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {kind && (
            <div className="mt-4 border-t pt-4">
              {kind === "prontuario" && (
                <PrintableRecordReport
                  {...brand}
                  patientName={patient.name}
                  patientBirthDate={patient.birthDate}
                  records={records}
                />
              )}
              {kind === "receita" && (
                <PrintablePrescriptionReport
                  {...brand}
                  patientName={patient.name}
                  patientBirthDate={patient.birthDate}
                  items={itens}
                  notes={orientacoes}
                  returnDate={retorno || undefined}
                />
              )}
              {kind === "plano" &&
                (nutritional ? (
                  <PrintableNutritionReport
                    {...brand}
                    patient={patient}
                    formulaLabel={TMB_FORMULA_LABELS.mifflin}
                    result={nutritional}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Preencha sexo, altura e peso do paciente para gerar o plano alimentar.
                  </p>
                ))}
            </div>
          )}

          {kind && (
            <>
              <Separator className="my-4" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={fechar}>
                  Fechar
                </Button>
                <Button onClick={imprimir}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
