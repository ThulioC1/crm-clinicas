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
  type QuerySnapshot,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type {
  Appointment,
  MedicalRecord,
  Patient,
  PrescriptionItem,
  SavedDocument,
  UserProfile,
} from "@/lib/types";
import { mockAppointments, mockPatients, mockRecords, mockUsers } from "./mock-data";

type TenantEntity = { id: string; tenantId: string; createdAt: string };
type Listener = () => void;

/** `createdAt` é string ISO, então a ordenação textual já equivale à cronológica. */
const byCreatedAtDesc = (a: TenantEntity, b: TenantEntity) =>
  b.createdAt.localeCompare(a.createdAt);

const warnedCollections = new Set<string>();

/**
 * O Firestore rejeita `undefined` ("Unsupported field value: undefined").
 * Campo opcional não preenchido precisa ser omitido do documento, não enviado
 * como undefined — daí este filtro antes de qualquer escrita.
 */
export function semIndefinidos<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function isMissingIndexError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code ?? "";
  return code === "failed-precondition" || code === "unimplemented";
}

/** Avisa uma única vez por coleção, para não inundar o console a cada render. */
function warnMissingIndex(name: string): void {
  if (warnedCollections.has(name)) return;
  warnedCollections.add(name);
  console.warn(
    `[saudepro] Falta o índice composto de "${name}" (tenantId + createdAt). ` +
      `Rodando sem ele: os dados aparecem ordenados no cliente. ` +
      `Para corrigir: firebase deploy --only firestore:indexes`,
  );
}

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
        const col = collection(db, name);
        const map = (snap: QuerySnapshot) => snap.docs.map((s) => ({ id: s.id, ...s.data() }) as T);
        try {
          const snap = await getDocs(
            query(col, where("tenantId", "==", tenantId), orderBy("createdAt", "desc")),
          );
          return map(snap);
        } catch (e) {
          // Índice composto (tenantId + createdAt) ainda não publicado.
          // Cai para a consulta só por tenant e ordena no cliente, para o app
          // continuar funcionando antes do deploy do índice.
          if (!isMissingIndexError(e)) throw e;
          warnMissingIndex(name);
          const snap = await getDocs(query(col, where("tenantId", "==", tenantId)));
          return map(snap).sort(byCreatedAtDesc);
        }
      }
      return store.filter((x) => x.tenantId === tenantId);
    },

    async create(tenantId: string, data: Omit<T, "id" | "tenantId" | "createdAt">): Promise<void> {
      assertTenant(tenantId);
      const payload = semIndefinidos({ ...data, tenantId, createdAt: new Date().toISOString() });
      if (isFirebaseConfigured && db) await addDoc(collection(db, name), payload);
      else store = [{ ...(payload as unknown as T), id: crypto.randomUUID() }, ...store];
      emit();
    },

    async update(tenantId: string, id: string, data: Partial<Omit<T, "id" | "tenantId">>) {
      assertTenant(tenantId);
      const patch = semIndefinidos(data);
      if (isFirebaseConfigured && db)
        await updateDoc(doc(db, name, id), patch as Record<string, unknown>);
      else
        store = store.map((x) => (x.id === id && x.tenantId === tenantId ? { ...x, ...patch } : x));
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

/**
 * Documentos editáveis por paciente (receita, plano alimentar).
 *
 * O Firestore exige um índice para a ordenação por `updatedAt`; por isso o
 * repositório cai para a ordenação no cliente enquanto o índice não existe,
 * igual a `createTenantRepo`.
 */
const savedDocsRepo = createTenantRepo<SavedDocument>("clinical_documents", []);

export const patientDocsRepo = {
  subscribe: savedDocsRepo.subscribe,
  async list(tenantId: string, patientId: string): Promise<SavedDocument[]> {
    return (await savedDocsRepo.list(tenantId)).filter((d) => d.patientId === patientId);
  },
  async save(
    tenantId: string,
    data: Pick<SavedDocument, "id" | "patientId" | "kind" | "items" | "notes" | "returnDate">,
  ): Promise<void> {
    await savedDocsRepo.update(tenantId, data.id, {
      patientId: data.patientId,
      kind: data.kind,
      items: data.items,
      notes: data.notes,
      returnDate: data.returnDate,
      updatedAt: new Date().toISOString(),
    } as Partial<SavedDocument>);
  },
  /** Documento existente do paciente para aquele tipo, se houver. */
  async find(tenantId: string, patientId: string, kind: SavedDocument["kind"]) {
    const docs = await this.list(tenantId, patientId);
    return docs.find((d) => d.kind === kind) ?? null;
  },
  /** Cria se ainda não existir e devolve o id. */
  async ensureId(
    tenantId: string,
    patientId: string,
    kind: SavedDocument["kind"],
  ): Promise<string> {
    const existing = await this.find(tenantId, patientId, kind);
    if (existing) return existing.id;
    const payload = {
      patientId,
      kind,
      items: [] as PrescriptionItem[],
      notes: "",
      returnDate: "",
    };
    await savedDocsRepo.create(tenantId, payload);
    const criado = await this.find(tenantId, patientId, kind);
    if (!criado) throw new Error("Não foi possível criar o documento.");
    return criado.id;
  },
};

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
  async create(caller: UserProfile, data: Omit<UserProfile, "id" | "createdAt">): Promise<string> {
    if (caller.role !== "super_admin") throw new Error("Acesso negado");
    const payload = semIndefinidos({ ...data, createdAt: new Date().toISOString() });
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
    data: Partial<
      Pick<UserProfile, "status" | "plan" | "specialty" | "googleRefreshToken" | "googleCalendarId">
    >,
  ) {
    // Admin gerencia qualquer perfil; o profissional só ajusta a própria especialidade.
    const proprio = caller.id === id;
    const soEspecialidade = Object.keys(data).every((k) => k === "specialty");
    if (caller.role !== "super_admin" && !(proprio && soEspecialidade)) {
      throw new Error("Acesso negado");
    }
    const patch = semIndefinidos(data);
    if (isFirebaseConfigured && db) await updateDoc(doc(db, "users", id), patch);
    else users = users.map((u) => (u.id === id ? { ...u, ...patch } : u));
    userListeners.forEach((l) => l());
  },
  async remove(caller: UserProfile, id: string) {
    if (caller.role !== "super_admin") throw new Error("Acesso negado");
    if (isFirebaseConfigured && db) await deleteDoc(doc(db, "users", id));
    else users = users.filter((u) => u.id !== id);
    userListeners.forEach((l) => l());
  },
  findMock(email: string) {
    return users.find((u) => u.email === email);
  },
  getMock(id: string) {
    return users.find((u) => u.id === id);
  },
};
