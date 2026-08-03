import { useEffect, useRef, useState } from "react";
import { T } from "../theme";
import { listEtapas } from "../api/etapas";
import { s } from "../styles/s";
import { exportarXlsx, parseData, evalCond } from "../utils/patients";
import { montarFieldMeta, OP_LABEL, OPS_SEM_VALOR } from "../data/seed";
import { brl } from "../utils/format";
import { rotuloCampo, valorDoCampoPainel } from "../utils/painelCampos";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { ImportBox } from "../components/ui/ImportBox";
import { IconSearch, IconDownload, IconFilter } from "../components/icons";

// "Estagio" nao entra no FIELD_META compartilhado com Segmentacoes (data/seed.js)
// de proposito - so o filtro avancado daqui embaixo usa, com os valores reais
// das etapas do Kanban (carregadas via listEtapas). Ver caso "estagio" novo em
// utils/patients.js evalCond.
function montarFiltroFieldMeta(camposCustomizados, etapas) {
  return {
    estagio: { label: "Estágio", ops: ["é", "não é"], values: etapas.map((e) => e.nome) },
    ...montarFieldMeta(camposCustomizados),
  };
}

const TIPOS_CAMPO = [
  { valor: "TEXTO", rotulo: "Texto" },
  { valor: "NUMERO", rotulo: "Número" },
  { valor: "MOEDA", rotulo: "Dinheiro (R$)" },
  { valor: "DATA", rotulo: "Data" },
  { valor: "LISTA", rotulo: "Lista de opções" },
];

// Colunas fixas que a tabela sempre teve. "Lead" (nome+telefone) não entra
// aqui - é a identificação da linha, sempre visível, não faz sentido esconder.
// "valor" (separado de "render", que é JSX) é o que a ordenação por cabeçalho
// de coluna usa pra comparar duas linhas - ver alternarOrdenacao.
function colunasFixas() {
  return [
    { chave: "estagio", rotulo: "Estágio", valor: (p) => (p.estagio || "Lead").toLowerCase(), render: (p) => {
      const col = T.estagio[p.estagio] || T.estagio.Lead;
      return <span style={{ ...s.segBadge, color: col.fg, background: col.bg }}>{p.estagio || "Lead"}</span>;
    } },
    { chave: "financ", rotulo: "Financeiro", valor: (p) => (p.financ || "").toLowerCase(), render: (p) => (
      <span style={{ fontSize: 12.5, color: p.financ === "Inadimplente" ? T.coral : T.inkSoft, fontWeight: 600 }}>{p.financ}</span>
    ) },
    { chave: "dentista", rotulo: "Dentista", valor: (p) => (p.dentista || "").toLowerCase(), render: (p) => p.dentista || "—", numerica: true },
    { chave: "recencia", rotulo: "Data do último atendimento", valor: (p) => parseData(p.ultAtend)?.getTime() ?? -Infinity, render: (p) => p.ultAtend || "—", numerica: true },
    { chave: "elegivel", rotulo: "Elegível", valor: (p) => (p.elegivel ? 1 : 0), render: (p) => (p.elegivel ? <span style={s.tagOk}>● Sim</span> : <span style={s.tagBad}>▲ Não</span>) },
  ];
}

function colunaCustomizada(campo) {
  return {
    chave: `custom:${campo.nome}`,
    rotulo: campo.nome,
    valor: (p) => {
      const v = p.camposCustomizados?.[campo.nome];
      if (campo.tipo === "NUMERO" || campo.tipo === "MOEDA") return v ? Number(v) : -Infinity;
      if (campo.tipo === "DATA") return v ? new Date(v).getTime() : -Infinity;
      return (v || "").toLowerCase();
    },
    render: (p) => {
      const valor = p.camposCustomizados?.[campo.nome];
      if (!valor) return "—";
      return campo.tipo === "MOEDA" ? brl(Number(valor) || 0) : valor;
    },
    numerica: campo.tipo === "NUMERO" || campo.tipo === "MOEDA" || campo.tipo === "DATA",
  };
}

export function Pacientes({
  patients, tags, onImport, showToast, filtroInicial, onAbrirPaciente, onUnificarDuplicados,
  usuario, camposCustomizados, onCriarCampo, onAtualizarCampo, onExcluirCampo,
  colunasVisiveis, onAtualizarColunas, onCriarPaciente, onExcluirPaciente,
}) {
  const souAdmin = usuario?.papel === "ADMIN";
  const souGestorOuAdmin = souAdmin || usuario?.papel === "GESTOR";
  // Filtro avancado (icone de funil) - lista de condicoes combinadas por E,
  // reaproveita o mesmo motor de Segmentacoes (evalCond). Substituiu os 3
  // <select> separados de Estagio/Elegibilidade/Tag que existiam antes.
  const [condicoes, setCondicoes] = useState(
    filtroInicial?.eleg === "Elegíveis" ? [{ field: "elegivel", op: "é", value: "Sim" }]
      : filtroInicial?.eleg === "A corrigir" ? [{ field: "elegivel", op: "é", value: "Não" }]
      : []
  );
  const [filtroAberto, setFiltroAberto] = useState(false);
  // Filtro vindo de um clique num card personalizado do Painel Executivo
  // (ver Dashboard.jsx irParaPacientes) - {campo, valor} no mesmo formato de
  // PainelCard, resolvido com o mesmo valorDoCampoPainel usado la. Mecanismo
  // separado do filtro avancado (endereça campo por convencao diferente,
  // ver painelCampos.js) - os dois se combinam por E quando ativos juntos.
  const [fCampoValor, setFCampoValor] = useState(filtroInicial?.campo ? { campo: filtroInicial.campo, valor: filtroInicial.valor } : null);
  const [ordenacao, setOrdenacao] = useState(null); // null | {chave, direcao: "asc"|"desc"}
  const [q, setQ] = useState("");
  const [etapas, setEtapas] = useState([]);
  const [unificando, setUnificando] = useState(false);
  const [maisAcoesAberto, setMaisAcoesAberto] = useState(false);
  const [campoForm, setCampoForm] = useState(null); // null | {id,nome,tipo,opcoes}
  const [novoLead, setNovoLead] = useState(null); // null | {nome, tel}
  const [salvandoLead, setSalvandoLead] = useState(false);

  const todasColunas = [...colunasFixas(), ...(camposCustomizados || []).map(colunaCustomizada)];
  const colunasParaMostrar = todasColunas.filter((c) => (colunasVisiveis || []).includes(c.chave));
  const filtroFieldMeta = montarFiltroFieldMeta(camposCustomizados, etapas);

  const alternarColuna = (chave) => {
    const atuais = colunasVisiveis || [];
    onAtualizarColunas(atuais.includes(chave) ? atuais.filter((c) => c !== chave) : [...atuais, chave]);
  };

  const unificar = async () => {
    setUnificando(true);
    try {
      await onUnificarDuplicados();
    } catch (e) {
      showToast(e.message || "Erro ao unificar duplicados", "warn");
    } finally {
      setUnificando(false);
    }
  };

  const salvarCampo = async () => {
    if (!campoForm.nome.trim()) return showToast("Dê um nome pro campo", "warn");
    const payload = {
      nome: campoForm.nome.trim(),
      tipo: campoForm.tipo,
      opcoes: campoForm.tipo === "LISTA" ? campoForm.opcoes.split(",").map((o) => o.trim()).filter(Boolean) : [],
    };
    try {
      if (campoForm.id) await onAtualizarCampo(campoForm.id, payload);
      else await onCriarCampo(payload);
      setCampoForm(null);
      showToast("Campo salvo", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar campo", "warn");
    }
  };

  const excluirCampo = async (campo) => {
    if (!window.confirm(`Excluir o campo "${campo.nome}"? Valores já salvos nos leads não são apagados, só deixam de aparecer.`)) return;
    try {
      await onExcluirCampo(campo.id);
      showToast("Campo removido", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover campo", "warn");
    }
  };

  const salvarNovoLead = async () => {
    if (!novoLead.nome.trim()) return showToast("Informe o nome", "warn");
    setSalvandoLead(true);
    try {
      await onCriarPaciente({ nome: novoLead.nome.trim(), tel: novoLead.tel.trim() });
      setNovoLead(null);
      showToast("Lead criado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao criar lead", "warn");
    } finally {
      setSalvandoLead(false);
    }
  };

  // DotMenu renderiza o popup via portal (fora da <tr>), então clicar num item
  // do menu nunca borbulha pro onClick da linha - não precisa de stopPropagation
  // aqui, só no <td> que envolve o botão "⋮" em si (ver tabela abaixo).
  const excluirLead = async (p) => {
    if (!window.confirm(`Excluir "${p.nome}" da base de leads? Essa ação não pode ser desfeita.`)) return;
    try {
      await onExcluirPaciente(p.id);
      showToast("Lead excluído", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao excluir lead", "warn");
    }
  };

  useEffect(() => { listEtapas().then(setEtapas).catch(() => setEtapas([])); }, []);

  const filtroRef = useRef(null);
  useEffect(() => {
    if (!filtroAberto) return;
    const h = (e) => { if (filtroRef.current && !filtroRef.current.contains(e.target)) setFiltroAberto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [filtroAberto]);

  const limpar = () => { setCondicoes([]); setQ(""); setFCampoValor(null); };

  // Mesmo raciocinio de valorPadrao em Segmentacoes.jsx (SegBuilder.changeField) -
  // ao trocar de campo, reseta o operador/valor pro que faz sentido nesse tipo.
  const primeiroCampoFiltro = Object.keys(filtroFieldMeta)[0];
  const adicionarCondicao = () => {
    const m = filtroFieldMeta[primeiroCampoFiltro];
    const valorPadrao = m.value === "number" ? 0 : m.value === "date" ? "" : m.value === "text" ? "" : (m.values?.[0] || "");
    setCondicoes((cs) => [...cs, { field: primeiroCampoFiltro, op: m.ops[0], value: valorPadrao }]);
  };
  const removerCondicao = (i) => setCondicoes((cs) => cs.filter((_, k) => k !== i));
  const mudarCampoCondicao = (i, field) => {
    const m = filtroFieldMeta[field];
    const valorPadrao = m.value === "number" ? 0 : m.value === "date" ? "" : m.value === "text" ? "" : (m.values?.[0] || "");
    setCondicoes((cs) => cs.map((c, k) => (k === i ? { field, op: m.ops[0], value: valorPadrao } : c)));
  };
  const mudarCondicao = (i, patch) => setCondicoes((cs) => cs.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const filtered = patients.filter((p) => {
    if (fCampoValor && valorDoCampoPainel(p, fCampoValor.campo) !== fCampoValor.valor) return false;
    if (!condicoes.every((c) => evalCond(p, c))) return false;
    if (q && !p.nome.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  // Ordenacao por clique no cabeçalho da coluna - 1º clique ordena crescente,
  // 2º decrescente, 3º volta ao padrão (sem ordenação). "Lead" usa uma chave
  // propria (nome da linha, nao esta em todasColunas); as demais usam o
  // extrator "valor" de cada coluna (ver colunasFixas/colunaCustomizada).
  const alternarOrdenacao = (chave) => {
    setOrdenacao((o) => {
      if (!o || o.chave !== chave) return { chave, direcao: "asc" };
      if (o.direcao === "asc") return { chave, direcao: "desc" };
      return null;
    });
  };

  const extratorOrdenacao = ordenacao
    ? ordenacao.chave === "__nome__"
      ? (p) => p.nome?.toLowerCase() || ""
      : todasColunas.find((c) => c.chave === ordenacao.chave)?.valor
    : null;

  const listaOrdenada = extratorOrdenacao
    ? [...filtered].sort((a, b) => {
        const va = extratorOrdenacao(a), vb = extratorOrdenacao(b);
        if (va < vb) return ordenacao.direcao === "asc" ? -1 : 1;
        if (va > vb) return ordenacao.direcao === "asc" ? 1 : -1;
        return 0;
      })
    : filtered;

  if (!patients.length) {
    return (
      <div style={{ maxWidth: 560, margin: "20px auto", display: "grid", gap: 12, justifyItems: "center" }}>
        <ImportBox onImport={onImport} showToast={showToast} camposCustomizados={camposCustomizados} onCriarCampo={onCriarCampo} />
        {souAdmin && (
          <button style={s.btnGhostSm} onClick={() => setNovoLead({ nome: "", tel: "" })}>+ Adicionar 1 lead manualmente</button>
        )}
        <NovoLeadModal novoLead={novoLead} setNovoLead={setNovoLead} salvandoLead={salvandoLead} salvarNovoLead={salvarNovoLead} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {fCampoValor && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...s.tagOk, display: "inline-flex", alignItems: "center", gap: 6 }}>
            Filtro: {rotuloCampo(fCampoValor.campo)} = {fCampoValor.valor}
            <button onClick={() => setFCampoValor(null)} style={{ color: "inherit", fontSize: 13, lineHeight: 1 }} title="Remover filtro">×</button>
          </span>
        </div>
      )}
      <div style={{ ...s.toolbar, alignItems: "flex-end" }}>
        <div>
          <div style={s.fieldLabel}>Buscar</div>
          <div style={s.search}><IconSearch /><input placeholder="Nome do lead..." style={s.searchInput} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <div style={{ position: "relative" }} ref={filtroRef}>
          <div style={s.fieldLabel}>&nbsp;</div>
          <button style={{ ...s.btnGhostSm, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setFiltroAberto((o) => !o)}>
            <IconFilter color={T.ink} width={15} height={15} /> Filtro{!!condicoes.length && ` (${condicoes.length})`}
          </button>
          {filtroAberto && (
            <div className="pop" style={{ position: "absolute", top: 40, left: 0, width: 440, maxHeight: 420, overflowY: "auto", background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10, boxShadow: "0 10px 30px rgba(20,40,55,.24)", zIndex: 40, padding: 14 }}>
              {!condicoes.length && <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 8 }}>Nenhuma condição ainda - clique em "+ Condição".</div>}
              <div style={{ display: "grid", gap: 8 }}>
                {condicoes.map((c, i) => {
                  const m = filtroFieldMeta[c.field] || filtroFieldMeta[primeiroCampoFiltro];
                  return (
                    <div key={i} style={s.condRow}>
                      <select value={c.field} onChange={(e) => mudarCampoCondicao(i, e.target.value)} style={s.condSelect}>
                        {Object.entries(filtroFieldMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <select value={c.op} onChange={(e) => mudarCondicao(i, { op: e.target.value })} style={s.condSelect}>
                        {m.ops.map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
                      </select>
                      {OPS_SEM_VALOR.includes(c.op) ? (
                        <span style={{ ...s.condSelect, display: "flex", alignItems: "center", color: T.inkSoft, background: "transparent", border: "none" }}>sem valor</span>
                      ) : m.value === "number" ? (
                        <input type="number" value={c.value} onChange={(e) => mudarCondicao(i, { value: e.target.value })} style={{ ...s.condSelect, width: 84 }} />
                      ) : m.value === "date" ? (
                        <input type="date" value={c.value} onChange={(e) => mudarCondicao(i, { value: e.target.value })} style={{ ...s.condSelect, width: 150 }} />
                      ) : m.value === "text" ? (
                        <input type="text" value={c.value} onChange={(e) => mudarCondicao(i, { value: e.target.value })} placeholder="Valor..." style={s.condSelect} />
                      ) : (
                        <select value={c.value} onChange={(e) => mudarCondicao(i, { value: e.target.value })} style={s.condSelect}>
                          {(m.values || []).map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      )}
                      <button onClick={() => removerCondicao(i)} style={s.condRm}>×</button>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button style={s.btnGhostSm} onClick={adicionarCondicao}>+ Condição</button>
                {!!condicoes.length && <button style={{ ...s.btnGhostSm, color: T.coral }} onClick={() => setCondicoes([])}>Limpar condições</button>}
              </div>
            </div>
          )}
        </div>
        <button style={s.btnGhostSm} onClick={limpar}>Limpar filtros</button>
        <button style={s.btnGhostSm} onClick={() => setMaisAcoesAberto(true)}>+ Mais</button>
        <div style={{ flex: 1 }} />
        {souAdmin && (
          <button style={s.btnPrimarySm} onClick={() => setNovoLead({ nome: "", tel: "" })}>+ Novo lead</button>
        )}
      </div>
      <Card noPad>
        <div style={s.tableScroll}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.thL, cursor: "pointer", userSelect: "none" }} onClick={() => alternarOrdenacao("__nome__")}>
                  Lead{ordenacao?.chave === "__nome__" && (ordenacao.direcao === "asc" ? " ▲" : " ▼")}
                </th>
                {colunasParaMostrar.map((col) => (
                  <th key={col.chave} style={{ ...s.th, cursor: "pointer", userSelect: "none" }} onClick={() => alternarOrdenacao(col.chave)}>
                    {col.rotulo}{ordenacao?.chave === col.chave && (ordenacao.direcao === "asc" ? " ▲" : " ▼")}
                  </th>
                ))}
                {souAdmin && <th style={s.th}></th>}
              </tr>
            </thead>
            <tbody>
              {listaOrdenada.slice(0, 200).map((p) => (
                <tr key={p.id} className="prow" onClick={() => onAbrirPaciente(p, "dados")}>
                  <td style={s.tdL}>
                    <div style={{ fontWeight: 600, color: T.primary }}>{p.nome}</div>
                    <div style={{ fontSize: 11.5, color: T.inkSoft }}>{p.cod} · {p.tel || "sem telefone"}</div>
                  </td>
                  {colunasParaMostrar.map((col) => (
                    <td key={col.chave} style={col.numerica ? s.tdNum : s.td}>{col.render(p)}</td>
                  ))}
                  {souAdmin && (
                    <td style={s.td} onClick={(e) => e.stopPropagation()}>
                      <DotMenu items={[{ label: "Excluir lead", danger: true, onClick: () => excluirLead(p) }]} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ fontSize: 12.5, color: T.inkSoft }}>Mostrando {Math.min(200, filtered.length)} de {filtered.length}. Clique num lead para ver o cadastro. O "Exportar Lead" já sai com suas edições.</div>

      {maisAcoesAberto && (
        <MaisAcoesDrawer onFechar={() => setMaisAcoesAberto(false)}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Colunas visíveis</div>
            {souGestorOuAdmin ? (
              <div style={{ display: "grid", gap: 4 }}>
                {todasColunas.map((col) => (
                  <label key={col.chave} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.ink }}>
                    <input type="checkbox" checked={(colunasVisiveis || []).includes(col.chave)} onChange={() => alternarColuna(col.chave)} />
                    {col.rotulo}
                  </label>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: T.inkSoft }}>Só ADMIN/GESTOR pode escolher as colunas.</div>
            )}
          </div>

          <div style={{ height: 1, background: T.line }} />

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Importar / exportar</div>
            <ImportBox onImport={onImport} showToast={showToast} variant="button" camposCustomizados={camposCustomizados} onCriarCampo={onCriarCampo} />
            <button style={{ ...s.btnGhostSm, justifyContent: "flex-start" }} onClick={() => exportarXlsx(patients)}><IconDownload color={T.ink} /> Exportar Lead</button>
            {souAdmin && (
              <button style={{ ...s.btnGhostSm, justifyContent: "flex-start" }} disabled={unificando} onClick={unificar} title="Junta cadastros com o mesmo telefone, sem apagar dado">
                {unificando ? "Unificando..." : "Unificar duplicados"}
              </button>
            )}
          </div>

          <div style={{ height: 1, background: T.line }} />

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Campos personalizados</div>
            <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>
              Crie campos extras pro cadastro do lead — eles viram uma condição disponível em Segmentações.
            </div>
            <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              {!(camposCustomizados || []).length && <span style={{ fontSize: 13, color: T.inkSoft }}>Nenhum campo personalizado ainda.</span>}
              {(camposCustomizados || []).map((campo) => (
                <div key={campo.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: T.lineSoft, borderRadius: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, flex: 1 }}>{campo.nome}</span>
                  <span style={{ fontSize: 11, color: T.inkSoft }}>{TIPOS_CAMPO.find((t) => t.valor === campo.tipo)?.rotulo}</span>
                  <DotMenu
                    items={[
                      { label: "Editar", onClick: () => setCampoForm({ id: campo.id, nome: campo.nome, tipo: campo.tipo, opcoes: (campo.opcoes || []).join(", ") }) },
                      { label: "Excluir", danger: true, onClick: () => excluirCampo(campo) },
                    ]}
                  />
                </div>
              ))}
            </div>
            {campoForm ? (
              <div style={{ border: `1.5px dashed ${T.line}`, borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
                <input style={s.input} placeholder="Nome do campo (ex: Convênio)" value={campoForm.nome} onChange={(e) => setCampoForm({ ...campoForm, nome: e.target.value })} />
                <Select block value={campoForm.tipo} onChange={(v) => setCampoForm({ ...campoForm, tipo: v })} options={TIPOS_CAMPO.map((t) => t.valor)} labels={Object.fromEntries(TIPOS_CAMPO.map((t) => [t.valor, t.rotulo]))} />
                {campoForm.tipo === "LISTA" && (
                  <input style={s.input} placeholder="Opções separadas por vírgula" value={campoForm.opcoes} onChange={(e) => setCampoForm({ ...campoForm, opcoes: e.target.value })} />
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setCampoForm(null)}>Cancelar</button>
                  <button style={{ ...s.btnPrimary, flex: 1 }} onClick={salvarCampo}>Salvar</button>
                </div>
              </div>
            ) : (
              <button style={s.btnGhostSm} onClick={() => setCampoForm({ id: null, nome: "", tipo: "TEXTO", opcoes: "" })}>+ Novo campo</button>
            )}
          </div>
        </MaisAcoesDrawer>
      )}

      <NovoLeadModal novoLead={novoLead} setNovoLead={setNovoLead} salvandoLead={salvandoLead} salvarNovoLead={salvarNovoLead} />
    </div>
  );
}

// Extraido pra ser usado tanto na tela normal quanto na tela vazia (so
// ImportBox) - antes so existia depois do "return" da tela com dados, entao
// sumia inteiro (junto com o botao "+ Novo lead") quando a base tinha 0 leads,
// sem nenhum jeito de cadastrar 1 lead manual nesse estado.
function NovoLeadModal({ novoLead, setNovoLead, salvandoLead, salvarNovoLead }) {
  if (!novoLead) return null;
  return (
    <Modal title="Novo lead" onClose={() => setNovoLead(null)}>
      <Field label="Nome"><input style={s.input} value={novoLead.nome} onChange={(e) => setNovoLead({ ...novoLead, nome: e.target.value })} /></Field>
      <Field label="Telefone (com DDD)"><input style={s.input} value={novoLead.tel} onChange={(e) => setNovoLead({ ...novoLead, tel: e.target.value })} placeholder="(12) 99999-9999" /></Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setNovoLead(null)}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex: 1, opacity: salvandoLead ? .6 : 1 }} onClick={salvarNovoLead} disabled={salvandoLead}>{salvandoLead ? "Salvando..." : "Criar lead"}</button>
      </div>
    </Modal>
  );
}

// Painel lateral (da direita, com overlay) pra tirar Colunas/Importar/Exportar/
// Unificar duplicados/Campo personalizado da toolbar principal - a caixa de
// busca fica mais em evidência, as ações menos usadas ficam aqui dentro.
function MaisAcoesDrawer({ onFechar, children }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(20,40,55,.32)", zIndex: 55 }} onClick={onFechar} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(360px,92vw)", background: "#fff", zIndex: 56, boxShadow: "-10px 0 30px rgba(20,40,55,.18)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: `1px solid ${T.line}` }}>
          <span style={{ fontWeight: 700, fontSize: 14.5, color: T.ink }}>Mais ações</span>
          <button onClick={onFechar} title="Fechar" style={{ width: 26, height: 26, borderRadius: 8, background: T.lineSoft, color: T.inkSoft, fontSize: 15, display: "grid", placeItems: "center" }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "grid", gap: 14 }}>{children}</div>
      </div>
    </>
  );
}
