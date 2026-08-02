import { Handle, Position } from "@xyflow/react";

// Caixa tracejada que aparece no instante em que a conexao e solta no canvas
// vazio - "Escolha o primeiro passo" (vira um no de verdade assim que a pessoa
// escolhe uma opcao no PrimeiroPassoPanel; some se o painel for fechado sem escolha).
export default function PlaceholderNode() {
  return (
    <div style={{
      width: 220, borderRadius: 12, border: "2px dashed #9AA7B0", background: "#F7F9F9",
      padding: "16px 14px", textAlign: "center",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#5C6E7E" }}>Escolha o primeiro passo 👇</div>
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: "#9AA7B0", border: "2px solid #fff" }} />
    </div>
  );
}
