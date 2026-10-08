import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255).or(z.literal("")),
  phone: z.string().trim().min(8, "Telefone inválido").max(20),
  birthDate: z.string().min(1, "Informe a data de nascimento"),
  notes: z.string().trim().max(1000).optional().default(""),
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
