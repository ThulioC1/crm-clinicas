import { describe, expect, it } from "vitest";
import { patientSchema } from "./schemas";

const base = {
  name: "Ana Beatriz Costa",
  email: "",
  phone: "(85) 98888-0000",
  birthDate: "1990-05-10",
  notes: "",
};

describe("patientSchema — campos opcionais vazios", () => {
  it("aceita o formulário sem nenhum dado clínico preenchido", () => {
    const r = patientSchema.safeParse({
      ...base,
      gender: "",
      heightCm: "",
      weightKg: "",
      waistCm: "",
      hipCm: "",
      activityLevel: "",
      goal: "",
    });
    expect(r.success).toBe(true);
  });

  it("converte string vazia em ausente, não em valor inválido", () => {
    const r = patientSchema.safeParse({ ...base, gender: "", heightCm: "", weightKg: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.gender).toBeUndefined();
      expect(r.data.heightCm).toBeUndefined();
      expect(r.data.weightKg).toBeUndefined();
    }
  });

  it("não transforma campo numérico vazio em zero", () => {
    // Number("") === 0, que reprovaria no .min(50) da altura
    const r = patientSchema.safeParse({ ...base, heightCm: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.heightCm).toBeUndefined();
  });

  it("aceita null como ausente", () => {
    const r = patientSchema.safeParse({ ...base, gender: null, heightCm: null });
    expect(r.success).toBe(true);
  });

  it("preserva os valores quando preenchidos", () => {
    const r = patientSchema.safeParse({
      ...base,
      gender: "female",
      heightCm: "165",
      weightKg: "62",
      waistCm: "78",
      hipCm: "100",
      activityLevel: "light",
      goal: "lose",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.gender).toBe("female");
      expect(r.data.heightCm).toBe(165);
      expect(r.data.weightKg).toBe(62);
      expect(r.data.activityLevel).toBe("light");
      expect(r.data.goal).toBe("lose");
    }
  });
});

describe("patientSchema — validações que continuam valendo", () => {
  it("reprova sexo desconhecido", () => {
    const r = patientSchema.safeParse({ ...base, gender: "outro" });
    expect(r.success).toBe(false);
  });

  it("reprova altura fora da faixa", () => {
    expect(patientSchema.safeParse({ ...base, heightCm: "10" }).success).toBe(false);
    expect(patientSchema.safeParse({ ...base, heightCm: "300" }).success).toBe(false);
  });

  it("reprova peso fora da faixa", () => {
    expect(patientSchema.safeParse({ ...base, weightKg: "0" }).success).toBe(false);
    expect(patientSchema.safeParse({ ...base, weightKg: "500" }).success).toBe(false);
  });

  it("exige nome, telefone e nascimento", () => {
    expect(patientSchema.safeParse({ ...base, name: "Ab" }).success).toBe(false);
    expect(patientSchema.safeParse({ ...base, phone: "123" }).success).toBe(false);
    expect(patientSchema.safeParse({ ...base, birthDate: "" }).success).toBe(false);
  });

  it("aceita e-mail vazio mas reprova e-mail malformado", () => {
    expect(patientSchema.safeParse({ ...base, email: "" }).success).toBe(true);
    expect(patientSchema.safeParse({ ...base, email: "nao-e-email" }).success).toBe(false);
  });
});
