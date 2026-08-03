import { useEffect, useState } from "react";
import { T } from "../theme";
import { listEtapas } from "../api/etapas";
import { s } from "../styles/s";
import { exportarXlsx } from "../utils/patients";
import { brl } from "../utils/format";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { ImportBox } from "../components/ui/ImportBox";
import { IconSearch, IconDownload } from "../components/icons";

const TIPOS_CAMPO = [
  { valor: "TEXTO", rotulo: "Texto" },
  { valor: "NUMERO", rotulo: "Número" },
  { valor: "MOEDA", rotulo: "Dinheiro (R$)" },
  { valor: "DATA", rotulo: "Data" },
  { valor: "LISTA", rotulo: "Lista de opções" },
];

// Colunas fixas que a tabela sempre teve. "Lead" (nome+telefone) não entra
// aqui - é a identificação da linha, sempre visível, não faz sentido esconder.
function colunasFixas() {
  return [
    { chave: "estagio", rotulo: "Estágio", render: (p) => {
      const col = T.estagio[p.estagio] || T.estagio.Lead;
      return <span style={{ ...s.segBadge, color: col.fg, background: col.bg }}>{p.estagio || "Lead"}</span>;
    } },
    { chave: "financ", rotulo: "Financeiro", render: (p) => (
      <span style={{ fontSize: 12.5, color: p.financ === "Inadimplente" ? T.coral : T.inkSoft, fontWeight: 600 }}>{p.financ}</span>
    ) },
    { chave: "dentista", rotulo: "Dentista", render: (p) => p.dentista || "—", numerica: true },
    { chave: "recencia", rotulo: "Data do último atendimento", render: (p) => p.ultAtend || "—", numerica: true },
    { chave: "elegivel", rotulo: "Elegível", render: (p) => (p.elegivel ? <span style={s.tagOk}>● Sim</span> : <span style={s.tagBad}>▲ Não</span>) },
  ];
}

function colunaCustomizada(campo) {
  return {
    chave: `custom:${campo.nome}`,
    rotulo: campo.nome,
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
  const [fEstagio, setFEstagio] = useState("Todos");
  const [fEleg, setFEleg] = useState(filtroInicial?.eleg || "Todos");
  const [fTag, setFTag] = useState("Todas");
  const [q, setQ] = useState("");
  const [etapas, setEtapas] = useState([]);
  const [unificando, setUnificando] = useState(false);
  const [maisAcoesAberto, setMaisAcoesAberto] = useState(false);
  const [campoForm, setCampoForm] = useState(null); // null | {id,nome,tipo,opcoes}
  const [novoLead, setNovoLead] = useState(null); // null | {nome, tel}
  const [salvandoLead, setSalvandoLead] = useState(false);

  const todasColunas = [...colunasFixas(), ...(camposCustomizados || []).map(colunaCustomizada)];
  const colunasParaMostrar = todasColunas.filter((c) => (colunasVisiveis || []).includes(c.chave));

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

  const limpar = () => { setFEstagio("Todos"); setFEleg("Todos"); setFTag("Todas"); setQ(""); };

  const filtered = patients.filter((p) => {
    if (fEstagio !== "Todos" && p.estagio !== fEstagio) return false;
    if (fEleg === "Elegíveis" && !p.elegivel) return false;
    if (fEleg === "A corrigir" && p.elegivel) return false;
    if (fTag !== "Todas" && !(p.tags || []).includes(fTag)) return false;
    if (q && !p.nome.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

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
      <div style={{ ...s.toolbar, alignItems: "flex-end" }}>
        <div>
          <div style={s.fieldLabel}>Buscar</div>
          <div style={s.search}><IconSearch /><input placeholder="Nome do lead..." style={s.searchInput} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <div><div style={s.fieldLabel}>Estágio</div><Select value={fEstagio} onChange={setFEstagio} options={["Todos", ...etapas.map((e) => e.nome)]} /></div>
        <div><div style={s.fieldLabel}>Elegibilidade</div><Select value={fEleg} onChange={setFEleg} options={["Todos", "Elegíveis", "A corrigir"]} /></div>
        <div><div style={s.fieldLabel}>Tag</div><Select value={fTag} onChange={setFTag} options={["Todas", ...tags]} /></div>
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
                <th style={s.thL}>Lead</th>
                {colunasParaMostrar.map((col) => <th key={col.chave} style={s.th}>{col.rotulo}</th>)}
                {souAdmin && <th style={s.th}></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((p) => (
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
