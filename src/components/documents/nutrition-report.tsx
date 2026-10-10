import type { ReactNode } from "react";
import {
  DocumentFooter,
  DocumentHeader,
  PatientSummary,
  type DocumentBrand,
} from "./document-layout";
import {
  ACTIVITY_FACTORS,
  BMI_LABELS,
  MEAL_SPLIT,
  calcBmi,
  calcRcq,
  rcqRisk,
  riscoCircunferenciaAbdominal,
  type IemResult,
  type MealPlan,
} from "@/lib/calculations/nutrition";
import type { Patient } from "@/lib/types";

export interface NutritionReportProps extends DocumentBrand {
  patient: Patient;
  formulaLabel: string;
  result: {
    iem: IemResult;
    bmi: ReturnType<typeof calcBmi>;
    rcq: number | null;
    plano: MealPlan | null;
    activityLevel: keyof typeof ACTIVITY_FACTORS;
  };
  /** Texto de cada refeição; por padrão usa a divisão padrão. */
  meals?: { label: string; text?: string }[];
  /** Modo de edição: refeições e observações viram campos preenchíveis. */
  editable?: boolean;
  renderMeal?: (label: string) => ReactNode;
  renderNotes?: () => ReactNode;
  /** Orientações gerais já prontas (modo somente leitura). */
  notes?: string | undefined;
}

/** Relatório de avaliação nutricional pronto para impressão, com a marca do profissional. */
export function PrintableNutritionReport(props: NutritionReportProps) {
  const { patient, formulaLabel, result, professionalName, professionalSpecialty, registerLabel } =
    props;
  const { iem, bmi, rcq, plano, activityLevel } = result;
  const { editable, renderMeal, renderNotes } = props;
  const now = new Date();

  const refeicoes = props.meals?.length
    ? props.meals
    : MEAL_SPLIT.map((m) => ({ label: m.label, text: "" }));

  const riscoAbdominal =
    patient.waistCm && patient.gender
      ? riscoCircunferenciaAbdominal(patient.waistCm, patient.gender)
      : null;

  return (
    <article className="doc">
      <DocumentHeader
        brand={props}
        title="Relatório de Avaliação Nutricional"
        subtitle={now.toLocaleDateString("pt-BR")}
      />

      <PatientSummary patient={patient} />

      <section className="doc-section">
        <h2 className="doc-heading">Metabolismo</h2>
        <table className="doc-table">
          <tbody>
            <tr>
              <th>IEM (taxa metabólica basal)</th>
              <td className="doc-strong">{iem.iem} kcal/dia</td>
            </tr>
            <tr>
              <th>Equação utilizada</th>
              <td>{formulaLabel}</td>
            </tr>
            <tr>
              <th>Nível de atividade</th>
              <td>{ACTIVITY_FACTORS[activityLevel].label}</td>
            </tr>
            <tr>
              <th>Fator de atividade</th>
              <td>× {iem.factor}</td>
            </tr>
            <tr>
              <th>VALE (gasto energético total)</th>
              <td className="doc-strong">{iem.tdee} kcal/dia</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="doc-section">
        <h2 className="doc-heading">Composição corporal</h2>
        <table className="doc-table">
          <tbody>
            <tr>
              <th>IMC</th>
              <td>
                {bmi.value} kg/m² — {BMI_LABELS[bmi.classification]}
              </td>
            </tr>
            {rcq !== null && (
              <tr>
                <th>Razão cintura-quadril</th>
                <td>
                  {rcq} — risco {rcqRisk(rcq, patient.gender ?? "female")}
                </td>
              </tr>
            )}
            {riscoAbdominal !== null && (
              <tr>
                <th>Circunferência abdominal</th>
                <td>{riscoAbdominal ? "Elevada" : "Adequada"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {plano && (
        <section className="doc-section">
          <h2 className="doc-heading">Plano alimentar</h2>
          <p className="doc-note">
            Meta: <strong>{plano.kcal} kcal/dia</strong>
            {plano.adjustmentPct !== 0 &&
              ` (${plano.adjustmentPct > 0 ? "+" : ""}${plano.adjustmentPct}% sobre o VALE)`}
          </p>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Macronutriente</th>
                <th>Quantidade</th>
                <th>% do VET</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Proteínas</td>
                <td>{plano.proteinG} g</td>
                <td>{Math.round((plano.proteinG * 4 * 100) / plano.kcal)}%</td>
              </tr>
              <tr>
                <td>Carboidratos</td>
                <td>{plano.carbG} g</td>
                <td>{Math.round((plano.carbG * 4 * 100) / plano.kcal)}%</td>
              </tr>
              <tr>
                <td>Lipídios</td>
                <td>{plano.fatG} g</td>
                <td>{Math.round((plano.fatG * 9 * 100) / plano.kcal)}%</td>
              </tr>
            </tbody>
          </table>

          <table className="doc-table doc-meals">
            <thead>
              <tr>
                <th>Refeição</th>
                <th>% do VET</th>
                <th>kcal</th>
                {editable && <th>Alimentos / orientações</th>}
              </tr>
            </thead>
            <tbody>
              {refeicoes.map((m) => {
                const padrao = MEAL_SPLIT.find((x) => x.label === m.label);
                return (
                  <tr key={m.label}>
                    <td>{m.label}</td>
                    <td>{padrao?.percent ?? 0}%</td>
                    <td>{Math.round((plano.kcal * (padrao?.percent ?? 0)) / 100 / 10) * 10}</td>
                    {editable && <td>{renderMeal ? renderMeal(m.label) : (m.text ?? "")}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="doc-section">
        <h2 className="doc-heading">Orientações gerais</h2>
        {editable && renderNotes ? (
          renderNotes()
        ) : (
          <p className="doc-record-body">{props.notes ?? ""}</p>
        )}
      </section>

      <DocumentFooter
        brand={props}
        date={now}
      />
    </article>
  );
}
