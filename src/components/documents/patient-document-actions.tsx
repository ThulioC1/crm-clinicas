import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilePlus2, Pill, Printer, Save, Trash2, Utensils } from "lucide-react";
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
import { useTenantId } from "@/hooks/use-tenant";
import { resolveSpecialty } from "@/lib/specialties";
import { patientDocsRepo, recordsRepo } from "@/services/db";
import {
  MEAL_SPLIT,
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
  prontuario: "Prontuário",
  receita: "Receita",
  plano: "Plano alimentar",
};

const vazio = (): PrescriptionItem[] => [{ name: "", dosage: "", instructions: "" }];

interface Props {
  patient: Patient;
  records: MedicalRecord[];
  permitePlano: boolean;
}

/**
 * Documentos clínicos editáveis e imprimíveis.
 *
 * A edição acontece DENTRO da prévia do documento, para o profissional ver
 * exatamente o que sai no papel. Receita e plano alimentar ficam salvos por
 * paciente; o prontuário edita as próprias evoluções.
 */
export function PatientDocumentActions({ patient, records, permitePlano }: Props) {
  const { user } = useAuth();
  const tenantId = useTenantId();
  const specialty = resolveSpecialty(user?.specialty);
  const [kind, setKind] = useState<DocKind | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [itens, setItens] = useState<PrescriptionItem[]>(vazio());
  const [orientacoes, setOrientacoes] = useState("");
  const [retorno, setRetorno] = useState("");
  const [refeicoes, setRefeicoes] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);

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

  /**
   * Marca o <html> enquanto há documento aberto.
   *
   * As regras de impressão escondem a aplicação só quando este atributo está
   * presente — senão um Ctrl+P comum na ficha sairia em branco.
   */
  useEffect(() => {
    const html = document.documentElement;
    if (kind) {
      html.setAttribute("data-printing", "true");
    } else {
      html.removeAttribute("data-printing");
    }
    return () => html.removeAttribute("data-printing");
  }, [kind]);

  /** Carrega o que já foi salvo para este paciente. */
  useEffect(() => {
    if (!kind || kind === "prontuario") return;
    let ativo = true;
    void patientDocsRepo
      .find(tenantId, patient.id, kind === "receita" ? "prescricao" : "plano_alimentar")
      .then((doc) => {
        if (!ativo || !doc) return;
        setDocId(doc.id);
        setItens(doc.items?.length ? doc.items : vazio());
        setOrientacoes(doc.notes ?? "");
        setRetorno(doc.returnDate ?? "");
      });
    return () => {
      ativo = false;
    };
  }, [kind, tenantId, patient.id]);

  const abrir = (k: DocKind) => {
    setKind(k);
    setEditando(null);
    if (k !== "prontuario") {
      setDocId(null);
      setItens(vazio());
      setOrientacoes("");
      setRetorno("");
      setRefeicoes({});
    }
  };

  const fechar = () => {
    setKind(null);
    setEditando(null);
  };

  const salvar = async () => {
    if (!kind || kind === "prontuario") return;
    setSalvando(true);
    try {
      const salvoKind = kind === "receita" ? "prescricao" : "plano_alimentar";
      const id = docId ?? (await patientDocsRepo.ensureId(tenantId, patient.id, salvoKind));
      setDocId(id);
      await patientDocsRepo.save(tenantId, {
        id,
        patientId: patient.id,
        kind: salvoKind,
        items: itens.filter((i) => i.name.trim() !== ""),
        notes: [
          orientacoes,
          ...Object.entries(refeicoes)
            .filter(([, v]) => v.trim())
            .map(([k, v]) => `${k}: ${v}`),
        ].join("\n"),
        returnDate: retorno,
      });
      toast.success("Documento salvo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const salvarEvolucao = async (r: MedicalRecord) => {
    try {
      await recordsRepo.update(tenantId, r.id, { content: rascunho });
      r.content = rascunho;
      setEditando(null);
      toast.success("Evolução atualizada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => abrir("prontuario")}>
          <Printer className="mr-2 h-4 w-4" />
          Prontuário
        </Button>
        <Button variant="outline" onClick={() => abrir("receita")}>
          <Pill className="mr-2 h-4 w-4" />
          Receita
        </Button>
        {permitePlano && (
          <Button variant="outline" onClick={() => abrir("plano")}>
            <Utensils className="mr-2 h-4 w-4" />
            Plano alimentar
          </Button>
        )}
      </div>

      <Dialog open={kind !== null} onOpenChange={(o) => !o && fechar()}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{kind ? TITULOS[kind] : ""}</DialogTitle>
          </DialogHeader>

          {kind === "prontuario" && (
            <p className="text-xs text-muted-foreground">
              Clique em <strong>Editar</strong> numa evolução para corrigir o texto antes de
              imprimir.
            </p>
          )}

          <div className="doc-scroll">
            {kind === "prontuario" &&
              (records.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este paciente ainda não tem evoluções registradas.
                </p>
              ) : (
                <PrintableRecordReport
                  {...brand}
                  patientName={patient.name}
                  patientBirthDate={patient.birthDate}
                  records={records}
                  renderBefore={(r) => (
                    <div className="no-print flex items-center gap-2">
                      {editando === r.id ? (
                        <>
                          <Button size="sm" onClick={() => salvarEvolucao(r)}>
                            <Save className="mr-2 h-3.5 w-3.5" />
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditando(null)}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditando(r.id);
                            setRascunho(r.content);
                          }}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  )}
                  renderContent={(r) =>
                    editando === r.id ? (
                      <Textarea
                        rows={6}
                        value={rascunho}
                        onChange={(e) => setRascunho(e.target.value)}
                        className="no-print"
                      />
                    ) : (
                      r.content
                    )
                  }
                />
              ))}

            {kind === "receita" && (
              <PrintablePrescriptionReport
                {...brand}
                patientName={patient.name}
                patientBirthDate={patient.birthDate}
                items={itens}
                notes={orientacoes}
                returnDate={retorno || undefined}
                editable
                onItemsChange={(i, patch) =>
                  setItens(itens.map((x, j) => (j === i ? { ...x, ...patch } : x)))
                }
                renderRowExtra={(i) => (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="no-print"
                    title="Remover linha"
                    onClick={() => setItens(itens.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                renderNotes={() => (
                  <Textarea
                    rows={4}
                    value={orientacoes}
                    onChange={(e) => setOrientacoes(e.target.value)}
                    placeholder="Orientações gerais, avisos, retorno..."
                    className="no-print"
                  />
                )}
                renderReturnDate={() => (
                  <Input
                    type="date"
                    value={retorno}
                    onChange={(e) => setRetorno(e.target.value)}
                    className="no-print"
                  />
                )}
              />
            )}

            {kind === "plano" &&
              (nutritional ? (
                <PrintableNutritionReport
                  {...brand}
                  patient={patient}
                  formulaLabel={TMB_FORMULA_LABELS.mifflin}
                  result={nutritional}
                  meals={MEAL_SPLIT.map((m) => ({
                    label: m.label,
                    text: refeicoes[m.label] ?? "",
                  }))}
                  editable
                  renderMeal={(label) => (
                    <Input
                      value={refeicoes[label] ?? ""}
                      onChange={(e) => setRefeicoes({ ...refeicoes, [label]: e.target.value })}
                      placeholder="Ex.: aveia, banana,casts"
                      className="no-print"
                    />
                  )}
                  renderNotes={() => (
                    <Textarea
                      rows={3}
                      value={orientacoes}
                      onChange={(e) => setOrientacoes(e.target.value)}
                      placeholder="Orientações gerais..."
                      className="no-print"
                    />
                  )}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Preencha sexo, altura e peso do paciente para gerar o plano alimentar.
                </p>
              ))}
          </div>

          {kind === "receita" && (
            <Button
              variant="outline"
              className="no-print"
              onClick={() => setItens([...itens, ...vazio()])}
            >
              <FilePlus2 className="mr-2 h-4 w-4" />
              Adicionar item
            </Button>
          )}

          {kind && (
            <>
              <Separator className="my-2" />
              <div className="no-print flex justify-end gap-2">
                {kind !== "prontuario" && (
                  <Button variant="outline" onClick={salvar} disabled={salvando}>
                    <Save className="mr-2 h-4 w-4" />
                    {salvando ? "Salvando..." : "Salvar"}
                  </Button>
                )}
                <Button onClick={() => window.print()}>
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
