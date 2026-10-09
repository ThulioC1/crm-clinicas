/**
 * Registro de especialidades.
 *
 * Cada especialidade declara os módulos disponíveis no painel. A UI lê daqui
 * para montar o menu e habilitar/desabilitar ferramentas, de modo que adicionar
 * uma profissão nova é uma entrada neste arquivo — sem mexer nas rotas.
 */

export type SpecialtyId =
  "nutricionista" | "fisioterapeuta" | "psicologo" | "personal_trainer" | "medico" | "outro";

export type ModuleId =
  "avaliacao_nutricional" | "eav" | "psicometria" | "carga_1rm" | "cid10" | "prontuario";

export interface Specialty {
  id: SpecialtyId;
  label: string;
  /** Registro profissional exibido nos documentos (ex.: CRN, CREFITO, CRM). */
  registerLabel: string;
  modules: ModuleId[];
  /** Campos clínicos que o módulo precisa do paciente ter preenchidos. */
  requiredPatientFields: ("gender" | "heightCm" | "weightKg" | "birthDate")[];
}

export const SPECIALTIES: Record<SpecialtyId, Specialty> = {
  nutricionista: {
    id: "nutricionista",
    label: "Nutricionista",
    registerLabel: "CRN",
    modules: ["avaliacao_nutricional", "prontuario"],
    requiredPatientFields: ["gender", "heightCm", "weightKg", "birthDate"],
  },
  fisioterapeuta: {
    id: "fisioterapeuta",
    label: "Fisioterapeuta",
    registerLabel: "CREFITO",
    modules: ["eav", "prontuario"],
    requiredPatientFields: ["gender", "heightCm", "weightKg", "birthDate"],
  },
  psicologo: {
    id: "psicologo",
    label: "Psicólogo",
    registerLabel: "CRP",
    modules: ["psicometria", "prontuario"],
    requiredPatientFields: ["birthDate"],
  },
  personal_trainer: {
    id: "personal_trainer",
    label: "Personal Trainer",
    registerLabel: "CREF",
    modules: ["carga_1rm", "avaliacao_nutricional", "prontuario"],
    requiredPatientFields: ["gender", "heightCm", "weightKg", "birthDate"],
  },
  medico: {
    id: "medico",
    label: "Médico",
    registerLabel: "CRM",
    modules: ["cid10", "prontuario"],
    requiredPatientFields: ["gender", "heightCm", "weightKg", "birthDate"],
  },
  outro: {
    id: "outro",
    label: "Outro",
    registerLabel: "Registro",
    modules: ["prontuario"],
    requiredPatientFields: ["birthDate"],
  },
};

export const SPECIALTY_OPTIONS: { value: SpecialtyId; label: string }[] = Object.values(
  SPECIALTIES,
).map((s) => ({ value: s.id, label: s.label }));

/** Normaliza o texto livre do campo `specialty` para um id conhecido. */
export function resolveSpecialty(specialty?: string): Specialty {
  if (!specialty) return SPECIALTIES.outro;
  const normalized = specialty.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const found = Object.values(SPECIALTIES).find((s) => s.id === normalized);
  return found ?? SPECIALTIES.outro;
}

/** Módulos habilitados para a especialidade informada. */
export function modulesFor(specialty?: string): ModuleId[] {
  return resolveSpecialty(specialty).modules;
}

export function hasModule(specialty: string | undefined, module: ModuleId): boolean {
  return modulesFor(specialty).includes(module);
}
