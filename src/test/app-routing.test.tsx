import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("resolve /dashboard/clientes na listagem", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/dashboard/clientes");

    expect(matches.at(-1)?.routeId).toBe("/dashboard/clientes/");
  });

  it("resolve /dashboard/clientes/:id na ficha, não no layout", () => {
    // Regressão: quando /dashboard/clientes era layout sem <Outlet />, o clique na
    // tabela não navigava — a rota filha casava mas nunca era renderizada.
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/dashboard/clientes/abc123");

    expect(matches.at(-1)?.routeId).toBe("/dashboard/clientes/$patientId");
  });
});
