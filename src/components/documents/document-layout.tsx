import { ageFrom } from "@/lib/calculations/nutrition";
import type { Patient } from "@/lib/types";

/**
 * Layout de impressão comum aos documentos clínicos.
 *
 * O cabeçalho carrega a identidade do profissional (nome, especialidade e
 * registro) e o rodapé a assinatura. Em tela o documento aparece como prévia;
 * na impressão as regras de `styles.css` escondem a navegação e o resto da
 * interface, entao só o papel sai com a marca.
 */

export interface DocumentBrand {
  professionalName: string;
  professionalSpecialty: string;
  registerLabel: string;
  /** Registro profissional, ex.: "12345-SP". */
  registerNumber?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
}

export function DocumentHeader({
  brand,
  title,
  subtitle,
}: {
  brand: DocumentBrand;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="doc-header">
      <div className="doc-brand">
        <div className="doc-brand-mark" aria-hidden>
          ✚
        </div>
        <div>
          <p className="doc-brand-name">{brand.professionalName}</p>
          <p className="doc-brand-meta">
            {brand.professionalSpecialty}
            {brand.registerNumber
              ? ` — ${brand.registerLabel} ${brand.registerNumber}`
              : ` — ${brand.registerLabel}`}
          </p>
        </div>
      </div>
      <div className="doc-title-block">
        <h1 className="doc-title">{title}</h1>
        {subtitle && <p className="doc-subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}

export function DocumentFooter({ brand, date }: { brand: DocumentBrand; date: Date }) {
  const contact = [brand.phone, brand.email, brand.address].filter(Boolean).join(" · ");
  return (
    <footer className="doc-footer">
      {contact && <p className="doc-contact">{contact}</p>}
      <div className="doc-signature">
        <div className="doc-signature-line" />
        <p className="doc-signature-name">
          {brand.professionalName} — {brand.registerLabel}
        </p>
      </div>
      <p className="doc-date">
        {date.toLocaleDateString("pt-BR")} · Documento gerado pelo SaudePro
      </p>
    </footer>
  );
}

export function PatientLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="doc-line">
      <span className="doc-line-label">{label}:</span> {value}
    </p>
  );
}

export function PatientSummary({ patient }: { patient: Patient }) {
  const linhas: [string, string][] = [
    ["Nome", patient.name],
    [
      "Data de nascimento",
      patient.birthDate ? patient.birthDate.split("-").reverse().join("/") : "—",
    ],
    ["Idade", patient.birthDate ? `${ageFrom(patient.birthDate)} anos` : "—"],
    [
      "Sexo",
      patient.gender === "female" ? "Feminino" : patient.gender === "male" ? "Masculino" : "—",
    ],
    ["Altura", patient.heightCm ? `${patient.heightCm} cm` : "—"],
    ["Peso", patient.weightKg ? `${patient.weightKg} kg` : "—"],
    ["Cintura", patient.waistCm ? `${patient.waistCm} cm` : "—"],
    ["Quadril", patient.hipCm ? `${patient.hipCm} cm` : "—"],
  ];
  return (
    <section className="doc-section">
      {linhas.map(([label, value]) => (
        <PatientLine key={label} label={label} value={value} />
      ))}
    </section>
  );
}
