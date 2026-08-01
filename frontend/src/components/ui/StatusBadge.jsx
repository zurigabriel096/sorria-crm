import { T } from "../../theme";
import { s } from "../../styles/s";

const MAP = {
  Pendente: [T.inkSoft, T.lineSoft],
  Entregue: ["#0E9484", "#E1F4F0"],
  Disparado: [T.primary, T.primarySoft],
  Enviado: [T.primary, T.primarySoft],
  Falhou: [T.coral, "#FDE9E6"],
  Bloqueado: ["#8A5A2B", "#F3E7DA"],
};

export function StatusBadge({ status, sm }) {
  const [fg, bg] = MAP[status] || MAP.Pendente;
  return (
    <span style={{ ...s.statusBadge, color: fg, background: bg, fontSize: sm ? 11 : 11.5, padding: sm ? "2px 8px" : "3px 10px" }}>
      {status}
    </span>
  );
}
