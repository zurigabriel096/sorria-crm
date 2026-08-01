import { s } from "../../styles/s";

export function Select({ value, onChange, options, block }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...s.select, ...(block ? { width: "100%" } : {}) }}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}
