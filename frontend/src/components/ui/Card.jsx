import { s } from "../../styles/s";

export function Card({ title, children }) {
  return (
    <section style={s.card}>
      {title && <div style={s.cardTitle}>{title}</div>}
      <div>{children}</div>
    </section>
  );
}
