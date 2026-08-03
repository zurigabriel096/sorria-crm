import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { PRECOS } from "../data/seed";
import { brl, num } from "../utils/format";
import { getDashboardKpis, getDisparosPorCategoria } from "../api/dashboard";
import { Card } from "../components/ui/Card";
import { Metric } from "../components/ui/Metric";

// Fatura desta tela e' ilustrativa (Sorr.ia nao fatura o Samuel de verdade
// por ela - ver seed.js) mas todo o CONSUMO (leads, disparos por categoria)
// vem do backend de verdade, sem numero mockado.
//
// Volumetria incluida (PRECOS.volumetriaIncluida) e' uma cota UNICA
// compartilhada entre Marketing e Utilidade. O excedente (o que passou da
// cota) e' rateado entre as duas categorias na mesma proporcao em que cada
// uma apareceu no total disparado - assim uma campanha de Marketing muito
// maior que a de Utilidade paga mais do excedente, proporcionalmente.
function calcularExcedente(disparos) {
  const mkt = disparos?.Marketing || 0;
  const util = disparos?.Utilidade || 0;
  const total = mkt + util;
  const excedenteTotal = Math.max(0, total - PRECOS.volumetriaIncluida);
  const excedenteMkt = total > 0 ? Math.round(excedenteTotal * (mkt / total)) : 0;
  const excedenteUtil = excedenteTotal - excedenteMkt;
  return {
    mkt, util, total, excedenteTotal, excedenteMkt, excedenteUtil,
    valorExcedenteMkt: excedenteMkt * PRECOS.msgMarketing,
    valorExcedenteUtil: excedenteUtil * PRECOS.msgUtilidade,
  };
}

export function Plano({ showToast, usuario }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const [kpis, setKpis] = useState(null);
  const [disparos, setDisparos] = useState(null);

  useEffect(() => {
    getDashboardKpis().then(setKpis).catch((e) => showToast(e.message || "Erro ao carregar consumo do plano", "warn"));
    getDisparosPorCategoria().then(setDisparos).catch((e) => showToast(e.message || "Erro ao carregar disparos por categoria", "warn"));
  }, []);

  if (!kpis || !disparos) {
    return <div style={{ color: T.inkSoft, fontSize: 14, padding: "20px 0" }}>Carregando plano...</div>;
  }

  const ex = calcularExcedente(disparos);
  const autenticacao = disparos.Autenticação || 0;
  const total = PRECOS.mensalidade + ex.valorExcedenteMkt + ex.valorExcedenteUtil;

  return (
    <div style={{ position: "relative" }}>
      {!souAdmin && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center",
          background: "rgba(255,255,255,.55)", backdropFilter: "blur(6px)", borderRadius: 12,
        }}>
          <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: "18px 24px", boxShadow: "0 10px 30px rgba(20,40,55,.14)", textAlign: "center", maxWidth: 320 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>Visível só para administradores</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>Fale com o administrador da conta se precisar de informações sobre o plano.</div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gap: 18, maxWidth: 780, ...(!souAdmin ? { filter: "blur(6px)", pointerEvents: "none", userSelect: "none" } : {}) }}>
      <div style={s.aviso}>Todas as faturas são enviadas no dia 02 para o email cadastrado. Se não estiver recebendo, fale com o suporte para atualizarmos o email do setor financeiro.</div>
      <div style={s.planHero}>
        <div>
          <div style={{ fontSize: 13, opacity: .85 }}>Plano contratado</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Sorr.ia · {brl(PRECOS.mensalidade)}/mês</div>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 2 }}>Cobrança mensal recorrente · sem fidelidade</div>
        </div>
        <button style={s.planUpgrade} onClick={() => showToast("Abrindo planos...", "ok")}>Ver planos →</button>
      </div>
      <div style={s.volGrid}>
        <PriceCard label="Mensalidade" value={brl(PRECOS.mensalidade)} />
        <PriceCard label="Volumetria incluída" value={`${num(PRECOS.volumetriaIncluida)} msgs/mês`} sub="Marketing R$0,24 · Utilidade R$0,15 no excedente" />
        <PriceCard label="Mensagem Email" value="Em breve" valueColor="#FF6500" />
      </div>
      <Card title="Consumo do período">
        <div style={s.summaryRow}>
          <Metric label="Leads na base" value={num(kpis.totalContatos)} />
          <Metric label="Mensagens enviadas" value={num(ex.total)} sub="WhatsApp Marketing + Utilidade" />
        </div>
        <div style={{ ...s.summaryRow, marginTop: 16 }}>
          <Metric label="WhatsApp Marketing" value={num(ex.mkt)} />
          <Metric label="WhatsApp Utilidade" value={num(ex.util)} />
          <Metric label="WhatsApp Autenticação" value={num(autenticacao)} accent={T.inkSoft} sub="em desenvolvimento" />
        </div>
      </Card>
      <Card title="Volumetria e excedente do período">
        <div style={s.summaryRow}>
          <Metric label="Incluído no plano" value={`${num(PRECOS.volumetriaIncluida)} msgs`} />
          <Metric label="Disparado no período" value={num(ex.total)} />
          <Metric label="Excedente total" value={num(ex.excedenteTotal)} accent={ex.excedenteTotal > 0 ? T.gold : T.ink} />
        </div>
        {ex.excedenteTotal > 0 && (
          <div style={{ ...s.summaryRow, marginTop: 16 }}>
            <Metric label="Excedente Marketing" value={num(ex.excedenteMkt)} sub={`${brl(ex.valorExcedenteMkt)}`} />
            <Metric label="Excedente Utilidade" value={num(ex.excedenteUtil)} sub={`${brl(ex.valorExcedenteUtil)}`} />
          </div>
        )}
      </Card>
      <Card title="Fatura do período">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <FatRow label="Mensalidade" val={brl(PRECOS.mensalidade)} />
            <FatRow
              label="Mensagem WhatsApp · Marketing"
              calc={ex.excedenteMkt > 0 ? `${num(ex.excedenteMkt)} excedentes × ${brl(PRECOS.msgMarketing)}` : "dentro da volumetria incluída"}
              val={brl(ex.valorExcedenteMkt)}
            />
            <FatRow
              label="Mensagem WhatsApp · Utilidade"
              calc={ex.excedenteUtil > 0 ? `${num(ex.excedenteUtil)} excedentes × ${brl(PRECOS.msgUtilidade)}` : "dentro da volumetria incluída"}
              val={brl(ex.valorExcedenteUtil)}
            />
            <FatRow
              label="Mensagem WhatsApp · Autenticação"
              calc={`${num(autenticacao)} × ${brl(PRECOS.msgAutenticacao)} · não cobrado (em desenvolvimento)`}
              val={brl(autenticacao * PRECOS.msgAutenticacao)}
              tachado
            />
            <tr>
              <td style={{ ...s.fatTd, fontWeight: 800, color: T.ink, fontSize: 16, borderTop: `2px solid ${T.primary}` }}>Total</td>
              <td />
              <td style={{ ...s.fatTd, textAlign: "right", fontWeight: 800, color: T.primary, fontSize: 18, borderTop: `2px solid ${T.primary}` }}>{brl(total)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      </div>
    </div>
  );
}

const PriceCard = ({ label, value, valueColor, sub }) => (
  <div style={s.volCard}>
    <div style={{ fontSize: 12, color: T.inkSoft }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: valueColor || T.ink }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 2 }}>{sub}</div>}
  </div>
);

const FatRow = ({ label, calc, val, tachado }) => (
  <tr>
    <td style={{ ...s.fatTd, ...(tachado ? { color: T.inkSoft } : {}) }}>
      {label}
      {calc && <div style={{ fontSize: 11.5, color: T.inkSoft }}>{calc}</div>}
    </td>
    <td />
    <td style={{ ...s.fatTd, textAlign: "right", fontWeight: 700, color: tachado ? T.inkSoft : T.ink, textDecoration: tachado ? "line-through" : "none" }}>{val}</td>
  </tr>
);
