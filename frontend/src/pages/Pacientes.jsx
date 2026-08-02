import { useEffect, useRef, useState } from "react";
import { T } from "../theme";
import { listEtapas } from "../api/etapas";
import { s } from "../styles/s";
import { exportarXlsx } from "../utils/patients";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { ImportBox } from "../components/ui/ImportBox";
import { IconSearch, IconDownload } from "../components/icons";

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
    { chave: "recencia", rotulo: "Recência", render: (p) => (p.recencia != null ? p.recencia + "d" : "—"), numerica: true },
    { chave: "elegivel", rotulo: "Elegível", render: (p) => (p.elegivel ? <span style={s.tagOk}>● Sim</span> : <span style={s.tagBad}>▲ Não</span>) },
  ];
}

function colunaCustomizada(campo) {
  return {
    chave: `custom:${campo.nome}`,
    rotulo: campo.nome,
    render: (p) => p.camposCustomizados?.[campo.nome] || "—",
    numerica: campo.tipo === "NUMERO" || campo.tipo === "DATA",
  };
}

// Seletor de quais colunas aparecem, editável só por ADMIN/GESTOR - a
// escolha vale pra todo mundo (configuração única, não por pessoa).
function SeletorColunas({ todasColunas, colunasVisiveis, onAtualizar }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const alternar = (chave) => {
    const novas = colunasVisiveis.includes(chave) ? colunasVisiveis.filter((c) => c !== chave) : [...colunasVisiveis, chave];
    onAtualizar(novas);
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button style={s.btnGhostSm} onClick={() => setAberto((o) => !o)}>Colunas</button>
      {aberto && (
        <div className="pop" style={{
          position: "absolute", top: 36, right: 0, minWidth: 220, maxHeight: 280, overflowY: "auto",
          background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10,
          boxShadow: "0 10px 30px rgba(20,40,55,.14)", zIndex: 40, padding: 6,
        }}>
          {todasColunas.map((col) => (
            <label key={col.chave} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, fontSize: 13, fontWeight: 600, color: T.ink, cursor: "pointer" }} className="navItem">
              <input type="checkbox" checked={colunasVisiveis.includes(col.chave)} onChange={() => alternar(col.chave)} />
              {col.rotulo}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function Pacientes({ patients, tags, onImport, showToast, filtroInicial, onAbrirPaciente, onUnificarDuplicados, usuario, camposCustomizados, colunasVisiveis, onAtualizarColunas }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const souGestorOuAdmin = usuario?.papel === "ADMIN" || usuario?.papel === "GESTOR";
  const [fEstagio, setFEstagio] = useState("Todos");
  const [fEleg, setFEleg] = useState(filtroInicial?.eleg || "Todos");
  const [fTag, setFTag] = useState("Todas");
  const [q, setQ] = useState("");
  const [etapas, setEtapas] = useState([]);
  const [unificando, setUnificando] = useState(false);

  const todasColunas = [...colunasFixas(), ...(camposCustomizados || []).map(colunaCustomizada)];
  const colunasParaMostrar = todasColunas.filter((c) => (colunasVisiveis || []).includes(c.chave));

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
    return <div style={{ maxWidth: 560, margin: "20px auto" }}><ImportBox onImport={onImport} showToast={showToast} /></div>;
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
        <div style={{ flex: 1 }} />
        {souGestorOuAdmin && (
          <SeletorColunas todasColunas={todasColunas} colunasVisiveis={colunasVisiveis || []} onAtualizar={onAtualizarColunas} />
        )}
        {souAdmin && (
          <button style={s.btnGhostSm} disabled={unificando} onClick={unificar} title="Junta cadastros com o mesmo telefone, sem apagar dado">
            {unificando ? "Unificando..." : "Unificar duplicados"}
          </button>
        )}
        <ImportBox onImport={onImport} showToast={showToast} variant="button" />
        <button style={s.btnGhostSm} onClick={() => exportarXlsx(patients)}><IconDownload color={T.ink} /> Exportar Lead</button>
      </div>
      <Card noPad>
        <div style={s.tableScroll}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thL}>Lead</th>
                {colunasParaMostrar.map((col) => <th key={col.chave} style={s.th}>{col.rotulo}</th>)}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ fontSize: 12.5, color: T.inkSoft }}>Mostrando {Math.min(200, filtered.length)} de {filtered.length}. Clique num lead para ver o cadastro. O "Exportar Lead" já sai com suas edições.</div>
    </div>
  );
}
