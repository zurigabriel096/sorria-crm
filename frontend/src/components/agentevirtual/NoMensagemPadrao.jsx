import { Handle, Position } from "@xyflow/react";

const COR = "#8A9AA6";

// Folha final da arvore: a resposta mandada quando NENHUMA pergunta bate -
// mesmo campo que ja existia (AgenteVirtualConfig.mensagemPadrao), so
// visualizado como no. Clicar abre o mesmo editor (textarea) que ja existia.
export default function NoMensagemPadrao({ id, data }) {
  return (
    <div style={{ width: 260, borderRadius: 12, background: "#fff", boxShadow: "0 6px 18px rgba(20,40,55,.12)", border: `1px dashed ${COR}`, overflow: "hidden" }}>
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: COR, border: "2px solid #fff" }} />
      <div style={{ background: COR, color: "#fff", padding: "8px 12px" }}>
        <span style={{ fontSize: 10, opacity: .9, textTransform: "uppercase", letterSpacing: .4 }}>Mensagem padrão</span>
      </div>
      <button className="nodrag" onClick={() => data.onEditar?.()} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px" }}>
        <div style={{ fontSize: 12.5, color: "#3D4C5A", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {data.mensagemPadrao}
        </div>
        <div style={{ fontSize: 10.5, color: COR, marginTop: 6 }}>Clique pra editar</div>
      </button>
    </div>
  );
}
