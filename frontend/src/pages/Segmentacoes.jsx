import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { FIELD_META, OP_LABEL } from "../data/seed";
import { matchSeg } from "../utils/patients";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";

const novaCondicao = () => ({ field: "segmento", op: "é", value: "VIP" });
const novoGrupo = () => [{ field: "recencia", op: "maior", value: 120 }];
const contagemLabel = (n) => (n === 1 ? "1 paciente" : `${n} pacientes`);

export function Segmentacoes({ patients, segmentos, setSegmentos, tags, setTags, showToast }) {
  const [builder, setBuilder] = useState(null);
  const [novaTag, setNovaTag] = useState("");
  const [buscaTag, setBuscaTag] = useState("Todas");
  const [tagEditando, setTagEditando] = useState(null);
  const [tagEditValor, setTagEditValor] = useState("");

  const salvar = () => {
    if (!builder.nome.trim()) return showToast("Dê um nome", "warn");
    setSegmentos((s2) => {
      const ex = s2.find((x) => x.id === builder.id);
      return ex ? s2.map((x) => (x.id === builder.id ? builder : x)) : [builder, ...s2];
    });
    setBuilder(null);
    showToast("Segmentação salva", "ok");
  };

  const duplicar = (seg) => {
    const copia = { ...JSON.parse(JSON.stringify(seg)), id: Date.now(), nome: `${seg.nome} (cópia)` };
    setSegmentos((s2) => [copia, ...s2]);
    showToast("Segmentação duplicada", "ok");
  };

  const criarTag = () => {
    const t = novaTag.trim();
    if (!t) return;
    if (tags.includes(t)) return showToast("Tag já existe", "warn");
    setTags((ts) => [...ts, t]);
    setNovaTag("");
    showToast(`Tag "${t}" criada`, "ok");
  };

  const salvarEdicaoTag = () => {
    const novo = tagEditValor.trim();
    if (!novo) return;
    setTags((ts) => ts.map((t) => (t === tagEditando ? novo : t)));
    setTagEditando(null);
    showToast("Tag renomeada", "ok");
  };

  const excluirTag = (t) => {
    setTags((ts) => ts.filter((x) => x !== t));
    if (buscaTag === t) setBuscaTag("Todas");
    showToast(`Tag "${t}" removida`, "ok");
  };

  const busca = buscaTag === "Todas" ? [] : patients.filter((p) => (p.tags || []).includes(buscaTag));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }} className="dashGrid">
      <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Suas segmentações</div>
          <button style={s.btnPrimarySm} onClick={() => setBuilder({ id: Date.now(), nome: "", groups: [novoGrupo()] })}>+ Nova segmentação</button>
        </div>
        {segmentos.map((seg) => {
          const count = patients.filter((p) => matchSeg(p, seg)).length;
          return (
            <div key={seg.id} style={s.segCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.ink }}>{seg.nome}</div>
                  <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>
                    {seg.groups.map((group, gi) => (
                      <span key={gi}>
                        {gi > 0 && <b style={{ color: T.coral }}> OU </b>}
                        {group.map((c, i) => (
                          <span key={i}>
                            {i > 0 && <b style={{ color: T.primary }}> E </b>}
                            {FIELD_META[c.field].label} {OP_LABEL[c.op]} <b style={{ color: T.ink }}>{String(c.value)}</b>
                          </span>
                        ))}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
                  <span style={s.countPill}>{contagemLabel(count)}</span>
                  <DotMenu
                    items={[
                      { label: "Editar", onClick: () => setBuilder(JSON.parse(JSON.stringify(seg))) },
                      { label: "Duplicar", onClick: () => duplicar(seg) },
                      { label: "Excluir", danger: true, onClick: () => { setSegmentos((s2) => s2.filter((x) => x.id !== seg.id)); showToast("Removida", "ok"); } },
                    ]}
                  />
                </div>
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
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tags.map((t) =>
              tagEditando === t ? (
                <span key={t} style={{ display: "inline-flex", gap: 4 }}>
                  <input
                    autoFocus
                    style={{ ...s.input, height: 28, width: 120, fontSize: 12.5 }}
                    value={tagEditValor}
                    onChange={(e) => setTagEditValor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && salvarEdicaoTag()}
                  />
                  <button style={s.btnGhostSm} onClick={salvarEdicaoTag}>OK</button>
                </span>
              ) : (
                <span key={t} style={{ ...s.tagChipBig, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  # {t}
                  <DotMenu
                    items={[
                      { label: "Editar", onClick: () => { setTagEditando(t); setTagEditValor(t); } },
                      { label: "Excluir", danger: true, onClick: () => excluirTag(t) },
                    ]}
                  />
                </span>
              )
            )}
          </div>
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

  const setCond = (gi, ci, patch) =>
    set({ groups: builder.groups.map((g, j) => (j === gi ? g.map((c, k) => (k === ci ? { ...c, ...patch } : c)) : g)) });

  const changeField = (gi, ci, field) => {
    const m = FIELD_META[field];
    setCond(gi, ci, { field, op: m.ops[0], value: m.value === "number" ? 0 : field === "tag" ? (tags[0] || "") : m.values[0] });
  };

  const addCondicao = (gi) => set({ groups: builder.groups.map((g, j) => (j === gi ? [...g, novaCondicao()] : g)) });

  const removeCondicao = (gi, ci) =>
    set({
      groups: builder.groups
        .map((g, j) => (j === gi ? g.filter((_, k) => k !== ci) : g))
        .filter((g, j) => g.length > 0 || builder.groups.length === 1),
    });

  const addGrupo = () => set({ groups: [...builder.groups, novoGrupo()] });
  const removeGrupo = (gi) => set({ groups: builder.groups.filter((_, j) => j !== gi) });

  const preview = patients.filter((p) => matchSeg(p, builder)).length;

  return (
    <Modal title={builder.nome ? "Editar segmentação" : "Nova segmentação"} onClose={onClose} wide>
      <Field label="Nome"><input style={s.input} value={builder.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex: Reativação +120D" /></Field>

      {builder.groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: 10 }}>
          {gi > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
              <div style={{ flex: 1, height: 1, background: T.line }} />
              <b style={{ fontSize: 12, color: T.coral }}>OU</b>
              <div style={{ flex: 1, height: 1, background: T.line }} />
            </div>
          )}
          <div style={{ border: `1.5px dashed ${T.line}`, borderRadius: 12, padding: 10 }}>
            <div style={{ display: "grid", gap: 8 }}>
              {group.map((c, ci) => {
                const m = FIELD_META[c.field];
                return (
                  <div key={ci} style={s.condRow}>
                    <span style={{ width: 24, fontSize: 12, fontWeight: 700, color: ci > 0 ? T.primary : "transparent" }}>{ci > 0 ? "E" : ""}</span>
                    <select value={c.field} onChange={(e) => changeField(gi, ci, e.target.value)} style={s.condSelect}>
                      {Object.entries(FIELD_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={c.op} onChange={(e) => setCond(gi, ci, { op: e.target.value })} style={s.condSelect}>
                      {m.ops.map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
                    </select>
                    {m.value === "number" ? (
                      <input type="number" value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} style={{ ...s.condSelect, width: 84 }} />
                    ) : (
                      <select value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} style={s.condSelect}>
                        {(c.field === "tag" ? tags : m.values).map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    )}
                    <button onClick={() => removeCondicao(gi, ci)} style={s.condRm}>×</button>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={s.btnGhostSm} onClick={() => addCondicao(gi)}>+ Condição (E)</button>
              {builder.groups.length > 1 && <button style={s.btnGhostSm} onClick={() => removeGrupo(gi)}>Remover grupo</button>}
            </div>
          </div>
        </div>
      ))}

      <button style={{ ...s.btnGhostSm, marginTop: 4 }} onClick={addGrupo}>+ Grupo (OU)</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, padding: "12px 14px", background: T.primarySoft, borderRadius: 12 }}>
        <span style={{ fontSize: 13, color: T.primaryDark, fontWeight: 600 }}>Captura agora:</span>
        <b style={{ fontSize: 18, color: T.primaryDark }}>{contagemLabel(preview)}</b>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex: 1 }} onClick={onSave}>Salvar</button>
      </div>
    </Modal>
  );
}
