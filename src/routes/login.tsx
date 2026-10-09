import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — SaudePro" },
      { name: "description", content: "Acesse sua conta SaudePro." },
      { property: "og:title", content: "Entrar — SaudePro" },
      { property: "og:description", content: "Acesse sua conta SaudePro." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { loginEmail, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (p: UserProfile) =>
    navigate({ to: p.role === "super_admin" ? "/admin" : "/dashboard" });

  const run = async (fn: () => Promise<UserProfile>) => {
    setBusy(true);
    try {
      go(await fn());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    run(() => loginEmail(parsed.data.email, parsed.data.password));
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Entrar no SaudePro</h1>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6">
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button className="w-full" disabled={busy}>
            Entrar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => run(loginGoogle)}
          >
            Entrar com Google
          </Button>
        </form>
        {!isFirebaseConfigured && (
          <div className="mt-6 rounded-xl border border-dashed p-4 text-sm">
            <p className="font-semibold">Contas de demonstração</p>
            <div className="mt-3 grid gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => run(() => loginEmail("marina@saude.app", "demo123"))}
              >
                Profissional — Dra. Marina
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => run(() => loginEmail("admin@saude.app", "demo123"))}
              >
                Super Admin
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Senha de todas as contas: demo123</p>
          </div>
        )}
      </div>
    </div>
  );
}
