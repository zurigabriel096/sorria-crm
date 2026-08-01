import { useState, useCallback } from "react";
import { s } from "../../styles/s";
import { T } from "../../theme";

// Fecha só no X (nunca no clique de fora). Guarda de alterações não salvas.
export function Modal({ title, children, onClose, wide, dirty, onSave }) {
  const [closing, setClosing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const doClose = useCallback(() => { setClosing(true); setTimeout(onClose, 180); }, [onClose]);
  const tryClose = () => { if (dirty) setConfirm(true); else doClose(); };

  return (
    <div style={s.modalWrap}>
      <div style={{ ...s.modal, ...(wide ? { width: "min(640px,100%)" } : {}) }} className={closing ? "modalOut" : "modalIn"}>
        <button style={s.modalX} onClick={tryClose} title="Fechar">×</button>
        <div style={{ ...s.cardTitle, paddingRight: 28 }}>{title}</div>
        {children}
        {confirm && (
          <div style={s.confirmBar}>
            <span style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>Você tem alterações não salvas.</span>
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button style={s.btnGhostSm} onClick={() => setConfirm(false)}>Continuar editando</button>
              <button style={s.btnGhostSm} onClick={doClose}>Descartar</button>
              {onSave && <button style={s.btnPrimarySm} onClick={() => onSave()}>Salvar</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
