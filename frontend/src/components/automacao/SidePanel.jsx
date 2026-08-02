// Shell generico de painel lateral (esquerda ou direita) - cabecalho com
// titulo + fechar, corpo com scroll. Usado por EntradaPanel, MensagemPanel,
// PrimeiroPassoPanel etc.
export function SidePanel({ lado = "direita", largura = 300, titulo, onFechar, children }) {
  return (
    <div
      style={{
        width: largura, flexShrink: 0, background: "#fff", height: "100%",
        display: "flex", flexDirection: "column",
        borderLeft: lado === "direita" ? "1px solid #E6EDEC" : "none",
        borderRight: lado === "esquerda" ? "1px solid #E6EDEC" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid #E6EDEC" }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "#16263B" }}>{titulo}</div>
        <button
          onClick={onFechar}
          title="Fechar"
          style={{ width: 26, height: 26, borderRadius: 8, background: "#F0F4F3", color: "#5C6E7E", fontSize: 15, display: "grid", placeItems: "center" }}
        >
          ×
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>{children}</div>
    </div>
  );
}
