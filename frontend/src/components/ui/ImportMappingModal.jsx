import { useEffect, useState } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Modal } from "./Modal";
import { lerPlanilhaBruta, sugerirMapeamento, montarPacientes, CAMPOS_IMPORTACAO } from "../../utils/patients";

const IGNORAR = "ignorar";

// Pede pro operador dizer qual coluna da planilha é qual campo do Sorr.ia,
// em vez do sistema tentar adivinhar sozinho (era a causa do bug de
// importação: coluna "Nome" não reconhecida porque só aceitava "Paciente").
// Já vem com uma sugestão pré-selecionada, mas o operador confere/troca tudo.
export function ImportMappingModal({ file, onClose, onConfirmar, showToast }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [hi, setHi] = useState(0);
  const [mapeamento, setMapeamento] = useState({});
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    lerPlanilhaBruta(file)
      .then(({ headers: h, rows: r, hi: indiceCabecalho }) => {
        setHeaders(h);
        setRows(r);
        setHi(indiceCabecalho);
        setMapeamento(sugerirMapeamento(h));
      })
      .catch((e) => setErro(e.message || "Não consegui ler essa planilha."))
      .finally(() => setCarregando(false));
  }, [file]);

  const escolher = (chave, valor) => {
    setMapeamento((m) => ({ ...m, [chave]: valor === IGNORAR ? null : Number(valor) }));
  };

  const confirmar = () => {
    if (mapeamento.nome == null) {
      return showToast("Selecione qual coluna é o nome do lead — esse campo é obrigatório.", "warn");
    }
    setConfirmando(true);
    try {
      const pacientes = montarPacientes(rows, hi, mapeamento);
      if (!pacientes.length) {
        showToast("Nenhuma linha válida encontrada com esse mapeamento — confira a coluna do nome.", "warn");
        setConfirmando(false);
        return;
      }
      onConfirmar(pacientes);
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <Modal title="Importar Lead — de onde vem cada informação?" onClose={onClose} wide>
      {carregando ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: T.inkSoft }}>Lendo planilha...</div>
      ) : erro ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: T.coral }}>{erro}</div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 16 }}>
            Pra cada informação do Sorr.ia, escolha qual coluna da sua planilha corresponde a ela.
            O que não existir na planilha, deixe em "Ignorar".
          </p>
          <div style={{ display: "grid", gap: 10, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
            {CAMPOS_IMPORTACAO.map((campo) => (
              <div key={campo.chave} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>
                  {campo.rotulo}
                  {campo.obrigatorio && <span style={{ color: T.coral }}> *</span>}
                </div>
                <select
                  style={s.select}
                  value={mapeamento[campo.chave] ?? IGNORAR}
                  onChange={(e) => escolher(campo.chave, e.target.value)}
                >
                  {!campo.obrigatorio && <option value={IGNORAR}>Ignorar</option>}
                  {headers.map((h, i) => <option key={i} value={i}>{h || `(coluna ${i + 1})`}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1, opacity: confirmando ? .6 : 1 }} disabled={confirmando} onClick={confirmar}>
              {confirmando ? "Importando..." : "Importar"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
