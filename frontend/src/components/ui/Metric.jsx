import { T } from "../../theme";

export function Metric({ label, value, sub, accent }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: T.inkSoft }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: accent || T.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: T.inkSoft }}>{sub}</div>}
    </div>
  );
}
