import { useEffect, useState } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Modal } from "./Modal";
import { lerPlanilhaBruta, sugerirMapeamento, montarPacientes, CAMPOS_IMPORTACAO } from "../../utils/patients";

const IGNORAR = "ignorar";

// Tipos aceitos pra criar um Campo Personalizado direto na importação - sem
// LISTA de proposito (as opções de uma lista merecem ser definidas com calma,
// não escolhidas correndo no meio do mapeamento de uma planilha). Quem
// precisar de LISTA continua criando pela tela de Segmentações, como já era.
const TIPOS_CAMPO_IMPORT = [
  { valor: "TEXTO", rotulo: "Texto" },
  { valor: "NUMERO", rotulo: "Número" },
  { valor: "MOEDA", rotulo: "Dinheiro (R$)" },
  { valor: "DATA", rotulo: "Data" },
];

// Pede pro operador dizer qual coluna da planilha é qual campo do Sorr.ia,
// em vez do sistema tentar adivinhar sozinho (era a causa do bug de
// importação: coluna "Nome" não reconhecida porque só aceitava "Paciente").
// Já vem com uma sugestão pré-selecionada, mas o operador confere/troca tudo.
export function ImportMappingModal({ file, onClose, onConfirmar, showToast, camposCustomizados = [], onCriarCampo }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [hi, setHi] = useState(0);
  const [mapeamento, setMapeamento] = useState({});
  const [novosCampos, setNovosCampos] = useState([]); // [{colIdx, nome, tipo}]
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

  const adicionarNovoCampo = () => setNovosCampos((ns) => [...ns, { colIdx: null, nome: "", tipo: "TEXTO" }]);
  const atualizarNovoCampo = (i, patch) => setNovosCampos((ns) => ns.map((n, idx) => (idx === i ? { ...n, ...patch } : n)));
  const removerNovoCampo = (i) => setNovosCampos((ns) => ns.filter((_, idx) => idx !== i));

  const confirmar = async () => {
    if (mapeamento.nome == null) {
      return showToast("Selecione qual coluna é o nome do lead — esse campo é obrigatório.", "warn");
    }
    const camposPendentes = novosCampos.filter((n) => n.colIdx != null || n.nome.trim());
    for (const n of camposPendentes) {
      if (n.colIdx == null || !n.nome.trim()) {
        return showToast("Cada campo personalizado novo precisa de uma coluna e um nome.", "warn");
      }
    }
    setConfirmando(true);
    try {
      // Campo com nome igual a um que já existe (comparação sem acento/maiúscula
      // não vale a pena aqui - só igualdade direta) reaproveita o existente em
      // vez de tentar criar de novo (o backend rejeitaria como duplicado).
      const existentes = new Set(camposCustomizados.map((c) => c.nome));
      for (const n of camposPendentes) {
        if (!existentes.has(n.nome.trim())) {
          await onCriarCampo({ nome: n.nome.trim(), tipo: n.tipo, opcoes: [] });
        }
      }

      const pacientes = montarPacientes(rows, hi, mapeamento, camposPendentes.map((n) => ({ colIdx: n.colIdx, nome: n.nome.trim() })));
      if (!pacientes.length) {
        showToast("Nenhuma linha válida encontrada com esse mapeamento — confira a coluna do nome.", "warn");
        setConfirmando(false);
        return;
      }
      onConfirmar(pacientes);
    } catch (e) {
      showToast(e.message || "Erro ao criar campo personalizado", "warn");
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
          <div style={{ display: "grid", gap: 10, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
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

          <div style={{ height: 1, background: T.line, margin: "16px 0" }} />

          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Sobrou alguma coluna? Vire Campo Personalizado</div>
          <p style={{ fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>
            Cria na hora e já fica disponível em Segmentações e no Painel Executivo, sem precisar ir noutra tela antes.
          </p>
          <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            {novosCampos.map((n, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr auto", gap: 8, alignItems: "center" }}>
                <select style={s.select} value={n.colIdx ?? IGNORAR} onChange={(e) => atualizarNovoCampo(i, { colIdx: e.target.value === IGNORAR ? null : Number(e.target.value) })}>
                  <option value={IGNORAR}>Escolha a coluna</option>
                  {headers.map((h, hIdx) => <option key={hIdx} value={hIdx}>{h || `(coluna ${hIdx + 1})`}</option>)}
                </select>
                <input style={s.input} placeholder="Nome do campo" value={n.nome} onChange={(e) => atualizarNovoCampo(i, { nome: e.target.value })} />
                <select style={s.select} value={n.tipo} onChange={(e) => atualizarNovoCampo(i, { tipo: e.target.value })}>
                  {TIPOS_CAMPO_IMPORT.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
                </select>
                <button style={{ ...s.btnGhostSm, padding: "6px 10px" }} onClick={() => removerNovoCampo(i)} title="Remover">×</button>
              </div>
            ))}
          </div>
          <button style={s.btnGhostSm} onClick={adicionarNovoCampo}>+ Adicionar campo personalizado</button>

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
