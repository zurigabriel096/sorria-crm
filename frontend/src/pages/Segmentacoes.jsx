import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { FIELD_META, OP_LABEL } from "../data/seed";
import { matchSeg } from "../utils/patients";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";

export function Segmentacoes({ patients, segmentos, setSegmentos, tags, setTags, showToast }) {
  const [builder, setBuilder] = useState(null);
  const [novaTag, setNovaTag] = useState("");
  const [buscaTag, setBuscaTag] = useState("Todas");

  const salvar = () => {
    if (!builder.nome.trim()) return showToast("Dê um nome", "warn");
    setSegmentos((s2) => {
      const ex = s2.find((x) => x.id === builder.id);
      return ex ? s2.map((x) => (x.id === builder.id ? builder : x)) : [builder, ...s2];
    });
    setBuilder(null);
    showToast("Segmentação salva", "ok");
  };

  const criarTag = () => {
    const t = novaTag.trim();
    if (!t) return;
    if (tags.includes(t)) return showToast("Tag já existe", "warn");
    setTags((ts) => [...ts, t]);
    setNovaTag("");
    showToast(`Tag "${t}" criada`, "ok");
  };

  const busca = buscaTag === "Todas" ? [] : patients.filter((p) => (p.tags || []).includes(buscaTag));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }} className="dashGrid">
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Suas segmentações</div>
          <button style={s.btnPrimarySm} onClick={() => setBuilder({ id: Date.now(), nome: "", match: "E", conditions: [{ field: "recencia", op: "maior", value: 120 }] })}>+ Nova</button>
        </div>
        {segmentos.map((seg) => {
          const count = patients.filter((p) => matchSeg(p, seg)).length;
          return (
            <div key={seg.id} style={s.segCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.ink }}>{seg.nome}</div>
                  <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>
                    {seg.conditions.map((c, i) => (
                      <span key={i}>
                        {i > 0 && <b style={{ color: seg.match === "OU" ? T.coral : T.primary }}> {seg.match} </b>}
                        {FIELD_META[c.field].label} {OP_LABEL[c.op]} <b style={{ color: T.ink }}>{String(c.value)}</b>
                      </span>
                    ))}
                  </div>
                </div>
                <span style={s.countPill}>{count}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button style={s.btnGhostSm} onClick={() => setBuilder(JSON.parse(JSON.stringify(seg)))}>Editar</button>
                <button style={s.btnGhostSm} onClick={() => { setSegmentos((s2) => s2.filter((x) => x.id !== seg.id)); showToast("Removida", "ok"); }}>Excluir</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <Card title="Tags">
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input style={{ ...s.input, height: 38 }} placeholder="Nova tag..." value={novaTag} onChange={(e) => setNovaTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && criarTag()} />
            <button style={s.btnPrimarySm} onClick={criarTag}>Criar</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{tags.map((t) => <span key={t} style={s.tagChipBig}># {t}</span>)}</div>
        </Card>
        <Card title="Buscar por tag">
          <Select block value={buscaTag} onChange={setBuscaTag} options={["Todas", ...tags]} />
          <div style={{ marginTop: 12, display: "grid", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {buscaTag === "Todas" ? (
              <span style={{ fontSize: 13, color: T.inkSoft }}>Escolha uma tag.</span>
            ) : busca.length ? (
              busca.slice(0, 40).map((p) => (
                <div key={p.id} style={s.tagResult}>
                  <b style={{ color: T.ink }}>{p.nome}</b>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: T.inkSoft }}>{p.segmento}</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 13, color: T.inkSoft }}>Nenhum paciente.</span>
            )}
          </div>
        </Card>
      </div>
      {builder && <SegBuilder builder={builder} setBuilder={setBuilder} tags={tags} patients={patients} onSave={salvar} onClose={() => setBuilder(null)} />}
    </div>
  );
}

function SegBuilder({ builder, setBuilder, tags, patients, onSave, onClose }) {
  const set = (patch) => setBuilder({ ...builder, ...patch });
  const setCond = (i, patch) => set({ conditions: builder.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const changeField = (i, field) => {
    const m = FIELD_META[field];
    setCond(i, { field, op: m.ops[0], value: m.value === "number" ? 0 : field === "tag" ? (tags[0] || "") : m.values[0] });
  };
  const preview = patients.filter((p) => matchSeg(p, builder)).length;

  return (
    <Modal title={builder.nome ? "Editar segmentação" : "Nova segmentação"} onClose={onClose} wide>
      <Field label="Nome"><input style={s.input} value={builder.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex: Reativação +120D" /></Field>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: T.inkSoft }}>Combinar com</span>
        <div style={s.toggle}>
          {["E", "OU"].map((m) => (
            <button key={m} onClick={() => set({ match: m })} style={{ ...s.toggleBtn, ...(builder.match === m ? { background: m === "OU" ? T.coral : T.primary, color: "#fff" } : {}) }}>{m}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: T.inkSoft }}>{builder.match === "E" ? "(todas)" : "(qualquer)"}</span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {builder.conditions.map((c, i) => {
          const m = FIELD_META[c.field];
          return (
            <div key={i} style={s.condRow}>
              <span style={{ width: 24, fontSize: 12, fontWeight: 700, color: i > 0 ? (builder.match === "OU" ? T.coral : T.primary) : "transparent" }}>{i > 0 ? builder.match : ""}</span>
              <select value={c.field} onChange={(e) => changeField(i, e.target.value)} style={s.condSelect}>
                {Object.entries(FIELD_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={c.op} onChange={(e) => setCond(i, { op: e.target.value })} style={s.condSelect}>
                {m.ops.map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
              </select>
              {m.value === "number" ? (
                <input type="number" value={c.value} onChange={(e) => setCond(i, { value: e.target.value })} style={{ ...s.condSelect, width: 84 }} />
              ) : (
                <select value={c.value} onChange={(e) => setCond(i, { value: e.target.value })} style={s.condSelect}>
                  {(c.field === "tag" ? tags : m.values).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              )}
              <button onClick={() => set({ conditions: builder.conditions.filter((_, j) => j !== i) })} style={s.condRm}>×</button>
            </div>
          );
        })}
      </div>
      <button style={{ ...s.btnGhostSm, marginTop: 10 }} onClick={() => set({ conditions: [...builder.conditions, { field: "segmento", op: "é", value: "VIP" }] })}>+ Condição</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, padding: "12px 14px", background: T.primarySoft, borderRadius: 12 }}>
        <span style={{ fontSize: 13, color: T.primaryDark, fontWeight: 600 }}>Captura agora:</span>
        <b style={{ fontSize: 18, color: T.primaryDark }}>{preview} pacientes</b>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex: 1 }} onClick={onSave}>Salvar</button>
      </div>
    </Modal>
  );
}
