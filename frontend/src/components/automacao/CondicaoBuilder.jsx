import { T } from "../../theme";
import { s } from "../../styles/s";
import { OP_LABEL, OPS_SEM_VALOR } from "../../data/seed";

export const novaCondicao = () => ({ field: "financ", op: "é", value: "Adimplente" });
export const novoGrupo = () => [{ field: "recencia", op: "maior", value: 120 }];

// Construtor de grupos de condicao (campo + operador + valor, E dentro do
// grupo, OU entre grupos) - extraido de Segmentacoes.jsx (05/08/2026) pra ser
// reaproveitado tambem no gatilho de entrada da Automacao (EntradaPanel), sem
// precisar passar por uma Segmentacao salva. Mesma logica nos dois lugares -
// igual o motor de execucao ja evita ter a avaliacao duplicada entre frontend
// e backend, aqui evita ter o CONSTRUTOR duplicado entre as duas telas.
export function CondicaoBuilder({ groups, onChange, fieldMeta }) {
  const setCond = (gi, ci, patch) =>
    onChange(groups.map((g, j) => (j === gi ? g.map((c, k) => (k === ci ? { ...c, ...patch } : c)) : g)));

  const changeField = (gi, ci, field) => {
    const m = fieldMeta[field];
    const valorPadrao = m.value === "number" ? 0
      : m.value === "date" ? ""
      : m.value === "text" ? ""
      : (m.values[0] || "");
    setCond(gi, ci, { field, op: m.ops[0], value: valorPadrao, value2: undefined });
  };

  const addCondicao = (gi) => onChange(groups.map((g, j) => (j === gi ? [...g, novaCondicao()] : g)));

  const removeCondicao = (gi, ci) =>
    onChange(
      groups
        .map((g, j) => (j === gi ? g.filter((_, k) => k !== ci) : g))
        .filter((g, j) => g.length > 0 || groups.length === 1)
    );

  const addGrupo = () => onChange([...groups, novoGrupo()]);
  const removeGrupo = (gi) => onChange(groups.filter((_, j) => j !== gi));

  return (
    <div>
      {groups.map((group, gi) => (
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
                const m = fieldMeta[c.field] || fieldMeta.financ;
                return (
                  <div key={ci} style={s.condRow}>
                    <span style={{ width: 24, fontSize: 12, fontWeight: 700, color: ci > 0 ? T.primary : "transparent" }}>{ci > 0 ? "E" : ""}</span>
                    <select value={c.field} onChange={(e) => changeField(gi, ci, e.target.value)} style={s.condSelect}>
                      {Object.entries(fieldMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={c.op} onChange={(e) => {
                      const novoOp = e.target.value;
                      const eraFaltam = c.op === "faltam";
                      const viraFaltam = novoOp === "faltam";
                      const value = viraFaltam && !eraFaltam ? 1 : (!viraFaltam && eraFaltam ? "" : c.value);
                      const patch = { op: novoOp, value };
                      if (novoOp === "entre" && c.value2 == null) patch.value2 = value;
                      setCond(gi, ci, patch);
                    }} style={s.condSelect}>
                      {m.ops.map((o) => <option key={o} value={o}>{OP_LABEL[o]}</option>)}
                    </select>
                    {OPS_SEM_VALOR.includes(c.op) ? (
                      <span style={{ ...s.condSelect, display: "flex", alignItems: "center", color: T.inkSoft, background: "transparent", border: "none" }}>sem valor</span>
                    ) : c.op === "faltam" ? (
                      <input type="number" min={0} value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} style={{ ...s.condSelect, width: 84 }} />
                    ) : c.op === "entre" ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type={m.value === "date" ? "date" : "number"}
                          value={c.value}
                          onChange={(e) => setCond(gi, ci, { value: e.target.value })}
                          style={{ ...s.condSelect, width: m.value === "date" ? 140 : 76 }}
                        />
                        <span style={{ fontSize: 12, color: T.inkSoft }}>e</span>
                        <input
                          type={m.value === "date" ? "date" : "number"}
                          value={c.value2 ?? ""}
                          onChange={(e) => setCond(gi, ci, { value2: e.target.value })}
                          style={{ ...s.condSelect, width: m.value === "date" ? 140 : 76 }}
                        />
                      </span>
                    ) : m.value === "number" ? (
                      <input type="number" value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} style={{ ...s.condSelect, width: 84 }} />
                    ) : m.value === "date" ? (
                      <input type="date" value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} style={{ ...s.condSelect, width: 150 }} />
                    ) : m.value === "text" ? (
                      <input type="text" value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} placeholder="Valor..." style={s.condSelect} />
                    ) : (
                      <select value={c.value} onChange={(e) => setCond(gi, ci, { value: e.target.value })} style={s.condSelect}>
                        {m.values.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    )}
                    <button onClick={() => removeCondicao(gi, ci)} style={s.condRm}>×</button>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={s.btnGhostSm} onClick={() => addCondicao(gi)}>+ Condição (E)</button>
              {groups.length > 1 && <button style={s.btnGhostSm} onClick={() => removeGrupo(gi)}>Remover grupo</button>}
            </div>
          </div>
        </div>
      ))}
      <button style={{ ...s.btnGhostSm, marginTop: 4 }} onClick={addGrupo}>+ Grupo (OU)</button>
    </div>
  );
}
