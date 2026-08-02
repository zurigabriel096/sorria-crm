import { useState } from "react";
import { Modal } from "./AutomacaoModal";

const LINHAS = {
  mouse: [
    { icone: "🖱️", titulo: "Deslocamento ao redor", desc: "Clique com o botão esquerdo e arraste" },
    { icone: "↕️", titulo: "Ampliar", desc: "Utilize o botão de rolagem do mouse para dar zoom" },
    { icone: "⇧🖱️", titulo: "Selecione vários itens", desc: "Pressione Shift e clique com o botão esquerdo" },
  ],
  touchpad: [
    { icone: "✌️", titulo: "Deslocamento ao redor", desc: "Deslize com dois dedos" },
    { icone: "🤏", titulo: "Ampliar", desc: "Beliscar para dar zoom" },
    { icone: "⇧🤏", titulo: "Selecione vários itens", desc: "Pressione Shift e clique" },
  ],
};

export function AjudaZoomButton() {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState("mouse");

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        title="Ajuda: zoom e panorâmica"
        style={{
          position: "absolute", right: 16, bottom: 16, width: 34, height: 34, borderRadius: 10,
          background: "#fff", border: "1px solid #E6EDEC", boxShadow: "0 4px 12px rgba(20,40,55,.12)",
          fontSize: 15, fontWeight: 700, color: "#5C6E7E", zIndex: 5,
        }}
      >
        ?
      </button>
      <Modal aberto={aberto} onFechar={() => setAberto(false)} titulo="Zoom e panorâmica" largura={380}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "#F0F4F3", padding: 4, borderRadius: 10 }}>
          {[["mouse", "Mouse"], ["touchpad", "Touchpad"]].map(([id, rotulo]) => (
            <button
              key={id} onClick={() => setAba(id)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                background: aba === id ? "#fff" : "transparent", color: aba === id ? "#16263B" : "#5C6E7E",
                boxShadow: aba === id ? "0 1px 4px rgba(20,40,55,.12)" : "none",
              }}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {LINHAS[aba].map((linha, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderTop: i > 0 ? "1px solid #E6EDEC" : "none" }}>
            <span style={{ fontSize: 18, width: 26, textAlign: "center", flexShrink: 0 }}>{linha.icone}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#16263B" }}>{linha.titulo}</div>
              <div style={{ fontSize: 12, color: "#5C6E7E", marginTop: 2 }}>{linha.desc}</div>
            </div>
          </div>
        ))}
      </Modal>
    </>
  );
}
