import { s } from "../styles/s";
import { T } from "../theme";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";

// TODO(backend): trocar `historico` (estado local em App.jsx) por
// src/api/campaigns.js `listDispatchHistory()`.
export function HistoricoDisparos({ historico }) {
  if (!historico.length) {
    return <Card><div style={{ textAlign: "center", padding: 24, color: T.inkSoft }}>Nenhum disparo ainda.</div></Card>;
  }
  return (
    <Card noPad>
      <div style={s.tableScroll}>
        <table style={s.table}>
          <thead><tr><th style={s.thL}>Paciente</th><th style={s.th}>Campanha</th><th style={s.th}>Status</th><th style={s.th}>Hora</th></tr></thead>
          <tbody>
            {historico.map((h, i) => (
              <tr key={i}>
                <td style={s.tdL}><b style={{ color: T.ink }}>{h.nome}</b></td>
                <td style={s.td}><span style={{ fontSize: 12.5, color: T.inkSoft }}>{h.campanha}</span></td>
                <td style={s.td}><StatusBadge status={h.status} /></td>
                <td style={s.tdNum}>{h.hora}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
