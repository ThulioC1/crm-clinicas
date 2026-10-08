import type { Appointment, MedicalRecord, Patient, UserProfile } from "@/lib/types";

const today = new Date();
const d = (offset: number) => {
  const x = new Date(today);
  x.setDate(x.getDate() + offset);
  return x.toISOString().slice(0, 10);
};

export const mockUsers: UserProfile[] = [
  { id: "admin-1", name: "Admin da Plataforma", email: "admin@saude.app", role: "super_admin", tenantId: "admin-1", status: "active", plan: "clinic", createdAt: "2025-01-10" },
  { id: "pro-1", name: "Dra. Marina Lopes", email: "marina@saude.app", role: "professional", tenantId: "pro-1", specialty: "Nutricionista", status: "active", plan: "pro", createdAt: "2025-03-02" },
  { id: "pro-2", name: "Rafael Souza", email: "rafael@saude.app", role: "professional", tenantId: "pro-2", specialty: "Fisioterapeuta", status: "active", plan: "free", createdAt: "2025-05-18" },
  { id: "pro-3", name: "Camila Duarte", email: "camila@saude.app", role: "professional", tenantId: "pro-3", specialty: "Personal Trainer", status: "blocked", plan: "free", createdAt: "2025-07-21" },
  { id: "pro-4", name: "Dr. Henrique Alves", email: "henrique@saude.app", role: "professional", tenantId: "pro-4", specialty: "Psicólogo", status: "active", plan: "clinic", createdAt: "2025-08-05" },
];

const names = ["Ana Beatriz Costa", "Bruno Ferreira", "Carla Mendes", "Diego Ramos", "Eduarda Lima", "Felipe Nogueira", "Gabriela Rocha", "Hugo Martins", "Isabela Pires", "João Pedro Silva", "Larissa Gomes", "Mateus Carvalho"];

export const mockPatients: Patient[] = names.map((name, i) => ({
  id: `pat-${i + 1}`,
  tenantId: i < 9 ? "pro-1" : "pro-2",
  name,
  email: `${(name.split(" ")[0] ?? "").toLowerCase()}@email.com`,
  phone: `(85) 9${8000 + i * 37}-${1000 + i * 91}`,
  birthDate: `19${80 + i}-0${(i % 9) + 1}-1${i % 9}`,
  notes: i % 3 === 0 ? "Restrição a lactose." : "",
  createdAt: d(-60 + i),
}));

const types = ["Consulta inicial", "Retorno", "Avaliação", "Acompanhamento"];
export const mockAppointments: Appointment[] = Array.from({ length: 14 }, (_, i) => ({
  id: `apt-${i + 1}`,
  tenantId: i < 11 ? "pro-1" : "pro-2",
  patientId: i < 11 ? `pat-${(i % 9) + 1}` : `pat-${10 + (i % 3)}`,
  date: d((i % 7) - 1),
  time: `${String(8 + (i % 9)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
  duration: i % 3 === 0 ? 60 : 45,
  type: types[i % 4] ?? "Consulta",
  createdAt: d(-5),
}));

export const mockRecords: MedicalRecord[] = [
  { id: "rec-1", tenantId: "pro-1", patientId: "pat-1", date: d(-14), title: "Avaliação inicial", content: "Paciente relata cansaço no período da tarde. Peso 68kg, altura 1,65m. Proposto plano alimentar com fracionamento em 5 refeições.", createdAt: d(-14) },
  { id: "rec-2", tenantId: "pro-1", patientId: "pat-1", date: d(-3), title: "Retorno 1", content: "Boa adesão ao plano. Redução de 1,2kg. Ajuste no lanche da tarde com inclusão de proteína.", createdAt: d(-3) },
  { id: "rec-3", tenantId: "pro-1", patientId: "pat-2", date: d(-7), title: "Consulta inicial", content: "Objetivo de hipertrofia. Treina 4x por semana. Calculado gasto energético e distribuição de macronutrientes.", createdAt: d(-7) },
  { id: "rec-4", tenantId: "pro-2", patientId: "pat-10", date: d(-2), title: "Sessão 3 — lombar", content: "Dor lombar reduzida de 7 para 4 (EVA). Mantidos exercícios de estabilização e alongamento.", createdAt: d(-2) },
];
