import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout de /dashboard/clientes.
 *
 * A lista (index) e a ficha ($patientId) são rotas irmãs: este componente só
 * precisa renderizar o Outlet, senão a rota filha nunca aparece na tela.
 */
export const Route = createFileRoute("/dashboard/clientes")({
  ssr: false,
  component: Outlet,
});
