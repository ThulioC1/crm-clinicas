import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db, googleProvider, isFirebaseConfigured } from "./firebase";
import { usersRepo } from "@/services/db";
import type { UserProfile } from "./types";

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<UserProfile>;
  loginGoogle: () => Promise<UserProfile>;
  changePassword: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
const DEMO_KEY = "demo-session-uid";

/**
 * Cria a conta no Firebase Auth pela REST API. O SDK do cliente só cria contas
 * para o próprio usuário, então usamos o endpoint signUp diretamente — assim a
 * sessão do admin que está criando o registro não é alterada.
 * A senha é aleatória: o profissional redefine a própria senha pelo e-mail.
 */
export async function createAuthAccount(email: string): Promise<void> {
  const apiKey = import.meta.env["VITE_FIREBASE_API_KEY"] as string | undefined;
  if (!apiKey) throw new Error("Firebase não configurado.");

  const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: tempPassword, returnSecureToken: true }),
    },
  );

  if (res.ok) return;
  const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  const message = err?.error?.message ?? "";
  if (message.includes("EMAIL_EXISTS")) throw new Error("Já existe uma conta com este e-mail.");
  if (message.includes("OPERATION_NOT_ALLOWED")) {
    throw new Error("Ative o login por e-mail/senha no Firebase Console → Authentication.");
  }
  if (message.includes("INVALID_EMAIL")) throw new Error("E-mail inválido.");
  throw new Error("Não foi possível criar a conta no Firebase Auth.");
}

/**
 * As Security Rules exigem o perfil em users/{uid}. Enquanto o profissional não
 * entra, o documento criado pelo admin (id aleatório) fica inacessível para ele —
 * por isso mantemos role/status aqui e removemos o documento assim que a conta
 * é criada pela primeira vez.
 */
async function clearPendingProfile(uid: string, email: string) {
  if (!db) return;
  const snap = await getDocs(query(collection(db, "users"), where("email", "==", email)));
  await Promise.all(snap.docs.filter((d) => d.id !== uid).map((d) => deleteDoc(d.ref)));
}

async function loadProfile(uid: string, email: string, name: string): Promise<UserProfile> {
  const ref = doc(db!, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: uid, ...snap.data() } as UserProfile;

  await clearPendingProfile(uid, email);
  // Primeiro acesso: cria perfil como profissional (permitido pelas Security Rules)
  const profile: Omit<UserProfile, "id"> = {
    name,
    email,
    role: "professional",
    tenantId: uid,
    status: "active",
    plan: "pro",
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, profile);
  return { id: uid, ...profile };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, async (fbUser) => {
        setUser(
          fbUser
            ? await loadProfile(fbUser.uid, fbUser.email ?? "", fbUser.displayName ?? "")
            : null,
        );
        setLoading(false);
      });
    }
    const uid = sessionStorage.getItem(DEMO_KEY);
    setUser(uid ? (usersRepo.getMock(uid) ?? null) : null);
    setLoading(false);
    return undefined;
  }, []);

  const guard = (p: UserProfile) => {
    if (p.status === "blocked") throw new Error("Conta bloqueada. Contate o suporte.");
    return p;
  };

  const value: AuthState = {
    user,
    loading,
    async loginEmail(email, password) {
      if (isFirebaseConfigured && auth) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const p = guard(await loadProfile(cred.user.uid, email, cred.user.displayName ?? ""));
        setUser(p);
        return p;
      }
      const p = usersRepo.findMock(email);
      if (!p || password !== "demo123") throw new Error("E-mail ou senha inválidos");
      guard(p);
      sessionStorage.setItem(DEMO_KEY, p.id);
      setUser(p);
      return p;
    },
    async loginGoogle() {
      if (isFirebaseConfigured && auth) {
        const cred = await signInWithPopup(auth, googleProvider);
        const p = guard(
          await loadProfile(cred.user.uid, cred.user.email ?? "", cred.user.displayName ?? ""),
        );
        setUser(p);
        return p;
      }
      throw new Error("Login com Google disponível após configurar o Firebase.");
    },
    async changePassword(newPassword) {
      if (!isFirebaseConfigured || !auth) throw new Error("Firebase não configurado.");
      const current = auth.currentUser;
      if (!current) throw new Error("Sessão expirada. Entre novamente.");
      await updatePassword(current, newPassword);
      // A flag fica no Firestore: forces a troca na próxima entrada
      if (current.uid) {
        await updateDoc(doc(db!, "users", current.uid), { mustChangePassword: false });
        setUser((u) => (u ? { ...u, mustChangePassword: false } : u));
      }
    },
    async logout() {
      if (isFirebaseConfigured && auth) await signOut(auth);
      sessionStorage.removeItem(DEMO_KEY);
      setUser(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
