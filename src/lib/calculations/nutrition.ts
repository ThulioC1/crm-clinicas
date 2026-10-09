import type { ActivityLevel, Gender, WeightGoal } from "@/lib/types";

/** Arredonda para a casa decimal informada. */
export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Cálculos clínico-nutricionais.
 *
 * Funções puras, com a fórmula e a referência de origem de cada equação para
 * rastreabilidade clínica. Valores já arredondados para exibição.
 */

/** Idade em anos completos a partir da data de nascimento (ISO yyyy-mm-dd). */
export function ageFrom(birthDate: string, reference = new Date()): number {
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return 0;
  let age = reference.getFullYear() - born.getFullYear();
  const monthDiff = reference.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < born.getDate())) age--;
  return Math.max(0, age);
}

/* -------------------------------------------------------------------------- */
/* IEM / TMB                                                                    */
/* -------------------------------------------------------------------------- */

/** Mifflin-St Jeor (1990) — equação de referência para TMB em adultos. */
export function tmbMifflinStJeor(p: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(p.gender === "male" ? base + 5 : base - 161);
}

/** Harris-Benedict revisada (Roza & Shizgal, 1984). */
export function tmbHarrisBenedict(p: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}): number {
  const base = 88.362 + 13.397 * p.weightKg + 4.799 * p.heightCm - 5.677 * p.age;
  return Math.round(p.gender === "male" ? base : base - 161);
}

/** Katch-McArdle (1986) — baseada em massa magra, independe do sexo. */
export function tmbKatchMcArdle(_weightKg: number, leanMassKg: number): number {
  return Math.round(370 + 21.6 * leanMassKg);
}

export type TmbFormula = "mifflin" | "harris" | "katch";

export const ACTIVITY_FACTORS: Record<ActivityLevel, { factor: number; label: string }> = {
  sedentary: { factor: 1.2, label: "Sedentário — pouco ou nenhum exercício" },
  light: { factor: 1.375, label: "Leve — 1 a 3 vezes por semana" },
  moderate: { factor: 1.55, label: "Moderado — 3 a 5 vezes por semana" },
  active: { factor: 1.725, label: "Ativo — 6 a 7 vezes por semana" },
  athlete: { factor: 1.9, label: "Atleta — 2 treinamentos por dia" },
};

export const TMB_FORMULA_LABELS: Record<TmbFormula, string> = {
  mifflin: "Mifflin-St Jeor (1990)",
  harris: "Harris-Benedict revisada (1984)",
  katch: "Katch-McArdle (1986)",
};

export interface IemInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  formula?: TmbFormula | undefined;
  /** Massa magra em kg — necessária apenas para Katch-McArdle. */
  leanMassKg?: number | undefined;
}

export interface IemResult {
  /** IEM = Taxa Metabólica Basal, em kcal/dia. */
  iem: number;
  /** TDEE = Gasto Energético Total (IEM x fator de atividade), em kcal/dia. */
  tdee: number;
  formula: TmbFormula;
  factor: number;
  activityLabel: string;
}

/**
 * Calcula o IEM (taxa metabólica basal) e o gasto energético total.
 * Katch-McArdle exige massa magra; sem ela, cai para Mifflin-St Jeor.
 */
export function calcIem(input: IemInput): IemResult {
  const formula = input.formula ?? "mifflin";
  const { factor, label } = ACTIVITY_FACTORS[input.activityLevel];

  let iem: number;
  if (formula === "katch" && input.leanMassKg) {
    iem = tmbKatchMcArdle(input.weightKg, input.leanMassKg);
  } else if (formula === "harris") {
    iem = tmbHarrisBenedict(input);
  } else {
    iem = tmbMifflinStJeor(input);
  }

  const used: TmbFormula = formula === "katch" && !input.leanMassKg ? "mifflin" : formula;
  return { iem, tdee: Math.round(iem * factor), formula: used, factor, activityLabel: label };
}

/* -------------------------------------------------------------------------- */
/* Composição corporal                                                          */
/* -------------------------------------------------------------------------- */

export type BmiClass = "magreza" | "eutrofia" | "sobrepeso" | "obesidade" | "obesidade_morbida";

export const BMI_LABELS: Record<BmiClass, string> = {
  magreza: "Magreza",
  eutrofia: "Eutrofia",
  sobrepeso: "Sobrepeso",
  obesidade: "Obesidade",
  obesidade_morbida: "Obesidade grau III",
};

/** IMC = peso (kg) / altura (m)² — classificação da OMS. */
export function calcBmi(
  weightKg: number,
  heightCm: number,
): { value: number; classification: BmiClass } {
  const meters = heightCm / 100;
  const value = round(meters > 0 ? weightKg / (meters * meters) : 0, 1);

  let classification: BmiClass;
  if (value < 18.5) classification = "magreza";
  else if (value < 25) classification = "eutrofia";
  else if (value < 30) classification = "sobrepeso";
  else if (value < 35) classification = "obesidade";
  else classification = "obesidade_morbida";

  return { value, classification };
}

/** Razão cintura-quadril (RCQ). */
export function calcRcq(waistCm: number, hipCm: number): number {
  return round(hipCm > 0 ? waistCm / hipCm : 0, 2);
}

/** Risco pela RCQ — pontos de corte da OMS: alto >=0,85 (mulheres) e >=0,90 (homens). */
export function rcqRisk(rcq: number, gender: Gender): "baixo" | "moderado" | "alto" {
  const high = gender === "male" ? 0.9 : 0.85;
  const moderate = gender === "male" ? 0.85 : 0.8;
  if (rcq >= high) return "alto";
  if (rcq >= moderate) return "moderado";
  return "baixo";
}

/** Circunferência abdominal isolada (NHLBI): >=102 cm em homens, >=94 cm em mulheres. */
export function riscoCircunferenciaAbdominal(waistCm: number, gender: Gender): boolean {
  return waistCm >= (gender === "male" ? 102 : 94);
}

export interface SkinFoldInput {
  gender: Gender;
  age: number;
  /** Dobras em cm: tríceps, bíceps, subescapular e suprailíaca. */
  triceps: number;
  biceps: number;
  subscapular: number;
  suprailiac: number;
}

/** Sumatório das quatro dobras cutâneas. */
export function somaDobrasCutaneas(input: SkinFoldInput): number {
  return round(input.triceps + input.biceps + input.subscapular + input.suprailiac, 1);
}

/**
 * Durnin & Womersley (1974): D = a − b·log₁₀(Σ), com coeficientes por sexo e
 * faixa etária. Σ é a soma das quatro dobras (tríceps, bíceps, subescapular,
 * suprailíaca). O % de gordura sai da equação de Siri: %GC = (495 / D) − 450.
 */
const DW_DENSITY: Record<Gender, ReadonlyArray<{ maxAge: number; a: number; b: number }>> = {
  male: [
    { maxAge: 20, a: 1.162, b: 0.063 },
    { maxAge: 30, a: 1.1631, b: 0.0632 },
    { maxAge: 40, a: 1.1422, b: 0.0544 },
    { maxAge: 50, a: 1.162, b: 0.07 },
    { maxAge: Infinity, a: 1.1715, b: 0.0779 },
  ],
  female: [
    { maxAge: 20, a: 1.1549, b: 0.0678 },
    { maxAge: 30, a: 1.1599, b: 0.0717 },
    { maxAge: 40, a: 1.1423, b: 0.0612 },
    { maxAge: 50, a: 1.1333, b: 0.0645 },
    { maxAge: Infinity, a: 1.1339, b: 0.0645 },
  ],
};

/** Densidade corporal estimada (g/mL) a partir das dobras cutâneas. */
export function calcDensidadeCorporal(input: SkinFoldInput): number {
  const sum = somaDobrasCutaneas(input);
  if (sum <= 0) return 0;
  const table = DW_DENSITY[input.gender];
  const row = table.find((r) => input.age < r.maxAge) ?? table[table.length - 1]!;
  return row.a - row.b * Math.log10(sum);
}

/** Percentual de gordura corporal por Durnin-Womersley + Siri. */
export function calcPercentualGordura(input: SkinFoldInput): number {
  const density = calcDensidadeCorporal(input);
  if (density <= 0) return 0;
  return round(495 / density - 450, 1);
}

/** Faixas de percentual de gordura por sexo (ACE / ACSM). */
export function classificarGordura(percent: number, gender: Gender): string {
  if (gender === "female") {
    if (percent < 16) return "Gordura essencial";
    if (percent < 23) return "Atlética";
    if (percent < 30) return "Aceitável";
    if (percent < 35) return "Sobrepeso";
    return "Obesidade";
  }
  if (percent < 6) return "Gordura essencial";
  if (percent < 14) return "Atlética";
  if (percent < 18) return "Aceitável";
  if (percent < 25) return "Sobrepeso";
  return "Obesidade";
}

/** Massa magra (kg) a partir do peso e do percentual de gordura. */
export function calcMassaMagra(weightKg: number, percentFat: number): number {
  return round(weightKg * (1 - percentFat / 100), 1);
}

/* -------------------------------------------------------------------------- */
/* Plano alimentar                                                              */
/* -------------------------------------------------------------------------- */

export interface MacronutrientRange {
  min: number;
  max: number;
  label: string;
}

/** Faixa proteica em g/kg conforme objetivo. */
export const PROTEIN_RANGE: Record<WeightGoal, MacronutrientRange> = {
  lose: { min: 1.6, max: 2.4, label: "Emagrecimento e composição corporal" },
  gain: { min: 1.6, max: 2.2, label: "Hipertrofia e ganho de massa" },
  maintain: { min: 1.2, max: 1.6, label: "Manutenção de massa magra" },
};

/** Faixa de lipídios em % do VET (Manual de Orientação dos Coronarianários). */
export const FAT_RANGE: Record<WeightGoal, MacronutrientRange> = {
  lose: { min: 20, max: 30, label: "Emagrecimento" },
  gain: { min: 25, max: 35, label: "Ganho de massa" },
  maintain: { min: 25, max: 35, label: "Manutenção e saúde cardiovascular" },
};

export interface MealPlan {
  kcal: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  adjustmentPct: number;
  goal: WeightGoal;
}

/**
 * Plano alimentar a partir do TDEE: −15% para emagrecimento, +10% para ganho.
 * Proteína fica no meio da faixaindicada e o carboidrato fecha a diferença.
 */
export function calcPlanoAlimentar(params: {
  goal: WeightGoal;
  weightKg: number;
  tdee: number;
}): MealPlan {
  const { goal, weightKg, tdee } = params;
  const adjustmentPct = goal === "lose" ? -15 : goal === "gain" ? 10 : 0;
  const kcal = Math.round((tdee * (1 + adjustmentPct / 100)) / 10) * 10;

  const p = PROTEIN_RANGE[goal];
  const f = FAT_RANGE[goal];
  const proteinKcal = ((p.min + p.max) / 2) * weightKg * 4;
  const fatKcal = ((f.min + f.max) / 2 / 100) * kcal;
  const carbKcal = Math.max(kcal - proteinKcal - fatKcal, 0);

  return {
    kcal,
    proteinG: Math.round(proteinKcal / 4),
    fatG: Math.round(fatKcal / 9),
    carbG: Math.round(carbKcal / 4),
    adjustmentPct,
    goal,
  };
}

/** Divisão das calorias em refeições. */
export const MEAL_SPLIT = [
  { label: "Café da manhã", percent: 25 },
  { label: "Lanche da manhã", percent: 10 },
  { label: "Almoço", percent: 30 },
  { label: "Lanche da tarde", percent: 10 },
  { label: "Jantar", percent: 25 },
] as const;

/** Aplica o IEM ao paciente conforme sexo informado no cadastro. */
export function calcIemDoPaciente(params: {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  birthDate: string;
  activityLevel: ActivityLevel;
  formula?: TmbFormula;
  leanMassKg?: number;
  reference?: Date;
}): IemResult {
  return calcIem({
    weightKg: params.weightKg,
    heightCm: params.heightCm,
    age: ageFrom(params.birthDate, params.reference),
    gender: params.gender,
    activityLevel: params.activityLevel,
    formula: params.formula,
    leanMassKg: params.leanMassKg,
  });
}
