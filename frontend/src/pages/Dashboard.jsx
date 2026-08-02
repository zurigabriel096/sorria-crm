import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { num } from "../utils/format";
import { getDashboardKpis } from "../api/dashboard";
import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { ImportBox } from "../components/ui/ImportBox";
import { IconUsers, IconCheck, IconSend } from "../components/icons";

export function Dashboard({ patients, historico, onImport, showToast, setView, irParaPacientes }) {
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    if (!patients.length) return;
    getDashboardKpis().then(setKpis).catch((e) => showToast(e.message || "Erro ao carregar KPIs", "warn"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients.length, historico.length]);

  if (!patients.length) {
    return (
      <div style={{ display: "grid", gap: 16, placeItems: "center", padding: "40px 0" }}>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginBottom: 6 }}>Comece importando sua base</div>
          <div style={{ fontSize: 14, color: T.inkSoft, marginBottom: 20 }}>Sua conta está limpa. Suba uma das suas planilhas da Orthodontic para popular o painel, a base de leads e a agenda.</div>
        </div>
        <div style={{ width: "min(560px,100%)" }}><ImportBox onImport={onImport} showToast={showToast} /></div>
      </div>
    );
  }

  if (!kpis) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "20px 0" }}>Carregando painel...</div>;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={s.kpiRow}>
        <KpiCard label="Leads na base" value={num(kpis.totalContatos)} icon={<IconUsers color={T.primary} />} onClick={() => irParaPacientes()} />
        <KpiCard label="Elegíveis p/ disparo" value={num(kpis.elegiveis)} sub="telefone válido" icon={<IconCheck color={T.wa} />} onClick={() => irParaPacientes("Elegíveis")} />
        <KpiCard label="Mensagens disparadas" value={num(kpis.disparados)} icon={<IconSend color={T.gold} />} onClick={() => setView("disparos")} />
        <KpiCard label="Entregues" value={num(kpis.entregues)} highlight icon={<IconCheck color="#fff" />} onClick={() => setView("disparos")} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }} className="dashGrid">
        <Card title="Base por estágio">
          {Object.entries(kpis.porEstagio || {}).map(([etapa, qtd]) => {
            const col = T.estagio[etapa] || T.estagio.Lead;
            return (
              <div key={etapa} style={s.segRow}>
                <span style={{ ...s.segBadge, color: col.fg, background: col.bg }}>{etapa}</span>
                <div style={s.segBarTrack}>
                  <div style={{ ...s.segBarFill, width: `${(qtd / (kpis.totalContatos || 1)) * 100}%`, background: col.fg }} />
                </div>
                <b style={{ fontSize: 13, color: T.ink, width: 26, textAlign: "right" }}>{qtd}</b>
              </div>
            );
          })}
          <button style={{ ...s.btnGhost, marginTop: 16 }} onClick={() => setView("pacientes")}>Ver base de leads</button>
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
