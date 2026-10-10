import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");

/** O arquivo tem mais de um bloco @media print — junta todos. */
const impressao = css
  .split("@media print")
  .slice(1)
  .map((b) => `@media print${b.slice(0, b.indexOf("\n}") + 2)}`)
  .join("\n");

describe("CSS de impressão", () => {
  it("imprime a partir de um container próprio, #saude-print-root", () => {
    expect(impressao).toMatch(
      /html\[data-printing\]\s+#saude-print-root\s*\{[^}]*display:\s*block/,
    );
  });

  it("remove a aplicação do fluxo com display:none, não visibility", () => {
    // Regressão: `visibility: hidden` mantinha a altura do app e empurrava o
    // documento para páginas abaixo, cortando o cabeçalho.
    expect(impressao).toMatch(
      /html\[data-printing\]\s+body\s*>\s*\*:not\(#saude-print-root\)\s*\{\s*display:\s*none/,
    );
    expect(impressao).not.toMatch(/body\s*\*\s*\{\s*visibility:\s*hidden/);
  });

  it("esconde o container de impressão na tela", () => {
    expect(impressao).toMatch(/#saude-print-root\s*\{\s*display:\s*none/);
  });

  it("força texto preto — rótulos de tabela sumiam no papel", () => {
    expect(impressao).toMatch(/#saude-print-root\s*\*\s*\{[^}]*color:\s*#000\s*!important/);
  });

  it("não usa position absolute no documento", () => {
    expect(impressao).not.toMatch(/#saude-print-root\s*\{[^}]*position:\s*absolute/);
  });

  it("mantém .no-print fora do papel", () => {
    expect(impressao).toMatch(/\.no-print\s*\{[^}]*display:\s*none/);
  });
});
