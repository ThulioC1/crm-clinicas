export type Role = "super_admin" | "professional";
export type AccountStatus = "active" | "blocked";
export type Plan = "pro" | "clinic";
export type Gender = "female" | "male";

/** Fatores de atividade física (Harris-Benedict revisado / OMS). */
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";

export type WeightGoal = "lose" | "maintain" | "gain";

export interface UserProfile {
  id: string; // = uid do Firebase Auth
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  specialty?: string;
  status: AccountStatus;
  plan: Plan;
  createdAt: string;
  mustChangePassword?: boolean;
  googleRefreshToken?: string;
  googleCalendarId?: string;
}

interface TenantDoc {
  id: string;
  tenantId: string;
  createdAt: string;
}

export interface Patient extends TenantDoc {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  notes: string;
  // Dados clínico-nutricionais — alimentam IEM, IMC, RCQ e taxonomia de gordura
  gender?: Gender | undefined;
  heightCm?: number | undefined;
  weightKg?: number | undefined;
  waistCm?: number | undefined;
  hipCm?: number | undefined;
  activityLevel?: ActivityLevel | undefined;
  goal?: WeightGoal | undefined;
}

/** Documento clínico assinado pelo profissional, pronto para impressão. */
export type DocumentKind = "prontuario" | "prescricao" | "atestado" | "declaracao";

/** Documentos editáveis e salvos por paciente (receita, plano alimentar). */
export type SavedDocKind = "prescricao" | "plano_alimentar";

export interface PrescriptionItem {
  name: string;
  dosage?: string;
  instructions?: string;
}

export interface SavedDocument extends TenantDoc {
  patientId: string;
  kind: SavedDocKind;
  items: PrescriptionItem[];
  notes: string;
  returnDate: string;
  updatedAt?: string;
}
export interface Appointment extends TenantDoc {
  patientId: string;
  date: string;
  time: string;
  duration: number;
  type: string;
}
export interface MedicalRecord extends TenantDoc {
  patientId: string;
  date: string;
  title: string;
  content: string;
}
