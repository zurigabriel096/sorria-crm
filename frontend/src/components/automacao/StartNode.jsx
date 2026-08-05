import { Handle, Position } from "@xyflow/react";

const RESUMO = {
  segmentacao: (e) => `Segmentação: ${e.segmentacao?.nome || "não escolhida"}`,
  mensagemRecebida: (e) => `Mensagem recebida (${e.mensagemRecebida?.esperaMinutos ?? 1}min sem resposta)${e.mensagemRecebida?.segmentacao ? ` · ${e.mensagemRecebida.segmentacao.nome}` : ""}`,
  automacaoMarketing: () => "Automação de marketing",
};

// Nó de Início (trigger) — sem entrada (só saída). Substitui os 7 "gatilhos"
// fixos antigos por uma configuração real de entrada (ver EntradaPanel).
export default function StartNode({ id, data }) {
  const entrada = data.entrada;
  const configurado = entrada && entrada.modoEntrada && entrada.tipoCondicao;

  return (
    <div style={{ width: 260, borderRadius: 12, background: "#fff", boxShadow: "0 6px 18px rgba(20,40,55,.14)", border: "1px solid #16263B", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(150deg,#16263B,#0B1622)", color: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>▶</span>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Início</div>
      </div>
      <div style={{ padding: 12 }}>
        {!configurado ? (
          <button
            className="nodrag"
            onClick={() => data.onAbrirEntrada?.(id)}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px dashed #0FA895",
              color: "#0FA895", fontWeight: 700, fontSize: 12.5, background: "#F4FBFA",
            }}
          >
            + Selecionar uma entrada
          </button>
        ) : (
          <button className="nodrag" onClick={() => data.onAbrirEntrada?.(id)} style={{ width: "100%", textAlign: "left" }}>
            <div style={{ fontSize: 11, color: "#5C6E7E" }}>
              {entrada.modoEntrada === "futurosEExistentes" ? "Leads existentes + futuros" : "Somente leads futuros"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#16263B", marginTop: 2 }}>
              {RESUMO[entrada.tipoCondicao]?.(entrada)}
            </div>
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: "#16263B", border: "2px solid #fff" }} />
    </div>
  );
}
