import { T } from "../../theme";
import { s } from "../../styles/s";

export function KpiCard({ label, value, sub, icon, highlight, onClick }) {
  return (
    <div
      style={{ ...s.kpiCard, ...(highlight ? s.kpiHi : {}), ...(onClick ? { cursor: "pointer" } : {}) }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div style={{ ...s.kpiIcon, background: highlight ? "rgba(255,255,255,.18)" : T.lineSoft }}>{icon}</div>
      <div style={{ fontSize: 12.5, color: highlight ? "rgba(255,255,255,.85)" : T.inkSoft, marginTop: 12 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: highlight ? "#fff" : T.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: highlight ? "rgba(255,255,255,.75)" : T.inkSoft }}>{sub}</div>}
    </div>
  );
}
