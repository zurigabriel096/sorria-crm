import { s } from "../../styles/s";

export function Select({ value, onChange, options, block, labels }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...s.select, ...(block ? { width: "100%" } : {}) }}>
      {options.map((o) => <option key={o} value={o}>{labels?.[o] || o}</option>)}
    </select>
  );
}
