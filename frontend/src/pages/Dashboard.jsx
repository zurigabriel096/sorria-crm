import { useMemo } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { num } from "../utils/format";
import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { ImportBox } from "../components/ui/ImportBox";
import { IconUsers, IconCheck, IconSend } from "../components/icons";

// TODO(backend): substituir os cálculos abaixo por uma chamada a
// src/api/dashboard.js `getDashboardKpis()` — hoje tudo é derivado no cliente
// a partir da lista completa de pacientes em memória.
export function Dashboard({ patients, historico, onImport, showToast, setView }) {
  const segCount = useMemo(() => {
    const c = {};
    patients.forEach((p) => (c[p.segmento] = (c[p.segmento] || 0) + 1));
    return c;
  }, [patients]);

  const elegiveis = patients.filter((p) => p.elegivel && p.enviado === "Pendente").length;
  const entregues = historico.filter((h) => h.status === "Entregue" || h.status === "Disparado").length;

  if (!patients.length) {
    return (
      <div style={{ display: "grid", gap: 16, placeItems: "center", padding: "40px 0" }}>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginBottom: 6 }}>Comece importando sua base</div>
          <div style={{ fontSize: 14, color: T.inkSoft, marginBottom: 20 }}>Sua conta está limpa. Suba uma das suas planilhas da Orthodontic para popular o painel, os pacientes e a agenda.</div>
        </div>
        <div style={{ width: "min(560px,100%)" }}><ImportBox onImport={onImport} showToast={showToast} /></div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={s.kpiRow}>
        <KpiCard label="Pacientes na base" value={num(patients.length)} icon={<IconUsers color={T.primary} />} />
        <KpiCard label="Elegíveis p/ disparo" value={num(elegiveis)} sub="telefone válido" icon={<IconCheck color={T.wa} />} />
        <KpiCard label="Mensagens disparadas" value={num(historico.length)} icon={<IconSend color={T.gold} />} />
        <KpiCard label="Entregues" value={num(entregues)} highlight icon={<IconCheck color="#fff" />} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }} className="dashGrid">
        <Card title="Base por segmento (RFMV)">
          {Object.entries(T.seg).map(([seg, col]) => (
            <div key={seg} style={s.segRow}>
              <span style={{ ...s.segBadge, color: col.fg, background: col.bg }}>{seg}</span>
              <div style={s.segBarTrack}>
                <div style={{ ...s.segBarFill, width: `${(segCount[seg] || 0) / patients.length * 100}%`, background: col.fg }} />
              </div>
              <b style={{ fontSize: 13, color: T.ink, width: 26, textAlign: "right" }}>{segCount[seg] || 0}</b>
            </div>
          ))}
          <button style={{ ...s.btnGhost, marginTop: 16 }} onClick={() => setView("pacientes")}>Ver pacientes</button>
        </Card>
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <ImportBox onImport={onImport} showToast={showToast} compact />
          <Card title="Atalhos">
            <div style={{ display: "grid", gap: 8 }}>
              <button style={s.btnGhost} onClick={() => setView("campanhas")}>Criar campanha</button>
              <button style={s.btnGhost} onClick={() => setView("segmentacoes")}>Segmentar base</button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
