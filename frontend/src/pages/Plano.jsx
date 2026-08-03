import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { PERIODOS, PRECOS } from "../data/seed";
import { brl, num } from "../utils/format";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Metric } from "../components/ui/Metric";

export function Plano({ showToast, usuario }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const [per, setPer] = useState(Object.keys(PERIODOS)[0]);
  const d = PERIODOS[per];
  const msgsWhats = d.mkt + d.util;
  const custoMsgs = msgsWhats * PRECOS.msgWhats;
  const total = PRECOS.mensalidade + custoMsgs;

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
        <PriceCard label="Msg WhatsApp" value={brl(PRECOS.msgWhats)} />
        <PriceCard label="Msg Email" value={brl(PRECOS.msgEmail)} />
      </div>
      <Card title="Consumo do período">
        <Field label="Período"><Select block value={per} onChange={setPer} options={Object.keys(PERIODOS)} /></Field>
        <div style={{ ...s.summaryRow, marginTop: 6 }}>
          <Metric label="Contatos na base" value={num(d.contatos)} />
          <Metric label="Mensagens enviadas" value={num(msgsWhats)} />
        </div>
      </Card>
      <Card title="Fatura do período">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <FatRow label="Mensalidade" val={brl(PRECOS.mensalidade)} />
            <FatRow label="Mensagens de WhatsApp" calc={`${num(msgsWhats)} × ${brl(PRECOS.msgWhats)}`} val={brl(custoMsgs)} />
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

const PriceCard = ({ label, value }) => (
  <div style={s.volCard}>
    <div style={{ fontSize: 12, color: T.inkSoft }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>{value}</div>
  </div>
);

const FatRow = ({ label, calc, val }) => (
  <tr>
    <td style={s.fatTd}>{label}{calc && <div style={{ fontSize: 11.5, color: T.inkSoft }}>{calc}</div>}</td>
    <td />
    <td style={{ ...s.fatTd, textAlign: "right", fontWeight: 700, color: T.ink }}>{val}</td>
  </tr>
);
