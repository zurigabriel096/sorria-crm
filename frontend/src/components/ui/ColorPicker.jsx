import { useEffect, useRef, useState } from "react";
import { T } from "../../theme";
import { IconPlus } from "../icons";

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Seletor de cor próprio (matiz/saturação/luminosidade), pra não depender do color-picker
// nativo do sistema operacional (quadrado preto sem estilo, sem transição).
export function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const [hexInput, setHexInput] = useState(() => value.replace("#", "").toUpperCase());
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const update = (patch) => {
    const next = { ...hsl, ...patch };
    setHsl(next);
    const hex = hslToHex(next.h, next.s, next.l);
    setHexInput(hex.slice(1).toUpperCase());
    onChange(hex);
  };

  // Deixa o usuário digitar o código direto; só aplica quando fecha em 6 dígitos válidos.
  const onHexInput = (raw) => {
    const clean = raw.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 6);
    setHexInput(clean);
    if (clean.length === 6) {
      const hex = `#${clean}`;
      setHsl(hexToHsl(hex));
      onChange(hex);
    }
  };

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Escolher outra cor (RGB)"
        style={{ width: 26, height: 26, borderRadius: "50%", cursor: "pointer", border: `1.5px dashed ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}
      >
        <IconPlus color={T.inkSoft} />
      </button>
      {open && (
        <div className="pop" style={{ position: "absolute", top: 32, left: 0, zIndex: 40, width: 210, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 14, padding: 14, boxShadow: "0 12px 32px rgba(20,40,55,.18)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: hslToHex(hsl.h, hsl.s, hsl.l), border: `1px solid ${T.line}`, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: T.inkSoft }}>Cor personalizada</span>
          </div>
          <SliderRow label="Matiz" value={hsl.h} max={360} track="linear-gradient(90deg,red,yellow,lime,cyan,blue,magenta,red)" onChange={(v) => update({ h: v })} />
          <SliderRow label="Saturação" value={hsl.s} max={100} track={`linear-gradient(90deg,#bbb,${hslToHex(hsl.h, 100, hsl.l)})`} onChange={(v) => update({ s: v })} />
          <SliderRow label="Luminosidade" value={hsl.l} max={100} track={`linear-gradient(90deg,#000,${hslToHex(hsl.h, hsl.s, 50)},#fff)`} onChange={(v) => update({ l: v })} />
          <div style={{ fontSize: 11, color: T.inkSoft, margin: "10px 0 4px" }}>Ou digite o código</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${T.line}`, borderRadius: 9, padding: "0 10px", height: 34 }}>
            <span style={{ fontSize: 13, color: T.inkSoft, fontWeight: 700 }}>#</span>
            <input
              value={hexInput}
              onChange={(e) => onHexInput(e.target.value)}
              maxLength={6}
              placeholder="0FA895"
              style={{ border: "none", outline: "none", fontSize: 13, letterSpacing: .5, textTransform: "uppercase", width: "100%", fontFamily: "monospace" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SliderRow({ label, value, max, track, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 4 }}>{label}</div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: T.primary, background: track, borderRadius: 20, height: 6, appearance: "none", cursor: "pointer" }}
      />
    </div>
  );
}
