import { useEffect, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { corDoTipo, categoriaDoTipo } from "./actions";
import { listEtapas } from "../../api/etapas";

const inputEstilo = { width: "100%", height: 34, border: "1px solid #E6EDEC", borderRadius: 8, padding: "0 10px", fontSize: 12.5 };

// Corpo de configuracao real (nao decorativo) por tipo - so os tipos que tem
// um parametro simples ganham isso; os demais caem no fallback generico.
function corpoConfiguravel(id, data, etapas) {
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
          {etapas.map((e) => <option key={e} value={e}>{e}</option>)}
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
      <div>
        <div style={{ fontSize: 12, color: "#5C6E7E", lineHeight: 1.5, marginBottom: 8 }}>
          Pausa o fluxo até o lead responder qualquer mensagem no WhatsApp.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#5C6E7E" }}>Prazo:</span>
          <input
            className="nodrag" type="number" min={0} max={365} style={{ ...inputEstilo, width: 60 }}
            value={data.prazoDias ?? 0} onChange={(e) => mudar({ prazoDias: Math.max(0, Math.min(365, Number(e.target.value) || 0)) })}
          />
          <span style={{ fontSize: 12, color: "#5C6E7E" }}>dias</span>
        </div>
        <div style={{ fontSize: 11, color: "#8A9AA6", marginTop: 4 }}>
          {Number(data.prazoDias) > 0
            ? `Se não responder em ${data.prazoDias} dia(s), segue pro próximo passo mesmo assim (marcado como "sem resposta").`
            : "0 = espera pra sempre, sem prazo (não segue sozinho se o lead nunca responder)."}
        </div>
      </div>
    );
  }
  if (data.tipo === "sinalizar_atendimento_agora") {
    return (
      <div style={{ fontSize: 12, color: "#5C6E7E", lineHeight: 1.5 }}>
        Marca o lead como "próxima ação agora" — aparece com prioridade na Fila de Trabalho, pro time humano assumir. Complementa (não substitui) uma mudança de estágio.
      </div>
    );
  }
  if (data.tipo === "pausar_horario_comercial") {
    return (
      <div>
        <div style={{ fontSize: 12, color: "#5C6E7E", lineHeight: 1.5, marginBottom: 8 }}>
          Só deixa passar pro próximo passo dentro do horário configurado (madrugada/fora do horário ficam esperando).
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#5C6E7E" }}>Das</span>
          <input className="nodrag" type="time" style={{ ...inputEstilo, width: 90 }} value={data.horaInicio || "08:00"} onChange={(e) => mudar({ horaInicio: e.target.value })} />
          <span style={{ fontSize: 12, color: "#5C6E7E" }}>até</span>
          <input className="nodrag" type="time" style={{ ...inputEstilo, width: 90 }} value={data.horaFim || "19:00"} onChange={(e) => mudar({ horaFim: e.target.value })} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5C6E7E" }}>
          <input className="nodrag" type="checkbox" checked={data.diasUteis !== false} onChange={(e) => mudar({ diasUteis: e.target.checked })} />
          Só dias úteis (seg a sex)
        </label>
      </div>
    );
  }
  return <div style={{ fontSize: 12, color: "#5C6E7E", lineHeight: 1.5 }}>{data.subtitulo || "Clique pra configurar essa ação."}</div>;
}

// Nó genérico pra qualquer ação do catálogo — cabeçalho colorido por categoria,
// corpo com a configuracao real do tipo (ver corpoConfiguravel).
export default function FlowNode({ id, data }) {
  const cor = corDoTipo(data.tipo);
  // Buscado ao vivo (nao mais o array fixo ESTAGIOS_LEAD, que ficou parado
  // em "Lead/Lead Qualificado/Cliente" desde antes da reestruturacao do
  // Kanban em 8 colunas - so o dropdown "Alterar Estagio" nunca tinha sido
  // atualizado pra puxar as etapas reais, ver api/etapas.js).
  const [etapas, setEtapas] = useState([]);
  useEffect(() => {
    if (data.tipo !== "alterar_estagio") return;
    listEtapas().then((lista) => setEtapas(lista.map((e) => e.nome))).catch(() => {});
  }, [data.tipo]);
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
      <div style={{ padding: "10px 12px" }}>{corpoConfiguravel(id, data, etapas)}</div>
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: cor, border: "2px solid #fff" }} />
    </div>
  );
}
