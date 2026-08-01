import { s } from "../styles/s";
import { T } from "../theme";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";

export function HistoricoDisparos({ historico, patients, onAbrirPaciente }) {
  if (!historico.length) {
    return <Card><div style={{ textAlign: "center", padding: 24, color: T.inkSoft }}>Nenhum disparo ainda.</div></Card>;
  }

  const abrir = (h) => {
    const paciente = patients.find((p) => p.id === h.contatoId);
    if (paciente) onAbrirPaciente(paciente, "historico");
  };

  return (
    <Card noPad>
      <div style={s.tableScroll}>
        <table style={s.table}>
          <thead><tr><th style={s.thL}>Lead</th><th style={s.th}>Campanha</th><th style={s.th}>Status</th><th style={s.th}>Data</th></tr></thead>
          <tbody>
            {historico.map((h, i) => (
              <tr key={i} className="prow" onClick={() => abrir(h)}>
                <td style={s.tdL}><b style={{ color: T.primary }}>{h.nome}</b></td>
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
