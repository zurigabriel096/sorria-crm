import { useRef, useState } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { IconUpload } from "../icons";
import { ImportMappingModal } from "./ImportMappingModal";

export function ImportBox({ onImport, showToast, compact }) {
  const inp = useRef(null);
  const [arquivoPendente, setArquivoPendente] = useState(null);

  const handle = (files) => {
    const arquivo = [...files][0];
    if (!arquivo) return;
    if (!arquivo.name.match(/\.(xlsx|xls|csv)$/i)) return showToast("Envie um arquivo .xlsx", "warn");
    setArquivoPendente(arquivo);
  };

  return (
    <>
      <div
        style={{ ...s.importBox, ...(compact ? { padding: 14 } : {}) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files); }}
        onClick={() => inp.current.click()}
      >
        <input ref={inp} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => handle(e.target.files)} />
        <IconUpload color={T.primary} />
        <div>
          <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>Importar Lead (.xlsx)</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft }}>Arraste ou clique. Você escolhe qual coluna é qual informação antes de importar. Os dados ficam salvos no servidor.</div>
        </div>
      </div>
      {arquivoPendente && (
        <ImportMappingModal
          file={arquivoPendente}
          onClose={() => setArquivoPendente(null)}
          showToast={showToast}
          onConfirmar={(pacientes) => {
            setArquivoPendente(null);
            onImport({ tipo: "generico", pacientes });
          }}
        />
      )}
    </>
  );
}
