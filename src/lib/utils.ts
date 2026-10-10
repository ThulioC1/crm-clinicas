import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * E-mails equivalentes ignorando caixa e espaços.
 * Vazio nunca conta como duplicata (campo de e-mail é opcional em pacientes).
 */
export function mesmoEmail(a?: string | null, b?: string | null): boolean {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  return x !== "" && x === y;
}
