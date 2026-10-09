import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usersRepo } from "@/services/db";
import { useAuth } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";

interface CallbackSearch {
  code?: string;
  state?: string;
  error?: string;
}

export const Route = createFileRoute("/auth/google/callback")({
  ssr: false,
  component: GoogleCallback,
  validateSearch: (search: unknown) => search as CallbackSearch,
});

function GoogleCallback() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as CallbackSearch;
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function handleCallback() {
      const code = search.code;
      const state = search.state;
      const error = search.error;

      if (error) {
        setStatus("error");
        setMessage(`Erro do Google: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Parâmetros inválidos. Tente novamente.");
        return;
      }

      if (!isFirebaseConfigured) {
        setStatus("error");
        setMessage("Firebase não configurado. Configure as variáveis de ambiente.");
        return;
      }

      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: import.meta.env["VITE_GOOGLE_CLIENT_ID"]!,
            client_secret: import.meta.env["GOOGLE_CLIENT_SECRET"]!,
            redirect_uri: `${import.meta.env["VITE_APP_URL"] || window.location.origin}/auth/google/callback`,
            grant_type: "authorization_code",
          }),
        });

        const tokens = await tokenRes.json();
        if (!tokenRes.ok)
          throw new Error(tokens.error_description || "Falha ao trocar código por token");

        const { refresh_token, access_token } = tokens;
        if (!refresh_token)
          throw new Error("Google não retornou refresh_token. Revogue o acesso e tente novamente.");

        const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const calData = await calRes.json();
        const calendarId = calData.id || "primary";

        await usersRepo.update(user!, state, {
          googleRefreshToken: refresh_token,
          googleCalendarId: calendarId,
        });

        setStatus("success");
        setMessage("Google Calendar conectado com sucesso!");
      } catch (e) {
        setStatus("error");
        setMessage((e as Error).message);
      }
    }

    handleCallback();
  }, [search.code, search.state, navigate, user]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">Conectando ao Google Calendar...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          {status === "success" ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <h3 className="text-lg font-semibold">Conectado!</h3>
              <p className="text-muted-foreground">{message}</p>
              <Button onClick={() => navigate({ to: "/dashboard/configuracoes" })} className="mt-2">
                Voltar para Configurações
              </Button>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <h3 className="text-lg font-semibold">Erro na conexão</h3>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/dashboard/configuracoes" })}
                >
                  Tentar novamente
                </Button>
                <Button onClick={() => window.close()}>Fechar</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
