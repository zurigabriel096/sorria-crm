import { CATEGORIAS } from "./actions";

// Painel lateral "Ações disponíveis" — clicar num item adiciona o nó no canvas.
export default function ActionsPanel({ onAdd, onClose }) {
  return (
    <div style={{ width: 260, background: "#fff", borderLeft: "1px solid #E6EDEC", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #E6EDEC" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#16263B" }}>Ações disponíveis</div>
        <button onClick={onClose} title="Fechar" style={{ width: 26, height: 26, borderRadius: 8, background: "#F0F4F3", color: "#5C6E7E", fontSize: 15, display: "grid", placeItems: "center" }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
        {CATEGORIAS.map((cat) => (
          <div key={cat.id} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8A96A3", textTransform: "uppercase", letterSpacing: .5, padding: "4px 8px" }}>{cat.label}</div>
            {cat.itens.map((item) => (
              <button
                key={item.tipo}
                onClick={() => onAdd(item)}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left", padding: "8px 8px", borderRadius: 8, fontSize: 13, color: "#16263B", fontWeight: 500 }}
                className="acaoItem"
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.cor, flexShrink: 0 }} />
                {item.nome}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
