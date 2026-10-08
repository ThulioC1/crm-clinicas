import { useAuth } from "@/lib/auth";
import { appointmentsRepo, patientsRepo, recordsRepo } from "@/services/db";
import { useLive } from "./use-tenant-data";

export function useTenantId() {
  const { user } = useAuth();
  return user?.tenantId ?? "";
}

export function usePatients() {
  const t = useTenantId();
  return useLive(patientsRepo, () => patientsRepo.list(t), [t]);
}
export function useAppointments() {
  const t = useTenantId();
  return useLive(appointmentsRepo, () => appointmentsRepo.list(t), [t]);
}
export function useRecords() {
  const t = useTenantId();
  return useLive(recordsRepo, () => recordsRepo.list(t), [t]);
}
