import { s } from "../../styles/s";

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={s.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
