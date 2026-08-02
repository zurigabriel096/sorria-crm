import { CATEGORIAS } from "./actions";
import { WhatsAppIcon } from "./icons";
import { SidePanel } from "./SidePanel";

const MENSAGEM = CATEGORIAS.find((c) => c.id === "mensagem");
const TEMPO = CATEGORIAS.find((c) => c.id === "tempo");

const linha = { display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 8px", borderRadius: 8, fontSize: 13, color: "#16263B", fontWeight: 600 };
const secaoTitulo = { fontSize: 11, fontWeight: 700, color: "#8A96A3", textTransform: "uppercase", letterSpacing: .5, margin: "16px 0 6px" };

// Mostrado quando uma conexao e solta no canvas vazio (ver App.jsx onConnectEnd).
// Enxugado pra so os itens ja validados (ver actions.js) - nada de "em breve"
// aqui, so o que funciona de verdade.
export function PrimeiroPassoPanel({ onEscolher, onFechar }) {
  return (
    <SidePanel lado="direita" largura={300} titulo="Escolha o primeiro passo" onFechar={onFechar}>
      <div style={secaoTitulo}>Conteúdo</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: "#25D366", display: "grid", placeItems: "center" }}>
          <WhatsAppIcon size={13} />
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#5C6E7E" }}>WhatsApp</span>
      </div>
      {MENSAGEM.itens.map((item) => (
        <button key={item.tipo} className="acaoItem" style={linha} onClick={() => onEscolher(item)}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: MENSAGEM.cor, flexShrink: 0 }} />
          {item.nome}
        </button>
      ))}

      <div style={secaoTitulo}>Tempo</div>
      {TEMPO.itens.map((item) => (
        <button key={item.tipo} className="acaoItem" style={linha} onClick={() => onEscolher(item)}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: TEMPO.cor, flexShrink: 0 }} />
          {item.nome}
        </button>
      ))}
    </SidePanel>
  );
}
