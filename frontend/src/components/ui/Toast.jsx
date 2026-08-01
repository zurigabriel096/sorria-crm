import { T } from "../../theme";
import { s } from "../../styles/s";

export function Toast({ toast }) {
  return (
    <div style={{ ...s.toast, borderLeft: `4px solid ${toast.kind === "warn" ? T.coral : T.primary}` }}>
      {toast.msg}
    </div>
  );
}
