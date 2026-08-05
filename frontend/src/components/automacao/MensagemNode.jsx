import { Handle, Position } from "@xyflow/react";
import { WhatsAppIcon } from "./icons";
import { formatarAtraso } from "../../utils/automacao/tempo";

// No dedicado de "Enviar Mensagem" - cor/badge do WhatsApp (nao a cor generica
// de categoria do FlowNode), clique abre o MensagemPanel pra configurar de verdade.
export default function MensagemNode({ id, data }) {
  const temConteudo = data.texto || data.imagem || (data.blocosConteudo?.length > 0);
  const atrasoTexto = formatarAtraso(data.atraso);

  return (
    <div>
      <div style={{ width: 260, borderRadius: 12, border: "1.5px solid #25D366", overflow: "hidden", boxShadow: "0 6px 18px rgba(20,40,55,.14)" }}>
        <div style={{ background: "#25D366", padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <WhatsAppIcon size={14} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.tituloPersonalizado || "Enviar Mensagem"}</span>
          <button className="nodrag" onClick={() => data.onExcluir?.(id)} style={{ color: "#fff", opacity: .85, fontSize: 15, lineHeight: 1, flexShrink: 0 }} title="Excluir">×</button>
        </div>
        <button className="nodrag" onClick={() => data.onAbrir?.(id)} style={{ width: "100%", textAlign: "left", padding: 12, background: "#fff" }}>
          {!temConteudo ? (
            <div style={{ padding: "10px 8px", borderRadius: 8, border: "1.5px dashed #CBD5DB", color: "#8A96A3", fontSize: 12.5, textAlign: "center" }}>
              Adicionar texto
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "#16263B" }}>
              {data.imagem && <div style={{ fontSize: 11, color: "#0FA895", fontWeight: 700, marginBottom: 3 }}>🖼 {data.imagem.nome}</div>}
              {data.texto && <div style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{data.texto}</div>}
              {data.blocosConteudo?.length > 0 && <div style={{ fontSize: 11, color: "#5C6E7E", marginTop: 2 }}>+{data.blocosConteudo.length} bloco(s) de conteúdo</div>}
            </div>
          )}
        </button>
        <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: "#25D366", border: "2px solid #fff" }} />
        <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: "#25D366", border: "2px solid #fff" }} />
      </div>
      {atrasoTexto && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#5C6E7E", display: "flex", alignItems: "center", gap: 4 }}>
          🕐 {atrasoTexto}
        </div>
      )}
    </div>
  );
}
