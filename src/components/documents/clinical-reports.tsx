import { DocumentFooter, DocumentHeader, type DocumentBrand } from "./document-layout";
import type { MedicalRecord } from "@/lib/types";

export interface RecordReportProps extends DocumentBrand {
  patientName: string;
  patientBirthDate: string;
  records: MedicalRecord[];
  /** Filtra o prontuário impresso, quando o documento é uma evolução isolada. */
  focusRecordId?: string;
}

/** Prontuário completo do paciente, pronto para impressão e arquivo. */
export function PrintableRecordReport(props: RecordReportProps) {
  const { patientName, patientBirthDate, records, focusRecordId } = props;
  const now = new Date();
  const ordenado = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const evolucoes = focusRecordId ? ordenado.filter((r) => r.id === focusRecordId) : ordenado;

  return (
    <article className="doc">
      <DocumentHeader
        brand={props}
        title="Prontuário"
        subtitle={`Emitido em ${now.toLocaleDateString("pt-BR")}`}
      />

      <section className="doc-section">
        <p className="doc-line">
          <span className="doc-line-label">Paciente:</span> {patientName}
        </p>
        <p className="doc-line">
          <span className="doc-line-label">Nascimento:</span>{" "}
          {patientBirthDate ? patientBirthDate.split("-").reverse().join("/") : "—"}
        </p>
        <p className="doc-line">
          <span className="doc-line-label">Total de evoluções:</span> {ordenado.length}
        </p>
      </section>

      {evolucoes.length === 0 ? (
        <section className="doc-section">
          <p className="doc-note">Nenhuma evolução registrada até a data de emissão.</p>
        </section>
      ) : (
        <section className="doc-section">
          {evolucoes.map((r) => (
            <article key={r.id} className="doc-record">
              <div className="doc-record-head">
                <h2 className="doc-heading">{r.title}</h2>
                <span className="doc-record-date">{r.date.split("-").reverse().join("/")}</span>
              </div>
              <p className="doc-record-body">{r.content}</p>
            </article>
          ))}
        </section>
      )}

      <DocumentFooter brand={props} date={now} />
    </article>
  );
}

export interface PrescriptionItem {
  name: string;
  dosage?: string;
  instructions?: string;
}

export interface PrescriptionReportProps extends DocumentBrand {
  patientName: string;
  patientBirthDate: string;
  items: PrescriptionItem[];
  notes?: string | undefined;
  /** Data de retorno, quando houver. */
  returnDate?: string | undefined;
}

/** Receituário/prescrição. Item vazio é renderizado como linha para escrita à mão. */
export function PrintablePrescriptionReport(props: PrescriptionReportProps) {
  const { patientName, patientBirthDate, items, notes, returnDate } = props;
  const now = new Date();
  const linhas = items.filter((i) => i.name.trim() !== "");
  const totalLinhas = Math.max(linhas.length, 6);

  return (
    <article className="doc">
      <DocumentHeader
        brand={props}
        title="Receituário"
        subtitle={now.toLocaleDateString("pt-BR")}
      />

      <section className="doc-section">
        <p className="doc-line">
          <span className="doc-line-label">Paciente:</span> {patientName}
        </p>
        {patientBirthDate && (
          <p className="doc-line">
            <span className="doc-line-label">Nascimento:</span>{" "}
            {patientBirthDate.split("-").reverse().join("/")}
          </p>
        )}
        {returnDate && (
          <p className="doc-line">
            <span className="doc-line-label">Retorno:</span>{" "}
            {returnDate.split("-").reverse().join("/")}
          </p>
        )}
      </section>

      <section className="doc-section">
        <h2 className="doc-heading">Prescrição</h2>
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: "45%" }}>Medicamento / suplemento</th>
              <th style={{ width: "20%" }}>Dose</th>
              <th>Orientações</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: totalLinhas }, (_, i) => {
              const item = linhas[i];
              return (
                <tr key={i} className="doc-rx-row">
                  <td>{item?.name ?? ""}</td>
                  <td>{item?.dosage ?? ""}</td>
                  <td>{item?.instructions ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {notes && (
        <section className="doc-section">
          <h2 className="doc-heading">Orientações gerais</h2>
          <p className="doc-record-body">{notes}</p>
        </section>
      )}

      <DocumentFooter brand={props} date={now} />
    </article>
  );
}
