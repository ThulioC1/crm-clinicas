import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type { Appointment, MedicalRecord, Patient, UserProfile } from "@/lib/types";
import { mockAppointments, mockPatients, mockRecords, mockUsers } from "./mock-data";

type TenantEntity = { id: string; tenantId: string; createdAt: string };
type Listener = () => void;

/**
 * Repositório multi-tenant. TODA leitura exige tenantId e filtra por ele.
 * Com Firebase configurado usa Firestore; caso contrário, um store em memória.
 */
function createTenantRepo<T extends TenantEntity>(name: string, seed: T[]) {
  let store = [...seed];
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());

  const assertTenant = (tenantId: string) => {
    if (!tenantId) throw new Error(`Consulta em "${name}" sem tenantId bloqueada.`);
  };

  return {
    subscribe(l: Listener) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },

    async list(tenantId: string): Promise<T[]> {
      assertTenant(tenantId);
      if (isFirebaseConfigured && db) {
        const q = query(
          collection(db, name),
          where("tenantId", "==", tenantId),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        return snap.docs.map((s) => ({ id: s.id, ...s.data() }) as T);
      }
      return store.filter((x) => x.tenantId === tenantId);
    },

    async create(tenantId: string, data: Omit<T, "id" | "tenantId" | "createdAt">): Promise<void> {
      assertTenant(tenantId);
      const payload = { ...data, tenantId, createdAt: new Date().toISOString() };
      if (isFirebaseConfigured && db) await addDoc(collection(db, name), payload);
      else store = [{ ...(payload as unknown as T), id: crypto.randomUUID() }, ...store];
      emit();
    },

    async update(tenantId: string, id: string, data: Partial<Omit<T, "id" | "tenantId">>) {
      assertTenant(tenantId);
      if (isFirebaseConfigured && db)
        await updateDoc(doc(db, name, id), data as Record<string, unknown>);
      else
        store = store.map((x) => (x.id === id && x.tenantId === tenantId ? { ...x, ...data } : x));
      emit();
    },

    async remove(tenantId: string, id: string) {
      assertTenant(tenantId);
      if (isFirebaseConfigured && db) await deleteDoc(doc(db, name, id));
      else store = store.filter((x) => !(x.id === id && x.tenantId === tenantId));
      emit();
    },
  };
}

export const patientsRepo = createTenantRepo<Patient>("patients", mockPatients);
export const appointmentsRepo = createTenantRepo<Appointment>("appointments", mockAppointments);
export const recordsRepo = createTenantRepo<MedicalRecord>("medical_records", mockRecords);

/** Coleção global `users` — apenas super_admin (garantido também pelas Security Rules). */
let users = [...mockUsers];
const userListeners = new Set<Listener>();
export const usersRepo = {
  subscribe(l: Listener) {
    userListeners.add(l);
    return () => {
      userListeners.delete(l);
    };
  },
  async listAll(caller: UserProfile): Promise<UserProfile[]> {
    if (caller.role !== "super_admin") throw new Error("Acesso negado");
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, "users"));
      return snap.docs.map((s) => ({ id: s.id, ...s.data() }) as UserProfile);
    }
    return users;
  },
  async create(
    caller: UserProfile,
    data: Omit<UserProfile, "id" | "createdAt">,
  ): Promise<string> {
    if (caller.role !== "super_admin") throw new Error("Acesso negado");
    const payload = { ...data, createdAt: new Date().toISOString() };
    let newId: string;
    if (isFirebaseConfigured && db) {
      const ref = doc(collection(db, "users"));
      newId = ref.id;
      await setDoc(ref, { ...payload, id: newId });
    } else {
      newId = crypto.randomUUID();
      users = [{ ...payload, id: newId }, ...users];
    }
    userListeners.forEach((l) => l());
    return newId;
  },
  async update(
    caller: UserProfile,
    id: string,
    data: Partial<Pick<UserProfile, "status" | "plan" | "googleRefreshToken" | "googleCalendarId">>,
  ) {
    if (caller.role !== "super_admin") throw new Error("Acesso negado");
    if (isFirebaseConfigured && db) await updateDoc(doc(db, "users", id), data);
    else users = users.map((u) => (u.id === id ? { ...u, ...data } : u));
    userListeners.forEach((l) => l());
  },
  findMock(email: string) {
    return users.find((u) => u.email === email);
  },
  getMock(id: string) {
    return users.find((u) => u.id === id);
  },
};
