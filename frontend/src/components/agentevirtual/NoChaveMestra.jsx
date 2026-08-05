import { Handle, Position } from "@xyflow/react";

const COR = "#16263B";
export const HANDLE_MENSAGEM_PADRAO = "__padrao__";

// No de gatilho do Agente Virtual - um handle de saida por Pergunta Frequente
// (mesmo padrao de linhas com handle proprio do CondicaoNode.jsx da
// Automacao) mais um handle fixo pra "Mensagem padrao" (quando nada bate).
// Puramente visual: a logica de verdade continua em AgenteVirtualService
// (mesma comparacao de palavra-chave, sem ordem/prioridade real entre os
// nos aqui - a arvore serve pro operador VER a triagem, nao muda o motor).
export default function NoChaveMestra({ id, data }) {
  const perguntas = data.perguntas || [];
  return (
    <div style={{ width: 260, borderRadius: 12, background: "#fff", boxShadow: "0 6px 18px rgba(20,40,55,.14)", border: `1px solid ${COR}`, overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(150deg,#16263B,#0B1622)", color: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>🤖</span>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Chave-mestra</div>
      </div>
      <div style={{ padding: 12 }}>
        <button
          className="nodrag"
          onClick={() => data.onAlternarAtivo?.()}
          style={{
            width: "100%", padding: "9px 10px", borderRadius: 9, fontWeight: 700, fontSize: 12.5,
            background: data.ativo ? "#FDE9E6" : "#E1F4F0", color: data.ativo ? "#C0392B" : "#0E9484",
          }}
        >
          {data.ativo ? "Desligar" : "Ligar"} o Agente Virtual
        </button>
        <div style={{ fontSize: 11, color: "#5C6E7E", marginTop: 8, lineHeight: 1.4 }}>
          {data.ativo ? "● Ativo — respondendo automaticamente" : "● Inativo"}
        </div>
        <div style={{ fontSize: 10.5, color: "#8A9AA6", marginTop: 6, lineHeight: 1.4 }}>
          Dispara quando a 1ª mensagem do dia do lead fica 1 min sem resposta.
        </div>
      </div>
      {!!perguntas.length && (
        <div style={{ borderTop: "1px solid #EDF1F3" }}>
          {perguntas.map((p) => (
            <div key={p.id} style={{ position: "relative", height: 26, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: "1px solid #F5F7F8" }}>
              <span style={{ fontSize: 10.5, color: "#5C6E7E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.palavrasChave}
              </span>
              <Handle type="source" position={Position.Right} id={String(p.id)} style={{ width: 9, height: 9, background: COR, border: "2px solid #fff" }} />
            </div>
          ))}
        </div>
      )}
      <div style={{ position: "relative", height: 26, display: "flex", alignItems: "center", padding: "0 12px", borderTop: "1px dashed #EDF1F3" }}>
        <span style={{ fontSize: 10.5, color: "#8A9AA6" }}>Nenhuma bateu (padrão)</span>
        <Handle type="source" position={Position.Right} id={HANDLE_MENSAGEM_PADRAO} style={{ width: 9, height: 9, background: "#8A9AA6", border: "2px solid #fff" }} />
      </div>
    </div>
  );
}
