import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/schemas";

export const Route = createFileRoute("/trocar-senha")({
  head: () => ({
    meta: [
      { title: "Definir nova senha — SaudePro" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { property: "og:title", content: "Definir nova senha — SaudePro" },
      { property: "og:description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: TrocarSenhaPage,
});

function TrocarSenhaPage() {
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setBusy(true);
    try {
      await changePassword(parsed.data.newPassword);
      toast.success("Senha atualizada com sucesso");
      navigate({ to: user?.role === "super_admin" ? "/admin" : "/dashboard" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Definir nova senha</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Por segurança, defina uma senha definitiva para continuar.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={busy}>
            Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  );
}
