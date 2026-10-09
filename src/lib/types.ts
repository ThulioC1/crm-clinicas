export type Role = "super_admin" | "professional";
export type AccountStatus = "active" | "blocked";
export type Plan = "pro" | "clinic";

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
