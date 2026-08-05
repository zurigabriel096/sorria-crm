import { Handle, Position } from "@xyflow/react";
import { gerarId } from "../../utils/automacao/ids";

const inputEstilo = { width: "100%", height: 30, border: "1px solid #E6EDEC", borderRadius: 8, padding: "0 8px", fontSize: 12 };
const OPERADORES = [
  { valor: "contem", nome: "contém" },
  { valor: "nao_contem", nome: "não contém" },
  { valor: "igual", nome: "é igual a" },
  { valor: "diferente", nome: "é diferente de" },
];
const COR = "#F59E0B";
export const HANDLE_FALLBACK_CONDICAO = "__fallback__";

// No de ramificacao real: cada condicao (linha) tem seu proprio handle de saida
// (o "id" da condicao), mais um handle fixo de fallback quando nenhuma bate -
// ver AutomacaoEngineService.resolverHandleCondicao no backend, que avalia essas
// mesmas condicoes contra a ultima mensagem ENTRADA do lead e segue a aresta cujo
// sourceHandle bate (ou HANDLE_FALLBACK_CONDICAO).
export default function CondicaoNode({ id, data }) {
  const condicoes = data.condicoes || [];
  const mudar = (patch) => data.onMudarConfig?.(id, patch);
  const mudarCondicao = (condId, patch) => mudar({ condicoes: condicoes.map((c) => (c.id === condId ? { ...c, ...patch } : c)) });
  const adicionarCondicao = () => mudar({ condicoes: [...condicoes, { id: gerarId("cond"), operador: "contem", valor: "" }] });
  const removerCondicao = (condId) => mudar({ condicoes: condicoes.filter((c) => c.id !== condId) });

  return (
    <div style={{ width: 290, borderRadius: 12, background: "#fff", boxShadow: "0 6px 18px rgba(20,40,55,.12)", border: "1px solid #E6EDEC", overflow: "hidden" }}>
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: COR, border: "2px solid #fff" }} />
      <div style={{ background: COR, color: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", opacity: .85, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: .85, textTransform: "uppercase", letterSpacing: .4 }}>Condição</div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Ramifica por resposta</div>
        </div>
        <button className="nodrag" onClick={() => data.onExcluir?.(id)} style={{ color: "#fff", opacity: .8, fontSize: 15, lineHeight: 1, flexShrink: 0 }} title="Excluir">×</button>
      </div>
      <div style={{ padding: "10px 12px 4px", fontSize: 11.5, color: "#5C6E7E", lineHeight: 1.4 }}>
        Compara com a última mensagem que o lead mandou no WhatsApp.
      </div>
      <div style={{ padding: "6px 12px 12px", display: "grid", gap: 8 }}>
        {condicoes.map((c, i) => (
          <div key={c.id} style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, paddingRight: 4 }}>
            <span style={{ fontSize: 11, color: "#8A9AA6", flexShrink: 0, width: 34 }}>{i === 0 ? "Se" : "Ou se"}</span>
            <select className="nodrag" style={{ ...inputEstilo, width: 104, flexShrink: 0 }} value={c.operador} onChange={(e) => mudarCondicao(c.id, { operador: e.target.value })}>
              {OPERADORES.map((o) => <option key={o.valor} value={o.valor}>{o.nome}</option>)}
            </select>
            <input className="nodrag" style={inputEstilo} placeholder="palavra ou frase..." value={c.valor} onChange={(e) => mudarCondicao(c.id, { valor: e.target.value })} />
            <button className="nodrag" onClick={() => removerCondicao(c.id)} style={{ color: "#B8C4CC", fontSize: 14, flexShrink: 0 }} title="Remover condição">×</button>
            <Handle type="source" position={Position.Right} id={c.id} style={{ width: 10, height: 10, background: COR, border: "2px solid #fff" }} />
          </div>
        ))}
        {!condicoes.length && <div style={{ fontSize: 11.5, color: "#8A9AA6" }}>Nenhuma condição ainda - adicione a primeira abaixo.</div>}
        <button className="nodrag" onClick={adicionarCondicao} style={{ fontSize: 12, color: COR, fontWeight: 600, textAlign: "left", padding: "2px 0" }}>+ Adicionar condição</button>
        <div style={{ position: "relative", display: "flex", alignItems: "center", marginTop: 4, paddingTop: 8, borderTop: "1px dashed #E6EDEC" }}>
          <span style={{ fontSize: 11.5, color: "#8A9AA6" }}>Nenhuma das condições</span>
          <Handle type="source" position={Position.Right} id={HANDLE_FALLBACK_CONDICAO} style={{ width: 10, height: 10, background: "#8A9AA6", border: "2px solid #fff" }} />
        </div>
      </div>
    </div>
  );
}
