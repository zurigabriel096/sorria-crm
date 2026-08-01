import { useEffect, useRef, useState } from "react";
import { T } from "../../theme";

// Menu de "..." reutilizável: um botão com 3 pontinhos que abre uma lista de ações.
export function DotMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        title="Mais ações"
        style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", color: T.inkSoft, background: "transparent", flexShrink: 0 }}
      >
        ⋮
      </button>
      {open && (
        <div className="pop" style={{ position: "absolute", top: 30, right: 0, minWidth: 150, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10, boxShadow: "0 10px 30px rgba(20,40,55,.14)", zIndex: 40, padding: 6 }}>
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
        </div>
      )}
    </div>
  );
}
