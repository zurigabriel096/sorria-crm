import { Handle, Position } from "@xyflow/react";
import { corDoTipo, categoriaDoTipo, ESTAGIOS_LEAD } from "./actions";

const inputEstilo = { width: "100%", height: 34, border: "1px solid #E6EDEC", borderRadius: 8, padding: "0 10px", fontSize: 12.5 };

// Corpo de configuracao real (nao decorativo) por tipo - so os tipos que tem
// um parametro simples ganham isso; os demais caem no fallback generico.
function corpoConfiguravel(id, data) {
  const mudar = (patch) => data.onMudarConfig?.(id, patch);

  if (data.tipo === "adicionar_tag" || data.tipo === "remover_tag") {
    return (
      <input
        className="nodrag" style={inputEstilo} placeholder="Nome da tag..."
        value={data.tag || ""} onChange={(e) => mudar({ tag: e.target.value })}
      />
    );
  }
  if (data.tipo === "alterar_estagio") {
    return (
      <>
        <div style={{ fontSize: 11.5, color: "#5C6E7E", marginBottom: 6 }}>
          Altere o estágio do funil dos Leads que chegarem até aqui.
        </div>
        <select className="nodrag" style={inputEstilo} value={data.estagio || ""} onChange={(e) => mudar({ estagio: e.target.value })}>
          <option value="">Selecione o estágio...</option>
          {ESTAGIOS_LEAD.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </>
    );
  }
  if (data.tipo === "esperar_segundos") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          className="nodrag" type="number" min={1} max={3600} style={{ ...inputEstilo, width: 70 }}
          value={data.segundos ?? 30} onChange={(e) => mudar({ segundos: Math.max(1, Math.min(3600, Number(e.target.value) || 1)) })}
        />
        <span style={{ fontSize: 12.5, color: "#5C6E7E" }}>segundos</span>
      </div>
    );
  }
  if (data.tipo === "aguardar_mensagem") {
    return (
      <div style={{ fontSize: 12, color: "#5C6E7E", lineHeight: 1.5 }}>
        Pausa o fluxo até o lead responder qualquer mensagem no WhatsApp.
      </div>
    );
  }
  return <div style={{ fontSize: 12, color: "#5C6E7E", lineHeight: 1.5 }}>{data.subtitulo || "Clique pra configurar essa ação."}</div>;
}

// Nó genérico pra qualquer ação do catálogo — cabeçalho colorido por categoria,
// corpo com a configuracao real do tipo (ver corpoConfiguravel).
export default function FlowNode({ id, data }) {
  const cor = corDoTipo(data.tipo);
  return (
    <div style={{ width: 260, borderRadius: 12, background: "#fff", boxShadow: "0 6px 18px rgba(20,40,55,.12)", border: "1px solid #E6EDEC", overflow: "hidden" }}>
      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: cor, border: "2px solid #fff" }} />
      <div style={{ background: cor, color: "#fff", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", opacity: .85, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, opacity: .85, textTransform: "uppercase", letterSpacing: .4 }}>{categoriaDoTipo(data.tipo)}</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.nome}</div>
        </div>
        <button className="nodrag" onClick={() => data.onExcluir?.(id)} style={{ color: "#fff", opacity: .8, fontSize: 15, lineHeight: 1, flexShrink: 0 }} title="Excluir">×</button>
      </div>
      <div style={{ padding: "10px 12px" }}>{corpoConfiguravel(id, data)}</div>
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: cor, border: "2px solid #fff" }} />
    </div>
  );
}
