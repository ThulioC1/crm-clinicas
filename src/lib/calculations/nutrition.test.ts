import { describe, expect, it } from "vitest";
import {
  ACTIVITY_FACTORS,
  BMI_LABELS,
  MEAL_SPLIT,
  ageFrom,
  calcBmi,
  calcDensidadeCorporal,
  calcIem,
  calcMassaMagra,
  calcPercentualGordura,
  calcPlanoAlimentar,
  calcRcq,
  classificarGordura,
  rcqRisk,
  riscoCircunferenciaAbdominal,
  somaDobrasCutaneas,
  tmbMifflinStJeor,
} from "./nutrition";

describe("ageFrom", () => {
  it("conta anos completos respeitando o dia do aniversário", () => {
    const ref = new Date("2026-06-15");
    expect(ageFrom("1990-06-15", ref)).toBe(36);
    expect(ageFrom("1990-06-16", ref)).toBe(35);
    expect(ageFrom("1990-12-31", ref)).toBe(35);
  });

  it("devolve 0 para data inválida", () => {
    expect(ageFrom("nao-e-data")).toBe(0);
  });
});

describe("tmbMifflinStJeor", () => {
  // Homem 80kg, 180cm, 30 anos: 10*80 + 6.25*180 - 5*30 + 5 = 1780
  it("aplica a fórmula no homem", () => {
    expect(tmbMifflinStJeor({ weightKg: 80, heightCm: 180, age: 30, gender: "male" })).toBe(1780);
  });

  // Mulher 65kg, 165cm, 30 anos: 10*65 + 6.25*165 - 5*30 - 161 = 1370.25 -> 1370
  it("aplica a fórmula na mulher", () => {
    expect(tmbMifflinStJeor({ weightKg: 65, heightCm: 165, age: 30, gender: "female" })).toBe(1370);
  });
});

describe("calcIem", () => {
  it("multiplica o IEM pelo fator de atividade", () => {
    const r = calcIem({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: "male",
      activityLevel: "sedentary",
    });
    expect(r.iem).toBe(1780);
    expect(r.tdee).toBe(Math.round(1780 * ACTIVITY_FACTORS.sedentary.factor));
    expect(r.factor).toBe(1.2);
  });

  it("usa massa magra em Katch-McArdle", () => {
    const r = calcIem({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: "male",
      activityLevel: "light",
      formula: "katch",
      leanMassKg: 60,
    });
    // 370 + 21.6 * 60 = 1666
    expect(r.iem).toBe(1666);
    expect(r.formula).toBe("katch");
  });

  it("cai para Mifflin quando Katch não tem massa magra", () => {
    const r = calcIem({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: "male",
      activityLevel: "light",
      formula: "katch",
    });
    expect(r.formula).toBe("mifflin");
    expect(r.iem).toBe(1780);
  });
});

describe("calcBmi", () => {
  it("classifica nas faixas da OMS", () => {
    expect(calcBmi(50, 165).classification).toBe("magreza");
    expect(calcBmi(65, 170).classification).toBe("eutrofia");
    expect(calcBmi(80, 170).classification).toBe("sobrepeso");
    expect(calcBmi(95, 170).classification).toBe("obesidade");
    expect(calcBmi(120, 170).classification).toBe("obesidade_morbida");
  });

  it("calcula o valor com uma casa decimal", () => {
    // 80 / 1.7^2 = 27.68 -> 27.7
    expect(calcBmi(80, 170).value).toBe(27.7);
  });

  it("devolve 0 com altura inválida", () => {
    expect(calcBmi(80, 0).value).toBe(0);
  });

  it("tem rótulo para todas as classificações", () => {
    expect(BMI_LABELS.eutrofia).toBe("Eutrofia");
    expect(Object.keys(BMI_LABELS)).toHaveLength(5);
  });
});

describe("razões corporais", () => {
  it("calcula a RCQ", () => {
    expect(calcRcq(80, 100)).toBe(0.8);
    expect(calcRcq(70, 0)).toBe(0);
  });

  it("classifica o risco pela RCQ", () => {
    expect(rcqRisk(0.75, "female")).toBe("baixo");
    expect(rcqRisk(0.8, "female")).toBe("moderado");
    expect(rcqRisk(0.85, "female")).toBe("alto");
    expect(rcqRisk(0.84, "male")).toBe("baixo");
    expect(rcqRisk(0.86, "male")).toBe("moderado");
    expect(rcqRisk(0.9, "male")).toBe("alto");
  });

  it("aplica o corte de circunferência abdominal do NHLBI", () => {
    expect(riscoCircunferenciaAbdominal(94, "female")).toBe(true);
    expect(riscoCircunferenciaAbdominal(93, "female")).toBe(false);
    expect(riscoCircunferenciaAbdominal(102, "male")).toBe(true);
  });
});

describe("dobras cutâneas — Durnin & Womersley (1974)", () => {
  const base = { triceps: 5, biceps: 5, subscapular: 5, suprailiac: 5 };

  it("soma as quatro dobras", () => {
    expect(
      somaDobrasCutaneas({
        gender: "male",
        age: 30,
        triceps: 1.2,
        biceps: 1.0,
        subscapular: 1.5,
        suprailiac: 1.3,
      }),
    ).toBe(5);
  });

  // Homem 30-39 anos, Σ = 20mm: D = 1.1422 − 0.0544·log₁₀(20) = 1.0714
  it("estima a densidade com os coeficientes da faixa etária", () => {
    const d = calcDensidadeCorporal({ gender: "male", age: 30, ...base });
    expect(d).toBeCloseTo(1.0714, 4);
  });

  // %GC = (495/1.071424) − 450 = 12.0%
  it("calcula o percentual de gordura pela equação de Siri", () => {
    expect(calcPercentualGordura({ gender: "male", age: 30, ...base })).toBe(12);
  });

  // Mulher 20-29 anos, Σ = 62mm: D = 1.1599 − 0.0717·log₁₀(62) = 1.0314 -> 29.9%
  it("usa os coeficientes femininos", () => {
    const pct = calcPercentualGordura({
      gender: "female",
      age: 28,
      triceps: 14,
      biceps: 12,
      subscapular: 18,
      suprailiac: 18,
    });
    expect(pct).toBe(29.9);
  });

  it("separa os sexos — o mesmo sumatório não dá o mesmo resultado", () => {
    const m = calcPercentualGordura({ gender: "male", age: 30, ...base });
    const f = calcPercentualGordura({ gender: "female", age: 30, ...base });
    expect(m).not.toBe(f);
    //%A mulher tem tipicamente percentual maior para a mesma espessura de dobras
    expect(f).toBeGreaterThan(m);
  });

  it("separa as faixas etárias", () => {
    const jovem = calcDensidadeCorporal({ gender: "male", age: 25, ...base });
    const idoso = calcDensidadeCorporal({ gender: "male", age: 55, ...base });
    expect(jovem).not.toBe(idoso);
  });

  it("percentual maior para maior sumatório de dobras", () => {
    const lean = calcPercentualGordura({
      gender: "male",
      age: 30,
      triceps: 4,
      biceps: 4,
      subscapular: 4,
      suprailiac: 4,
    });
    const heavy = calcPercentualGordura({
      gender: "male",
      age: 30,
      triceps: 12,
      biceps: 12,
      subscapular: 12,
      suprailiac: 12,
    });
    expect(heavy).toBeGreaterThan(lean);
  });

  it("devolve 0 sem dobras, em vez de NaN", () => {
    expect(
      calcPercentualGordura({
        gender: "male",
        age: 30,
        triceps: 0,
        biceps: 0,
        subscapular: 0,
        suprailiac: 0,
      }),
    ).toBe(0);
    expect(
      calcDensidadeCorporal({
        gender: "male",
        age: 30,
        triceps: 0,
        biceps: 0,
        subscapular: 0,
        suprailiac: 0,
      }),
    ).toBe(0);
  });

  it("classifica o percentual por sexo", () => {
    // Homens: 6-13% atlética, 14-17% aceitável
    expect(classificarGordura(12, "male")).toBe("Atlética");
    expect(classificarGordura(16, "male")).toBe("Aceitável");
    // Mulheres: abaixo de 16% essencial, 16-22% atlética, 23-29% aceitável
    expect(classificarGordura(20, "female")).toBe("Atlética");
    expect(classificarGordura(26, "female")).toBe("Aceitável");
  });

  it("calcula massa magra", () => {
    expect(calcMassaMagra(80, 20)).toBe(64);
  });
});

describe("calcPlanoAlimentar", () => {
  it("aplica déficit de 15% no emagrecimento", () => {
    const p = calcPlanoAlimentar({ goal: "lose", weightKg: 80, tdee: 2500 });
    expect(p.adjustmentPct).toBe(-15);
    expect(p.kcal).toBe(2130); // 2500 * 0.85 = 2125 -> arredondado para 2130
  });

  it("aplica excedente de 10% no ganho", () => {
    const p = calcPlanoAlimentar({ goal: "gain", weightKg: 80, tdee: 2500 });
    expect(p.adjustmentPct).toBe(10);
    expect(p.kcal).toBe(2750);
  });

  it("mantém o TDEE na manutenção", () => {
    expect(calcPlanoAlimentar({ goal: "maintain", weightKg: 80, tdee: 2500 }).kcal).toBe(2500);
  });

  it("mantém a soma de calorias dos macronutrientes próxima do total", () => {
    const p = calcPlanoAlimentar({ goal: "lose", weightKg: 80, tdee: 2500 });
    const total = p.proteinG * 4 + p.carbG * 4 + p.fatG * 9;
    expect(Math.abs(total - p.kcal) / p.kcal).toBeLessThan(0.05);
  });
});

describe("MEAL_SPLIT", () => {
  it("soma 100% das calorias", () => {
    expect(MEAL_SPLIT.reduce((acc, m) => acc + m.percent, 0)).toBe(100);
  });
});
