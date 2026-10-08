import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider, isFirebaseConfigured } from "./firebase";
import { usersRepo } from "@/services/db";
import type { UserProfile } from "./types";

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  loginEmail: (email: string, password: string) => Promise<UserProfile>;
  loginGoogle: () => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
const DEMO_KEY = "demo-session-uid";

async function loadProfile(uid: string, email: string, name: string): Promise<UserProfile> {
  const ref = doc(db!, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: uid, ...snap.data() } as UserProfile;
  // Primeiro login: cria perfil como profissional (permitido pelas Security Rules)
  const profile: Omit<UserProfile, "id"> = {
    name, email, role: "professional", tenantId: uid, status: "active", plan: "free",
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
        setUser(fbUser ? await loadProfile(fbUser.uid, fbUser.email ?? "", fbUser.displayName ?? "") : null);
        setLoading(false);
      });
    }
    const uid = sessionStorage.getItem(DEMO_KEY);
    setUser(uid ? usersRepo.getMock(uid) ?? null : null);
    setLoading(false);
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
        const p = guard(await loadProfile(cred.user.uid, cred.user.email ?? "", cred.user.displayName ?? ""));
        setUser(p);
        return p;
      }
      throw new Error("Login com Google disponível após configurar o Firebase.");
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
