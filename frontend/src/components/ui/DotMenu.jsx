import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { T } from "../../theme";

const LARGURA_MENU = 170;

// Menu de "..." reutilizável: um botão com 3 pontinhos que abre uma lista de ações.
// O popup renderiza via portal direto no <body> (position: fixed, coordenadas
// calculadas do botão) em vez de position:absolute dentro do próprio layout -
// senão qualquer ancestral com overflow:auto (ex.: as colunas do Kanban em
// Conversas.jsx, que rolam na horizontal) corta o menu quando ele abriria pra
// fora da área visível daquele container. Também escolhe abrir pra
// direita/esquerda dependendo de qual lado tem espaço, em vez de sempre
// ancorar pela direita do botão.
export function DotMenu({ items }) {
  const [open, setOpen] = useState(false);
  const [posicao, setPosicao] = useState(null);
  const botaoRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fecharSeClicouFora = (e) => {
      if (botaoRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", fecharSeClicouFora);
    return () => document.removeEventListener("mousedown", fecharSeClicouFora);
  }, [open]);

  const abrir = () => {
    const rect = botaoRef.current.getBoundingClientRect();
    const cabeAEsquerda = rect.right - LARGURA_MENU >= 4;
    setPosicao({
      top: rect.bottom + 4,
      left: cabeAEsquerda ? rect.right - LARGURA_MENU : rect.left,
    });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={botaoRef}
        onClick={(e) => { e.stopPropagation(); if (open) setOpen(false); else abrir(); }}
        title="Mais ações"
        style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", color: T.inkSoft, background: "transparent", flexShrink: 0 }}
      >
        ⋮
      </button>
      {open && posicao && createPortal(
        <div
          ref={menuRef}
          className="pop"
          style={{
            position: "fixed", top: posicao.top, left: posicao.left, minWidth: LARGURA_MENU,
            background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10,
            boxShadow: "0 10px 30px rgba(20,40,55,.14)", zIndex: 500, padding: 6,
          }}
        >
          {items.map((it, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 7, fontSize: 13, fontWeight: 600, color: it.danger ? T.coral : T.ink }}
              className="navItem"
            >
              {it.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
