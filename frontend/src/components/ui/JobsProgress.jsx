import { T } from "../../theme";

// Barra de progresso persistente no canto da tela pra ações em massa que
// rodam em background no servidor (ex.: tag em massa) - fica visível mesmo
// navegando pra outra tela, porque vive em App.jsx (não desmonta com a view).
export function JobsProgress({ jobs, onDismiss }) {
  if (!jobs.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, display: "grid", gap: 8, zIndex: 65 }}>
      {jobs.map((j) => {
        const pct = j.total > 0 ? Math.round((j.processados / j.total) * 100) : 100;
        return (
          <div key={j.id} style={{ width: 290, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(20,40,55,.18)", padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{j.label}</span>
              {j.concluido && (
                <button onClick={() => onDismiss(j.id)} style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1 }}>×</button>
              )}
            </div>
            <div style={{ height: 6, background: T.lineSoft, borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: j.concluido ? T.wa : T.primary, transition: "width .3s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 6 }}>
              {j.concluido ? `Concluído — ${j.afetados} processado(s)` : `Processando... ${j.processados}/${j.total}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
