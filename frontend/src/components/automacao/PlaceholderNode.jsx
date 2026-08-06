import { Handle, Position } from "@xyflow/react";

// Caixa tracejada que aparece no instante em que a conexao e solta no canvas
// vazio - "Escolha o primeiro passo" (vira um no de verdade assim que a pessoa
// escolhe uma opcao no PrimeiroPassoPanel; some se o painel for fechado sem
// escolha). Se o fluxo for salvo com ela ainda sem escolha (ou o painel for
// fechado de outro jeito), ela fica orfa no canvas - o botao "×" (mesmo padrao
// do FlowNode/MensagemNode/CondicaoNode) e' o unico jeito de remove-la depois
// disso, ja que ela nunca reabre o PrimeiroPassoPanel por conta propria.
export default function PlaceholderNode({ id, data }) {
  return (
    <div style={{
      width: 220, borderRadius: 12, border: "2px dashed #9AA7B0", background: "#F7F9F9",
      padding: "10px 12px", textAlign: "center", position: "relative",
    }}>
      <button
        className="nodrag" onClick={() => data.onExcluir?.(id)}
        style={{ position: "absolute", top: 6, right: 8, color: "#9AA7B0", fontSize: 15, lineHeight: 1 }}
        title="Excluir"
      >
        ×
      </button>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#5C6E7E", padding: "6px 4px" }}>Escolha o primeiro passo 👇</div>
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: "#9AA7B0", border: "2px solid #fff" }} />
    </div>
  );
}
