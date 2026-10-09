import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");

/** O arquivo tem mais de um bloco @media print — junta todos. */
const blocoImpressao = css
  .split("@media print")
  .slice(1)
  .map((b) => `@media print${b.slice(0, b.indexOf("\n}") + 2)}`)
  .join("\n");

describe("CSS de impressão", () => {
  it("não esconde a aplicação quando não há documento aberto", () => {
    // Regressão: `body * { visibility: hidden }` incondicional fazia o Ctrl+P
    // comum na ficha do paciente sair em branco.
    const semAtributo = blocoImpressao.match(/^\s*body\s+\*\s*\{[^}]*visibility:\s*hidden/m);
    expect(semAtributo).toBeNull();
  });

  it("oculta a aplicação apenas com data-printing presente", () => {
    expect(blocoImpressao).toMatch(
      /html\[data-printing\]\s+body\s+\*\s*\{[^}]*visibility:\s*hidden/,
    );
    expect(blocoImpressao).toMatch(/html\[data-printing\]\s+\.doc/);
  });

  it("libera o documento e o diálogo para paginação real", () => {
    expect(blocoImpressao).toMatch(
      /html\[data-printing\]\s+\[role="dialog"\][^}]*overflow:\s*visible/,
    );
    expect(blocoImpressao).toMatch(
      /html\[data-printing\]\s+\[role="dialog"\][^}]*position:\s*static/,
    );
  });

  it("esconde overlay e botão de fechar na impressão", () => {
    expect(blocoImpressao).toMatch(/data-slot="dialog-overlay"/);
    expect(blocoImpressao).toMatch(/data-slot="dialog-close"/);
  });

  it("esconde os controles de edição via .no-print", () => {
    expect(blocoImpressao).toMatch(/\.no-print\s*\{[^}]*display:\s*none/);
  });

  it("não usa position absolute no documento — evita página em branco extra", () => {
    expect(blocoImpressao).not.toMatch(/\.doc\s*\{[^}]*position:\s*absolute/);
  });
});
