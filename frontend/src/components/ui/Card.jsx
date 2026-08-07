import { s } from "../../styles/s";

export function Card({ title, children, onClick }) {
  return (
    <section
      style={{ ...s.card, ...(onClick ? { cursor: "pointer" } : {}) }}
      className={onClick ? "prow" : undefined}
      onClick={onClick}
    >
      {title && <div style={s.cardTitle}>{title}</div>}
      <div>{children}</div>
    </section>
  );
}
