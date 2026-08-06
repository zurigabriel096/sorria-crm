import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";

// Aresta com botao "x" pra desconectar sem precisar excluir o fluxo inteiro
// e refazer do zero (reportado pelo Samuel, 05/08/2026 - hoje nao tinha
// nenhum jeito facil de desfazer uma conexao pra encaixar um no novo no
// meio). O rotulo de condicao (quando existe, ver EditorFluxo.edgesComRotulo)
// continua aparecendo do lado do botao, nao substitui.
export function ExcluivelEdge({ id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, style, markerEnd, label, labelStyle, labelBgStyle, data }) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute", pointerEvents: "all",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          {label && (
            <span style={{ fontSize: labelStyle?.fontSize || 10.5, fontWeight: labelStyle?.fontWeight || 700, color: labelStyle?.fill || "#5C6E7E", background: labelBgStyle?.fill || "#fff", opacity: labelBgStyle?.fillOpacity ?? 1, padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>
              {label}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); data?.onExcluir?.(id); }}
            title="Desconectar essa seta"
            style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff", border: "1.5px solid #E6EDEC",
              color: "#9AA7B0", fontSize: 12, lineHeight: 1, display: "grid", placeItems: "center",
              boxShadow: "0 1px 3px rgba(20,40,55,.18)", flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
