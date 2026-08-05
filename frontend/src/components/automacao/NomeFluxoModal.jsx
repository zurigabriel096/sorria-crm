import { useState } from "react";
import { Modal } from "./AutomacaoModal";

// Cancelar sempre fecha (sem salvar); Continuar so libera com nome preenchido.
// Se o fluxo ainda nao tem nome quando a pessoa tenta salvar/publicar, App.jsx
// reabre esse modal de novo - nao da pra persistir um fluxo sem nome.
export function NomeFluxoModal({ aberto, nomeAtual, onFechar, onConfirmar }) {
  const [valor, setValor] = useState(nomeAtual || "Fluxo • ");

  if (!aberto) return null;

  const podeContinuar = valor.trim().length > 0;

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Editar nome do fluxo"
      subtitulo="Utilize um nome de fácil memorização. Ele será utilizado para sua identificação dentro do Sorr.ia CRM."
      rodape={
        <>
          <button
            onClick={onFechar}
            style={{ flex: 1, height: 42, borderRadius: 10, background: "#F0F4F3", color: "#16263B", fontWeight: 700, fontSize: 13.5 }}
          >
            Cancelar
          </button>
          <button
            onClick={() => podeContinuar && onConfirmar(valor.trim())}
            disabled={!podeContinuar}
            style={{
              flex: 1, height: 42, borderRadius: 10, background: podeContinuar ? "#0FA895" : "#CBD5DB",
              color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: podeContinuar ? "pointer" : "not-allowed",
            }}
          >
            Continuar
          </button>
        </>
      }
    >
      <label style={{ display: "block" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#5C6E7E", display: "block", marginBottom: 6 }}>Nome do fluxo</span>
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && podeContinuar && onConfirmar(valor.trim())}
          placeholder="Ex: Reativação de inadimplentes"
          style={{ width: "100%", height: 42, border: "1px solid #E6EDEC", borderRadius: 10, padding: "0 13px", fontSize: 14 }}
        />
      </label>
    </Modal>
  );
}
