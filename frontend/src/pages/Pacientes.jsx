import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { exportarXlsx } from "../utils/patients";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { ImportBox } from "../components/ui/ImportBox";
import { IconSearch, IconDownload } from "../components/icons";

export function Pacientes({ patients, onSalvarPaciente, tags, onImport, showToast }) {
  const [fSeg, setFSeg] = useState("Todos");
  const [fEleg, setFEleg] = useState("Todos");
  const [fTag, setFTag] = useState("Todas");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);

  const limpar = () => { setFSeg("Todos"); setFEleg("Todos"); setFTag("Todas"); setQ(""); };

  const filtered = patients.filter((p) => {
    if (fSeg !== "Todos" && p.segmento !== fSeg) return false;
    if (fEleg === "Elegíveis" && !p.elegivel) return false;
    if (fEleg === "A corrigir" && p.elegivel) return false;
    if (fTag !== "Todas" && !(p.tags || []).includes(fTag)) return false;
    if (q && !p.nome.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const salvarEdit = async (novo) => {
    try {
      await onSalvarPaciente(novo);
      setEdit(null);
      showToast("Cadastro atualizado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar", "warn");
    }
  };

  if (!patients.length) {
    return <div style={{ maxWidth: 560, margin: "20px auto" }}><ImportBox onImport={onImport} showToast={showToast} /></div>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={s.toolbar}>
        <div style={s.search}><IconSearch /><input placeholder="Buscar paciente..." style={s.searchInput} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={fSeg} onChange={setFSeg} options={["Todos", "VIP", "Fidelizado", "Regular", "Risco", "Inativo"]} />
        <Select value={fEleg} onChange={setFEleg} options={["Todos", "Elegíveis", "A corrigir"]} />
        <Select value={fTag} onChange={setFTag} options={["Todas", ...tags]} />
        <button style={s.btnGhostSm} onClick={limpar}>Limpar filtros</button>
        <div style={{ flex: 1 }} />
        <button style={s.btnGhostSm} onClick={() => exportarXlsx(patients)}><IconDownload color={T.ink} /> Exportar base</button>
      </div>
      <Card noPad>
        <div style={s.tableScroll}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thL}>Paciente</th><th style={s.th}>Segmento</th><th style={s.th}>Financeiro</th>
                <th style={s.th}>Dentista</th><th style={s.th}>Recência</th><th style={s.th}>Elegível</th><th style={s.th}>Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((p) => {
                const col = T.seg[p.segmento] || T.seg.Regular;
                return (
                  <tr key={p.id} className="prow" onClick={() => setEdit({ ...p })}>
                    <td style={s.tdL}>
                      <div style={{ fontWeight: 600, color: T.primary }}>{p.nome}</div>
                      <div style={{ fontSize: 11.5, color: T.inkSoft }}>{p.cod} · {p.tel || "sem telefone"}</div>
                    </td>
                    <td style={s.td}><span style={{ ...s.segBadge, color: col.fg, background: col.bg }}>{p.segmento}</span></td>
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
      <div style={{ fontSize: 12.5, color: T.inkSoft }}>Mostrando {Math.min(200, filtered.length)} de {filtered.length}. Clique num paciente para editar o cadastro. O "Exportar base" já sai com suas edições.</div>
      {edit && <EditarPaciente paciente={edit} tags={tags} onSave={salvarEdit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EditarPaciente({ paciente, tags, onSave, onClose }) {
  const [p, setP] = useState(paciente);
  const [dirty, setDirty] = useState(false);
  const set = (k, v) => { setP((x) => ({ ...x, [k]: v })); setDirty(true); };
  const toggleTag = (t) => {
    setP((x) => ({ ...x, tags: (x.tags || []).includes(t) ? x.tags.filter((y) => y !== t) : [...(x.tags || []), t] }));
    setDirty(true);
  };

  return (
    <Modal title={`Editar: ${paciente.nome}`} onClose={onClose} dirty={dirty} onSave={() => onSave(p)} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Nome"><input style={s.input} value={p.nome} onChange={(e) => set("nome", e.target.value)} /></Field>
        <Field label="Código"><input style={s.input} value={p.cod} onChange={(e) => set("cod", e.target.value)} /></Field>
        <Field label="Telefone"><input style={s.input} value={p.tel} onChange={(e) => set("tel", e.target.value)} /></Field>
        <Field label="Email"><input style={s.input} value={p.email} onChange={(e) => set("email", e.target.value)} placeholder="email@paciente.com" /></Field>
        <Field label="Segmento"><Select block value={p.segmento} onChange={(v) => set("segmento", v)} options={["VIP", "Fidelizado", "Regular", "Risco", "Inativo"]} /></Field>
        <Field label="Financeiro"><Select block value={p.financ} onChange={(v) => set("financ", v)} options={["Adimplente", "Inadimplente", "—"]} /></Field>
        <Field label="Dentista"><input style={s.input} value={p.dentista} onChange={(e) => set("dentista", e.target.value)} /></Field>
        <Field label="Elegível p/ disparo"><Select block value={p.elegivel ? "Sim" : "Não"} onChange={(v) => set("elegivel", v === "Sim")} options={["Sim", "Não"]} /></Field>
      </div>
      <Field label="Tags">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tags.map((t) => {
            const on = (p.tags || []).includes(t);
            return (
              <button key={t} onClick={() => toggleTag(t)} style={{ ...s.tagChipBig, cursor: "pointer", opacity: on ? 1 : .45, outline: on ? `1.5px solid ${T.primary}` : "none" }}>
                # {t}
              </button>
            );
          })}
        </div>
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex: 1 }} onClick={() => onSave(p)}>Salvar alterações</button>
      </div>
    </Modal>
  );
}
