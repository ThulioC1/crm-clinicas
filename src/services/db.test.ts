import { describe, expect, it } from "vitest";
import { semIndefinidos, usersRepo } from "./db";
import type { UserProfile } from "@/lib/types";

const profissional = {
  id: "pro-1",
  name: "Dra. Marina Lopes",
  email: "marina@saude.app",
  role: "professional",
  tenantId: "pro-1",
  specialty: "nutricionista",
  status: "active",
  plan: "pro",
  createdAt: "2025-03-02",
} as UserProfile;

const admin = { ...profissional, id: "admin-1", role: "super_admin" } as UserProfile;

describe("usersRepo.update — permissões", () => {
  /** A guarda lanza "Acesso negado" antes de qualquer escrita. */
  const nega = async (
    caller: UserProfile,
    id: string,
    patch: Parameters<typeof usersRepo.update>[2],
  ) => {
    await expect(usersRepo.update(caller, id, patch)).rejects.toThrow("Acesso negado");
  };

  it("profissional não altera o próprio plano", async () => {
    await nega(profissional, profissional.id, { plan: "clinic" });
  });

  it("profissional não altera o próprio status", async () => {
    await nega(profissional, profissional.id, { status: "blocked" });
  });

  it("profissional não mexe em outro perfil, nem na especialidade", async () => {
    await nega(profissional, "outro-uid", { specialty: "medico" });
    await nega(profissional, "outro-uid", { plan: "clinic" });
  });

  it("profissional não combina especialidade com outro campo", async () => {
    // Passaria no teste "só especialidade", mas leva plano junto
    await nega(profissional, profissional.id, { specialty: "medico", plan: "clinic" });
  });

  it("admin não é barrado pela guarda em nenhum campo", async () => {
    // Não deve lançar "Acesso negado". Pode falhar depois por falta de sessão
    // no emulador — o que prova que a guarda deixou passar.
    for (const patch of [
      { plan: "clinic" },
      { status: "blocked" },
      { specialty: "medico" },
    ] as const) {
      await usersRepo.update(admin, profissional.id, patch).catch((e: Error) => {
        expect(e.message).not.toBe("Acesso negado");
      });
    }
  });

  it("profissional passa da guarda ao editar a própria especialidade", async () => {
    await usersRepo
      .update(profissional, profissional.id, { specialty: "fisioterapeuta" })
      .catch((e: Error) => {
        expect(e.message).not.toBe("Acesso negado");
      });
  });
});

describe("semIndefinidos", () => {
  it("omite chaves com valor undefined", () => {
    // O Firestore rejeita `undefined` com "Unsupported field value: undefined"
    expect(semIndefinidos({ a: 1, gender: undefined })).toEqual({ a: 1 });
    expect(Object.keys(semIndefinidos({ a: 1, gender: undefined }))).not.toContain("gender");
  });

  it("mantém os demais valores, incluindo falsy", () => {
    // false, 0 e "" são valores válidos no Firestore e não podem ser removidos
    const r = semIndefinidos({ flag: false, zero: 0, vazio: "", nulo: null, ok: "x" });
    expect(r).toEqual({ flag: false, zero: 0, vazio: "", nulo: null, ok: "x" });
  });

  it("remove todas as chaves indefinidas de um formulário de paciente", () => {
    const form = {
      name: "Ana",
      email: "",
      phone: "(85) 98888-0000",
      birthDate: "1990-05-10",
      notes: "",
      gender: undefined,
      heightCm: undefined,
      weightKg: undefined,
      waistCm: undefined,
      hipCm: undefined,
      activityLevel: undefined,
      goal: undefined,
    };
    const r = semIndefinidos(form);
    expect(Object.keys(r).sort()).toEqual(["birthDate", "email", "name", "notes", "phone"].sort());
  });

  it("preserva valores preenchidos", () => {
    const r = semIndefinidos({ gender: "female", heightCm: 165, weightKg: 62 });
    expect(r).toEqual({ gender: "female", heightCm: 165, weightKg: 62 });
  });

  it("não altera o objeto original", () => {
    const original = { a: 1, b: undefined };
    semIndefinidos(original);
    expect("b" in original).toBe(true);
  });
});
