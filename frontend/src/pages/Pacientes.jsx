import { useEffect, useState } from "react";
import { T } from "../theme";
import { listEtapas } from "../api/etapas";
import { s } from "../styles/s";
import { exportarXlsx } from "../utils/patients";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { ImportBox } from "../components/ui/ImportBox";
import { IconSearch, IconDownload } from "../components/icons";

export function Pacientes({ patients, tags, onImport, showToast, filtroInicial, onAbrirPaciente }) {
  const [fSeg, setFSeg] = useState("Todos");
  const [fEstagio, setFEstagio] = useState("Todos");
  const [fEleg, setFEleg] = useState(filtroInicial?.eleg || "Todos");
  const [fTag, setFTag] = useState("Todas");
  const [q, setQ] = useState("");
  const [etapas, setEtapas] = useState([]);

  useEffect(() => { listEtapas().then(setEtapas).catch(() => setEtapas([])); }, []);

  const limpar = () => { setFSeg("Todos"); setFEstagio("Todos"); setFEleg("Todos"); setFTag("Todas"); setQ(""); };

  const filtered = patients.filter((p) => {
    if (fSeg !== "Todos" && p.segmento !== fSeg) return false;
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
        <div><div style={s.fieldLabel}>Segmento</div><Select value={fSeg} onChange={setFSeg} options={["Todos", "VIP", "Fidelizado", "Regular", "Risco", "Inativo"]} /></div>
        <div><div style={s.fieldLabel}>Estágio</div><Select value={fEstagio} onChange={setFEstagio} options={["Todos", ...etapas.map((e) => e.nome)]} /></div>
        <div><div style={s.fieldLabel}>Elegibilidade</div><Select value={fEleg} onChange={setFEleg} options={["Todos", "Elegíveis", "A corrigir"]} /></div>
        <div><div style={s.fieldLabel}>Tag</div><Select value={fTag} onChange={setFTag} options={["Todas", ...tags]} /></div>
        <button style={s.btnGhostSm} onClick={limpar}>Limpar filtros</button>
        <div style={{ flex: 1 }} />
        <button style={s.btnGhostSm} onClick={() => exportarXlsx(patients)}><IconDownload color={T.ink} /> Exportar Lead</button>
      </div>
      <Card noPad>
        <div style={s.tableScroll}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thL}>Lead</th><th style={s.th}>Segmento</th><th style={s.th}>Estágio</th><th style={s.th}>Financeiro</th>
                <th style={s.th}>Dentista</th><th style={s.th}>Recência</th><th style={s.th}>Elegível</th><th style={s.th}>Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((p) => {
                const col = T.seg[p.segmento] || T.seg.Regular;
                const colEstagio = T.estagio[p.estagio] || T.estagio.Lead;
                return (
                  <tr key={p.id} className="prow" onClick={() => onAbrirPaciente(p, "dados")}>
                    <td style={s.tdL}>
                      <div style={{ fontWeight: 600, color: T.primary }}>{p.nome}</div>
                      <div style={{ fontSize: 11.5, color: T.inkSoft }}>{p.cod} · {p.tel || "sem telefone"}</div>
                    </td>
                    <td style={s.td}><span style={{ ...s.segBadge, color: col.fg, background: col.bg }}>{p.segmento}</span></td>
                    <td style={s.td}><span style={{ ...s.segBadge, color: colEstagio.fg, background: colEstagio.bg }}>{p.estagio || "Lead"}</span></td>
                    <td style={s.td}><span style={{ fontSize: 12.5, color: p.financ === "Inadimplente" ? T.coral : T.inkSoft, fontWeight: 600 }}>{p.financ}</span></td>
                    <td style={s.tdNum}>{p.dentista || "—"}</td>
                    <td style={s.tdNum}>{p.recencia != null ? p.recencia + "d" : "—"}</td>
                    <td style={s.td}>{p.elegivel ? <span style={s.tagOk}>● Sim</span> : <span style={s.tagBad}>▲ Não</span>}</td>
                    <td style={s.td}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(p.tags || []).map((t) => <span key={t} style={s.tagChip}>{t}</span>)}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ fontSize: 12.5, color: T.inkSoft }}>Mostrando {Math.min(200, filtered.length)} de {filtered.length}. Clique num lead para ver o cadastro. O "Exportar Lead" já sai com suas edições.</div>
    </div>
  );
}
