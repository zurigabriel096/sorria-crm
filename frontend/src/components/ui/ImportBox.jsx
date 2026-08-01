import { useRef } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { IconUpload } from "../icons";
import { importarPlanilha } from "../../utils/patients";

export function ImportBox({ onImport, showToast, compact }) {
  const inp = useRef(null);
  const handle = (files) => {
    [...files].forEach((f) =>
      f.name.match(/\.(xlsx|xls|csv)$/i) ? importarPlanilha(f, onImport) : showToast("Envie um arquivo .xlsx", "warn")
    );
  };
  return (
    <div
      style={{ ...s.importBox, ...(compact ? { padding: 14 } : {}) }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files); }}
      onClick={() => inp.current.click()}
    >
      <input ref={inp} type="file" accept=".xlsx,.xls,.csv" multiple style={{ display: "none" }} onChange={(e) => handle(e.target.files)} />
      <IconUpload color={T.primary} />
      <div>
        <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>Importar Lead (.xlsx)</div>
        <div style={{ fontSize: 12.5, color: T.inkSoft }}>Arraste ou clique. Reconhece Inadimplentes, Sem Agendamento e Agenda. Os dados ficam só no seu navegador.</div>
      </div>
    </div>
  );
}
