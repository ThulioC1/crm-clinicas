import { z } from "zod";

/**
 * Campos opcionais do formulário vêm como string vazia quando o usuário não
 * preenche (o <Select> e o <Input type="number"> partem vazios).
 * Sem tratar isso, "" reprova num z.enum() e `z.coerce.number()` transforma
 * "" em 0 — o que dispara "Altura inválido" em campo em branco.
 */
const vazioParaUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

/** Seleção opcional: vazio vira ausente. `const` preserva os tipos literais. */
const enumOpcional = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(vazioParaUndefined, z.enum(values).optional());

/** Medida opcional: vazio vira ausente, em vez de virar 0. */
const numeroOpcional = (min: number, max: number, mensagem: string) =>
  z.preprocess(vazioParaUndefined, z.coerce.number().min(min, mensagem).max(max).optional());

export const patientSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255).or(z.literal("")),
  phone: z.string().trim().min(8, "Telefone inválido").max(20),
  birthDate: z.string().min(1, "Informe a data de nascimento"),
  notes: z.string().trim().max(1000).optional().default(""),
  gender: enumOpcional(["female", "male"]),
  heightCm: numeroOpcional(50, 260, "Altura inválida"),
  weightKg: numeroOpcional(2, 400, "Peso inválido"),
  waistCm: numeroOpcional(20, 250, "Cintura inválida"),
  hipCm: numeroOpcional(20, 250, "Quadril inválido"),
  activityLevel: enumOpcional(["sedentary", "light", "moderate", "active", "athlete"]),
  goal: enumOpcional(["lose", "maintain", "gain"]),
});
export type PatientInput = z.infer<typeof patientSchema>;

export const appointmentSchema = z.object({
  patientId: z.string().min(1, "Selecione o paciente"),
  date: z.string().min(1, "Informe a data"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  duration: z.coerce.number().int().min(15).max(240),
  type: z.string().trim().min(2).max(60),
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const recordSchema = z.object({
  patientId: z.string().min(1, "Selecione o paciente"),
  date: z.string().min(1, "Informe a data"),
  title: z.string().trim().min(3, "Título muito curto").max(120),
  content: z.string().trim().min(10, "Descreva a evolução").max(5000),
});
export type RecordInput = z.infer<typeof recordSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo de 6 caracteres").max(72),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Mínimo de 6 caracteres").max(72),
    confirmPassword: z.string().min(6, "Mínimo de 6 caracteres").max(72),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const professionalSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  specialty: z.string().trim().min(2, "Informe a especialidade").max(80),
  plan: z.enum(["pro", "clinic"]),
});
export type ProfessionalInput = z.infer<typeof professionalSchema>;
