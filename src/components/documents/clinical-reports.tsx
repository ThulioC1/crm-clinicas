import type { ReactNode } from "react";
import { DocumentFooter, DocumentHeader, type DocumentBrand } from "./document-layout";
import type { MedicalRecord } from "@/lib/types";

export interface RecordReportProps extends DocumentBrand {
  patientName: string;
  patientBirthDate: string;
  records: MedicalRecord[];
  /** Botão de edição de cada evolução, fora do papel impresso. */
  renderBefore?: (record: MedicalRecord) => ReactNode;
  /** Conteúdo da evolução — vira campo editável quando o item está em edição. */
  renderContent?: (record: MedicalRecord) => ReactNode;
}

/** Prontuário completo do paciente, pronto para impressão e arquivo. */
export function PrintableRecordReport(props: RecordReportProps) {
  const { patientName, patientBirthDate, records, renderBefore, renderContent } = props;
  const now = new Date();
  const evolucoes = [...records].sort((a, b) => b.date.localeCompare(a.date));

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
          <span className="doc-line-label">Total de evoluções:</span> {evolucoes.length}
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
              {renderBefore && <div className="mb-1">{renderBefore(r)}</div>}
              <div className="doc-record-head">
                <h2 className="doc-heading">{r.title}</h2>
                <span className="doc-record-date">{r.date.split("-").reverse().join("/")}</span>
              </div>
              <div className="doc-record-body">{renderContent ? renderContent(r) : r.content}</div>
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
  /** Modo de edição: as células viram campos preenchíveis. */
  editable?: boolean;
  /** Recebe o patch de uma célula editada. */
  onItemsChange?: (index: number, patch: Partial<PrescriptionItem>) => void;
  renderRowExtra?: (index: number) => ReactNode;
  renderNotes?: () => ReactNode;
  renderReturnDate?: () => ReactNode;
}

/** Receituário/prescrição. Em edição, cada célula é um campo; no papel, uma tabela. */
export function PrintablePrescriptionReport(props: PrescriptionReportProps) {
  const {
    patientName,
    patientBirthDate,
    items,
    notes,
    returnDate,
    editable,
    renderRowExtra,
    renderNotes,
    renderReturnDate,
  } = props;
  const now = new Date();
  const preenchidas = items.filter((i) => i.name.trim() !== "");
  const linhas = editable ? Math.max(preenchidas.length, 4) : Math.max(preenchidas.length, 6);

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
        {editable && renderReturnDate && <div className="no-print mt-2">{renderReturnDate()}</div>}
      </section>

      <section className="doc-section">
        <h2 className="doc-heading">Prescrição</h2>
        <div className="doc-table-scroll">
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: "42%" }}>Medicamento / suplemento</th>
                <th style={{ width: "18%" }}>Dose</th>
                <th>Orientações</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: linhas }, (_, i) => {
                const item = preenchidas[i];
                if (!editable) {
                  return (
                    <tr key={i} className="doc-rx-row">
                      <td>{item?.name ?? ""}</td>
                      <td>{item?.dosage ?? ""}</td>
                      <td>{item?.instructions ?? ""}</td>
                    </tr>
                  );
                }
                return (
                  <tr key={i}>
                    <td>
                      <input
                        className="doc-input"
                        placeholder="Medicamento"
                        value={item?.name ?? ""}
                        onChange={(e) => props.onItemsChange?.(i, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="doc-input"
                        placeholder="Dose"
                        value={item?.dosage ?? ""}
                        onChange={(e) => props.onItemsChange?.(i, { dosage: e.target.value })}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <input
                          className="doc-input"
                          placeholder="Orientações"
                          value={item?.instructions ?? ""}
                          onChange={(e) =>
                            props.onItemsChange?.(i, { instructions: e.target.value })
                          }
                        />
                        {renderRowExtra?.(i)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc-section">
        <h2 className="doc-heading">Orientações gerais</h2>
        {editable && renderNotes ? renderNotes() : <p className="doc-record-body">{notes ?? ""}</p>}
      </section>

      <DocumentFooter brand={props} date={now} />
    </article>
  );
}
