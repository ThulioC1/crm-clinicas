import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarX,
  ExternalLink,
  Loader2,
  Shield,
  CheckCircle,
  AlertCircle,
  Stethoscope,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { usersRepo } from "@/services/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPECIALTY_OPTIONS, resolveSpecialty, modulesFor, type ModuleId } from "@/lib/specialties";

const MODULE_LABELS: Record<ModuleId, string> = {
  avaliacao_nutricional: "Avaliação nutricional",
  eav: "Escala de avaliação",
  psicometria: "Psicometria",
  carga_1rm: "Carga máxima",
  cid10: "CID-10",
  prontuario: "Prontuário",
};

export const Route = createFileRoute("/dashboard/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — SaudePro" },
      { name: "description", content: "Configure suas integrações e preferências." },
    ],
  }),
  component: Configuracoes,
});

const GOOGLE_CLIENT_ID = import.meta.env["VITE_GOOGLE_CLIENT_ID"];
const REDIRECT_URI = `${import.meta.env["VITE_APP_URL"] || window.location.origin}/auth/google/callback`;
const SCOPES =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

function Configuracoes() {
  const { user } = useAuth();
  const me = user!;
  const [connecting, setConnecting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const hasGoogle = !!me.googleRefreshToken;

  const handleSpecialtyChange = async (value: string) => {
    try {
      await usersRepo.update(me, me.id, { specialty: value });
      toast.success("Especialidade atualizada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleConnect = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error("Google Client ID não configurado. Contate o administrador.");
      return;
    }
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${me.id}`;
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    try {
      await usersRepo.update(me, me.id, { googleRefreshToken: "", googleCalendarId: "" });
      toast.success("Google Calendar desconectado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleUpdateProfile = async (updates: Partial<typeof me>) => {
    try {
      await usersRepo.update(me, me.id, updates);
      toast.success("Configuração atualizada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleFileChange = (field: "documentLogo" | "documentSignature") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      handleUpdateProfile({ [field]: result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <PageHeader title="Configurações" subtitle="Integrações e preferências da sua conta" />
      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Especialidade</CardTitle>
                <CardDescription>Define as ferramentas disponíveis no seu painel</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Área de atuação</Label>
              <Select
                value={resolveSpecialty(me.specialty).id}
                onValueChange={handleSpecialtyChange}
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {modulesFor(me.specialty).map((m) => (
                <Badge key={m} variant="secondary">
                  {MODULE_LABELS[m]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Personalização de Documentos</CardTitle>
                <CardDescription>Logo, assinatura e registro profissional para impressões</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Registro (Ex: CRM-SP, CRN, CRP)</Label>
                <Input 
                  placeholder={resolveSpecialty(me.specialty).registerLabel} 
                  defaultValue={me.registerLabelOverride || ""}
                  onBlur={(e) => {
                    if (e.target.value !== me.registerLabelOverride) {
                      handleUpdateProfile({ registerLabelOverride: e.target.value });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Número do Registro</Label>
                <Input 
                  placeholder="123456" 
                  defaultValue={me.registerNumber || ""}
                  onBlur={(e) => {
                    if (e.target.value !== me.registerNumber) {
                      handleUpdateProfile({ registerNumber: e.target.value });
                    }
                  }}
                />
              </div>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logotipo da Clínica / Profissional</Label>
                {me.documentLogo && (
                  <div className="mb-2">
                    <img src={me.documentLogo} alt="Logo" className="max-h-16 object-contain" />
                    <Button variant="link" size="sm" className="px-0 text-red-500 h-auto" onClick={() => handleUpdateProfile({ documentLogo: "" })}>Remover logo</Button>
                  </div>
                )}
                <Input type="file" accept="image/*" onChange={handleFileChange("documentLogo")} />
              </div>
              <div className="space-y-2">
                <Label>Assinatura Digitalizada</Label>
                {me.documentSignature && (
                  <div className="mb-2">
                    <img src={me.documentSignature} alt="Assinatura" className="max-h-16 object-contain" />
                    <Button variant="link" size="sm" className="px-0 text-red-500 h-auto" onClick={() => handleUpdateProfile({ documentSignature: "" })}>Remover assinatura</Button>
                  </div>
                )}
                <Input type="file" accept="image/*" onChange={handleFileChange("documentSignature")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Google Calendar</CardTitle>
                <CardDescription>
                  Sincronize sua agenda e permita agendamento online
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${hasGoogle ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                >
                  {hasGoogle ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <CalendarX className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{hasGoogle ? "Conectado" : "Não conectado"}</p>
                  <p className="text-sm text-muted-foreground">
                    {hasGoogle
                      ? "Sincronização ativa • Agendamento online habilitado"
                      : "Clique para conectar e ativar o portal de agendamento"}
                  </p>
                </div>
              </div>
              <Button
                onClick={hasGoogle ? handleDisconnect : handleConnect}
                disabled={connecting || !GOOGLE_CLIENT_ID}
                variant={hasGoogle ? "outline" : "default"}
                className="gap-2"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : hasGoogle ? (
                  <CalendarX className="h-4 w-4" />
                ) : (
                  <CalendarCheck className="h-4 w-4" />
                )}
                {connecting
                  ? "Conectando..."
                  : hasGoogle
                    ? "Desconectar"
                    : "Conectar Google Calendar"}
              </Button>
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Cria eventos no Google ao agendar no SaudePro</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Evita conflitos (consulta horários ocupados)</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Gera link público para pacientes agendarem</span>
              </div>
            </div>

            {hasGoogle && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowGuide(true)}
                className="justify-start"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver link do portal de agendamento
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Segurança e Privacidade</CardTitle>
                <CardDescription>O que acessamos e como protegemos seus dados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Apenas <strong>eventos da agenda</strong> são lidos/escritos. Não acessamos e-mails,
                contatos ou arquivos.
              </span>
            </p>
            <p className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Tokens ficam <strong>criptografados</strong> no Firebase. Só o SaudePro pode
                usá-los.
              </span>
            </p>
            <p className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                Pode revogar a qualquer momento aqui ou em{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener"
                  className="underline"
                >
                  myaccount.google.com
                </a>
                .
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portal de Agendamento do Paciente</CardTitle>
            <CardDescription>Como funciona para seus pacientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </span>
              <div>
                <p className="font-medium">Paciente acessa seu link</p>
                <p className="text-muted-foreground">Ex: saudepro.com/agendar/dra-marina</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </span>
              <div>
                <p className="font-medium">Escolhe data, horário e tipo</p>
                <p className="text-muted-foreground">
                  Só vê horários livres (consulta Google Calendar em tempo real)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                3
              </span>
              <div>
                <p className="font-medium">Preenche: Nome, Telefone, E-mail</p>
                <p className="text-muted-foreground">Confirma e recebe comprovante na hora</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                4
              </span>
              <div>
                <p className="font-medium">Aparece na sua Agenda SaudePro</p>
                <p className="text-muted-foreground">
                  Com badge "🌐 Portal" • Sincroniza pro Google Calendar automaticamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Guia: Conectar Google Calendar</DialogTitle>
            <DialogDescription>Siga os passos abaixo — leva menos de 2 minutos</DialogDescription>
          </DialogHeader>
          <ScrollArea className="mt-4 max-h-[50vh] space-y-6">
            <Step number={1} title="Abra o Google Cloud Console">
              <p className="text-muted-foreground">
                Acesse{" "}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noopener"
                  className="underline"
                >
                  console.cloud.google.com
                </a>{" "}
                e faça login com sua conta Google (a mesma da agenda).
              </p>
            </Step>
            <Step number={2} title="Crie ou selecione um projeto">
              <p className="text-muted-foreground">
                No topo, clique no seletor de projeto → "Novo projeto" → nomeie (ex: "SaudePro
                Agenda") → Criar.
              </p>
            </Step>
            <Step number={3} title="Ative a Calendar API">
              <p className="text-muted-foreground">
                No menu lateral: <strong>APIs e serviços → Biblioteca</strong> → busque "Google
                Calendar API" → clique → <strong>Ativar</strong>.
              </p>
            </Step>
            <Step number={4} title="Configure a tela de consentimento">
              <p className="text-muted-foreground">
                Menu: <strong>APIs e serviços → Tela de consentimento OAuth</strong> →{" "}
                <strong>Externo</strong> → Criar.
              </p>
              <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Nome do app: "SaudePro"</li>
                <li>E-mail de suporte: seu e-mail</li>
                <li>
                  Escopos: adicione <code>.../auth/calendar.events</code> e{" "}
                  <code>.../auth/calendar.readonly</code>
                </li>
                <li>Usuários de teste: adicione seu e-mail</li>
                <li>Salve e continue até finalizar</li>
              </ul>
            </Step>
            <Step number={5} title="Crie as credenciais OAuth">
              <p className="text-muted-foreground">
                Menu: <strong>APIs e serviços → Credenciais</strong> →{" "}
                <strong>+ Criar credenciais → ID do cliente OAuth</strong>.
              </p>
              <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>
                  Tipo: <strong>Aplicativo da Web</strong>
                </li>
                <li>Nome: "SaudePro Web"</li>
                <li>
                  <strong>URIs de redirecionamento autorizados</strong>: adicione{" "}
                  <code>{REDIRECT_URI}</code>
                </li>
                <li>
                  Clique em <strong>Criar</strong>
                </li>
              </ul>
            </Step>
            <Step number={6} title="Copie o Client ID e Secret">
              <p className="text-muted-foreground">
                Na tela de sucesso, copie <strong>ID do cliente</strong> e{" "}
                <strong>Secret do cliente</strong>.
              </p>
              <p className="text-muted-foreground mt-2">
                Envie para o administrador do SaudePro configurar nas variáveis de ambiente:
              </p>
              <pre className="mt-2 p-3 rounded bg-gray-100 text-xs overflow-x-auto">
                <code>
                  VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
                  GOOGLE_CLIENT_SECRET=seu-secret
                </code>
              </pre>
            </Step>
            <Step number={7} title="Volte aqui e clique em Conectar">
              <p className="text-muted-foreground">
                Após o admin configurar, clique no botão "Conectar Google Calendar" acima. Autorize
                com sua conta Google. Pronto!
              </p>
            </Step>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
        {number}
      </div>
      <div>
        <h4 className="font-semibold">{title}</h4>
        <div className="mt-1 text-sm">{children}</div>
      </div>
    </div>
  );
}
