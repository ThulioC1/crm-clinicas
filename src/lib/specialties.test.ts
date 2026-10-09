import { describe, expect, it } from "vitest";
import { SPECIALTIES, hasModule, modulesFor, resolveSpecialty } from "./specialties";

describe("resolveSpecialty", () => {
  it("reconhece ids exatos", () => {
    expect(resolveSpecialty("nutricionista").id).toBe("nutricionista");
    expect(resolveSpecialty("fisioterapeuta").id).toBe("fisioterapeuta");
    expect(resolveSpecialty("psicologo").id).toBe("psicologo");
    expect(resolveSpecialty("personal_trainer").id).toBe("personal_trainer");
    expect(resolveSpecialty("medico").id).toBe("medico");
  });

  it("normaliza acentos e caixa do texto livre", () => {
    expect(resolveSpecialty("Nutricionista").id).toBe("nutricionista");
    expect(resolveSpecialty("  NUTRICIONISTA  ").id).toBe("nutricionista");
  });

  it("cai para 'outro' quando a profissão é desconhecida ou vazia", () => {
    expect(resolveSpecialty("dentista").id).toBe("outro");
    expect(resolveSpecialty(undefined).id).toBe("outro");
    expect(resolveSpecialty("").id).toBe("outro");
  });
});

describe("modulesFor / hasModule", () => {
  it("dá ao nutricionista o módulo de avaliação nutricional", () => {
    expect(modulesFor("nutricionista")).toContain("avaliacao_nutricional");
  });

  it("não dá ao psicólogo o módulo nutricional", () => {
    expect(modulesFor("psicologo")).not.toContain("avaliacao_nutricional");
    expect(hasModule("psicologo", "avaliacao_nutricional")).toBe(false);
  });

  it("todos têm prontuário", () => {
    for (const s of Object.values(SPECIALTIES)) {
      expect(s.modules).toContain("prontuario");
    }
  });

  it("todo módulo habilitado pertence a alguma especialidade", () => {
    const todos = new Set(Object.values(SPECIALTIES).flatMap((s) => s.modules));
    for (const s of Object.values(SPECIALTIES)) {
      for (const m of s.modules) expect(todos.has(m)).toBe(true);
    }
  });
});
