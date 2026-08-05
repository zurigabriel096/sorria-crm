import { Handle, Position } from "@xyflow/react";

const COR = "#16263B";

// Uma "folha" da arvore por Pergunta Frequente - mesmo dado que ja existia na
// lista plana (palavrasChave/resposta), so que agora visualizado como no
// conectado a Chave-mestra. Clicar abre o MESMO modal de editar que a lista
// plana usava.
export default function NoPergunta({ id, data }) {
  return (
    <div style={{ width: 260, borderRadius: 12, background: "#fff", boxShadow: "0 6px 18px rgba(20,40,55,.12)", border: "1px solid #E6EDEC", overflow: "hidden" }}>
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: COR, border: "2px solid #fff" }} />
      <div style={{ background: COR, color: "#fff", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, opacity: .85, textTransform: "uppercase", letterSpacing: .4, flex: 1 }}>Pergunta frequente</span>
        <button className="nodrag" onClick={() => data.onExcluir?.(id)} style={{ color: "#fff", opacity: .8, fontSize: 14, lineHeight: 1 }} title="Excluir">×</button>
      </div>
      <button className="nodrag" onClick={() => data.onEditar?.(id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px" }}>
        <div style={{ fontSize: 11, color: COR, fontWeight: 700, lineHeight: 1.4 }}>{data.palavrasChave}</div>
        <div style={{ fontSize: 12.5, color: "#3D4C5A", marginTop: 6, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {data.resposta}
        </div>
      </button>
    </div>
  );
}
