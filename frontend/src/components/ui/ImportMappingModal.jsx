import { useEffect, useState } from "react";
import { T, AVATAR_COLORS } from "../../theme";
import { s } from "../../styles/s";
import { Modal } from "./Modal";
import { IconCheck } from "../icons";
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
export function ImportMappingModal({ file, onClose, onConfirmar, showToast, camposCustomizados = [], onCriarCampo, tags = [], tagObjetos = [], onCriarTag }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [hi, setHi] = useState(0);
  const [mapeamento, setMapeamento] = useState({});
  const [nomeImportacao, setNomeImportacao] = useState("");
  // "" = nenhuma, "__nova__" = criar tag nova com o nome digitado, qualquer
  // outro valor = nome de uma tag ja existente - mesmo padrao ja usado pros
  // Campos Personalizados (destino) logo abaixo.
  const [tagDestino, setTagDestino] = useState("");
  const [novaTagNome, setNovaTagNome] = useState("");
  // destino: nome de um Campo Personalizado JA existente, ou "__novo__" pra
  // criar um campo novo com nome/tipo escolhidos na hora - lista pra
  // escolher em vez de precisar redigitar o nome exato de um campo que ja
  // existe (unico jeito de reaproveisar antes, sem nenhuma indicacao visual
  // de que era possivel).
  const [novosCampos, setNovosCampos] = useState([]); // [{colIdx, destino, nome, tipo}]
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

  const adicionarNovoCampo = () => setNovosCampos((ns) => [...ns, { colIdx: null, destino: "", nome: "", tipo: "TEXTO" }]);
  const atualizarNovoCampo = (i, patch) => setNovosCampos((ns) => ns.map((n, idx) => (idx === i ? { ...n, ...patch } : n)));
  const removerNovoCampo = (i) => setNovosCampos((ns) => ns.filter((_, idx) => idx !== i));

  // Resolve o nome/tipo final de cada linha: "__novo__" usa o que foi
  // digitado; qualquer outro valor de destino e' o nome de um campo que ja
  // existe (tipo dele prevalece, ignora o que estiver selecionado no <select>
  // de tipo pra essa linha).
  const resolverCampo = (n) => {
    if (n.destino === "__novo__") return { nome: n.nome.trim(), tipo: n.tipo };
    const existente = camposCustomizados.find((c) => c.nome === n.destino);
    return { nome: n.destino, tipo: existente?.tipo || n.tipo };
  };

  const confirmar = async () => {
    if (mapeamento.nome == null) {
      return showToast("Selecione qual coluna é o nome do lead — esse campo é obrigatório.", "warn");
    }
    if (!nomeImportacao.trim()) {
      return showToast("Dê um título pra essa importação — vira uma segmentação em Segmentações.", "warn");
    }
    if (tagDestino === "__nova__" && !novaTagNome.trim()) {
      return showToast("Digite o nome da tag nova, ou escolha uma já existente.", "warn");
    }
    const camposPendentes = novosCampos.filter((n) => n.colIdx != null || n.destino);
    for (const n of camposPendentes) {
      if (n.colIdx == null || !n.destino || (n.destino === "__novo__" && !n.nome.trim())) {
        return showToast("Cada campo personalizado precisa de uma coluna e um destino escolhido.", "warn");
      }
    }
    setConfirmando(true);
    try {
      const existentes = new Set(camposCustomizados.map((c) => c.nome));
      for (const n of camposPendentes) {
        const { nome, tipo } = resolverCampo(n);
        if (!existentes.has(nome)) {
          await onCriarCampo({ nome, tipo, opcoes: [] });
        }
      }

      let tagFinal = null;
      if (tagDestino === "__nova__") {
        tagFinal = novaTagNome.trim();
        await onCriarTag(tagFinal, AVATAR_COLORS[tagObjetos.length % AVATAR_COLORS.length]);
      } else if (tagDestino) {
        tagFinal = tagDestino;
      }

      const pacientes = montarPacientes(rows, hi, mapeamento, camposPendentes.map((n) => ({ colIdx: n.colIdx, nome: resolverCampo(n).nome })));
      if (!pacientes.length) {
        showToast("Nenhuma linha válida encontrada com esse mapeamento — confira a coluna do nome.", "warn");
        setConfirmando(false);
        return;
      }
      const pacientesComTag = tagFinal
        ? pacientes.map((p) => ({ ...p, tags: [...(p.tags || []), tagFinal] }))
        : pacientes;
      onConfirmar(pacientesComTag, nomeImportacao.trim());
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
          <div style={{ display: "grid", gap: 2, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
            {CAMPOS_IMPORTACAO.map((campo) => {
              const colIdx = mapeamento[campo.chave] ?? null;
              const mapeado = colIdx != null;
              const primeiraLinha = rows[hi + 1];
              const previa = mapeado && primeiraLinha ? String(primeiraLinha[colIdx] ?? "").trim() : "";
              return (
                <div key={campo.chave} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 4px", borderBottom: `1px solid ${T.lineSoft}` }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
                    background: mapeado ? "#E1F4F0" : T.lineSoft,
                  }}>
                    {mapeado ? <IconCheck color="#0E9484" width={11} height={11} /> : <span style={{ width: 8, height: 2, background: T.inkSoft, borderRadius: 1 }} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: mapeado ? T.ink : T.inkSoft, textDecoration: mapeado ? "none" : "line-through" }}>
                      {campo.rotulo}{campo.obrigatorio && <span style={{ color: T.coral }}> *</span>}
                    </div>
                    {campo.obrigatorio ? (
                      <div style={{ fontSize: 11, color: T.coral, marginTop: 2 }}>Campo obrigatório pra identificar o lead</div>
                    ) : mapeado ? (
                      <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Pré-visualização: {previa || "(vazio)"}
                      </div>
                    ) : null}
                  </div>
                  <select
                    style={{ ...s.select, width: 220 }}
                    disabled={!campo.obrigatorio && !mapeado}
                    value={colIdx ?? IGNORAR}
                    onChange={(e) => escolher(campo.chave, e.target.value)}
                  >
                    {!mapeado && <option value={IGNORAR}>Não importar</option>}
                    {headers.map((h, i) => <option key={i} value={i}>{h || `(coluna ${i + 1})`}</option>)}
                  </select>
                  {!campo.obrigatorio && (
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.inkSoft, flexShrink: 0, width: 100 }}>
                      <input
                        type="checkbox"
                        checked={!mapeado}
                        onChange={(e) => escolher(campo.chave, e.target.checked ? IGNORAR : String(headers.length ? 0 : IGNORAR))}
                      />
                      Não importar
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ height: 1, background: T.line, margin: "16px 0" }} />

          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Sobrou alguma coluna? Escolha pra qual campo ela vai</div>
          <p style={{ fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>
            Pode mandar pra um Campo Personalizado que já existe, ou criar um novo na hora — já fica disponível em Segmentações e no Painel Executivo, sem precisar ir noutra tela antes.
          </p>
          <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            {novosCampos.map((n, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: n.destino === "__novo__" ? "1.2fr 1fr 1fr 0.8fr auto" : "1.2fr 1fr auto", gap: 8, alignItems: "center" }}>
                <select style={s.select} value={n.colIdx ?? IGNORAR} onChange={(e) => atualizarNovoCampo(i, { colIdx: e.target.value === IGNORAR ? null : Number(e.target.value) })}>
                  <option value={IGNORAR}>Escolha a coluna</option>
                  {headers.map((h, hIdx) => <option key={hIdx} value={hIdx}>{h || `(coluna ${hIdx + 1})`}</option>)}
                </select>
                <select style={s.select} value={n.destino} onChange={(e) => atualizarNovoCampo(i, { destino: e.target.value })}>
                  <option value="">Escolha o destino</option>
                  <option value="__novo__">+ Criar campo novo</option>
                  {camposCustomizados.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
                {n.destino === "__novo__" && (
                  <>
                    <input style={s.input} placeholder="Nome do campo novo" value={n.nome} onChange={(e) => atualizarNovoCampo(i, { nome: e.target.value })} />
                    <select style={s.select} value={n.tipo} onChange={(e) => atualizarNovoCampo(i, { tipo: e.target.value })}>
                      {TIPOS_CAMPO_IMPORT.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
                    </select>
                  </>
                )}
                <button style={{ ...s.btnGhostSm, padding: "6px 10px" }} onClick={() => removerNovoCampo(i)} title="Remover">×</button>
              </div>
            ))}
          </div>
          <button style={s.btnGhostSm} onClick={adicionarNovoCampo}>+ Adicionar campo</button>

          <div style={{ height: 1, background: T.line, margin: "16px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Título dessa importação <span style={{ color: T.coral }}>*</span></div>
              <p style={{ fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>
                Vira uma segmentação nova (aba "Importações" em Segmentações), travada exatamente nesses leads — fica fácil reaproveitar depois (disparo, tag em lote etc.).
              </p>
              <input style={s.input} placeholder="Ex: Base Inadimplentes 03/08" value={nomeImportacao} onChange={(e) => setNomeImportacao(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Marcar todos com uma tag (opcional)</div>
              <select style={{ ...s.select, width: "100%", marginBottom: 8 }} value={tagDestino} onChange={(e) => setTagDestino(e.target.value)}>
                <option value="">Nenhuma tag</option>
                <option value="__nova__">+ Criar tag nova</option>
                {tags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {tagDestino === "__nova__" && (
                <input style={s.input} placeholder="Nome da tag nova" value={novaTagNome} onChange={(e) => setNovaTagNome(e.target.value)} />
              )}
            </div>
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
