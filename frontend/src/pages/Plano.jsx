import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { PERIODOS, PRECOS } from "../data/seed";
import { brl, num } from "../utils/format";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Metric } from "../components/ui/Metric";

export function Plano({ showToast }) {
  const [per, setPer] = useState(Object.keys(PERIODOS)[0]);
  const d = PERIODOS[per];
  const excUtil = Math.max(0, d.util - d.cotaUtil);
  const fatUtil = excUtil * PRECOS.util;
  const total = PRECOS.mensalidade + fatUtil;

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 900 }}>
      <div style={s.aviso}>Todas as faturas são enviadas no dia 02 para o email cadastrado no Conta Azul. Se não estiver recebendo, fale com o suporte para atualizarmos o email do setor financeiro.</div>
      <div style={s.planHero}>
        <div>
          <div style={{ fontSize: 13, opacity: .85 }}>Plano contratado</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Advanced · Pré-pago (Volumetria Unificada)</div>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 2 }}>Parceiro: Orthodontic · Volumetria {num(PRECOS.volumetria)} · Desconto {PRECOS.desconto}%</div>
        </div>
        <button style={s.planUpgrade} onClick={() => showToast("Abrindo planos...", "ok")}>Ver planos →</button>
      </div>
      <div style={s.volGrid}>
        <PriceCard label="Mensalidade" value={brl(PRECOS.mensalidade)} />
        <PriceCard label="Excedente (contato)" value={brl(PRECOS.excedenteContato)} sub="65% desconto" />
        <PriceCard label="Msg Marketing" value={brl(PRECOS.mkt)} sub="24% desconto" />
        <PriceCard label="Msg Utilidade" value={brl(PRECOS.util)} sub="0% desconto" />
        <PriceCard label="Msg Autenticação" value={brl(PRECOS.auth)} sub="20% desconto" />
      </div>
      <Card title="Consumo">
        <Field label="Período selecionado (vigência da contratação)"><Select block value={per} onChange={setPer} options={Object.keys(PERIODOS)} /></Field>
        <div style={{ ...s.summaryRow, marginTop: 6 }}>
          <Metric label="Contatos" value={num(d.contatos)} />
          <Metric label="Msg Marketing" value={num(d.mkt)} />
          <Metric label="Msg Utilidade" value={num(d.util)} />
          <Metric label="Msg Autenticação" value={num(d.auth)} />
        </div>
      </Card>
      <Card title="Fatura do período">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <FatRow label="Mensalidade" val={brl(PRECOS.mensalidade)} />
            <FatRow label="Excedentes de contato" calc={`0 × ${brl(PRECOS.excedenteContato)}`} val={brl(0)} />
            <FatRow label="Mensagem de Marketing" calc={`0 × ${brl(PRECOS.mkt)}`} val={brl(0)} />
            <FatRow label="Mensagem de Utilidade" calc={`${num(excUtil)} × ${brl(PRECOS.util)}`} val={brl(fatUtil)} />
            <FatRow label="Mensagem de Autenticação" calc={`0 × ${brl(PRECOS.auth)}`} val={brl(0)} />
            <tr>
              <td style={{ ...s.fatTd, fontWeight: 800, color: T.ink, fontSize: 16, borderTop: `2px solid ${T.primary}` }}>Total</td>
              <td />
              <td style={{ ...s.fatTd, textAlign: "right", fontWeight: 800, color: T.primary, fontSize: 18, borderTop: `2px solid ${T.primary}` }}>{brl(total)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const PriceCard = ({ label, value, sub }) => (
  <div style={s.volCard}>
    <div style={{ fontSize: 12, color: T.inkSoft }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.primary, fontWeight: 600 }}>{sub}</div>}
  </div>
);

const FatRow = ({ label, calc, val }) => (
  <tr>
    <td style={s.fatTd}>{label}{calc && <div style={{ fontSize: 11.5, color: T.inkSoft }}>{calc}</div>}</td>
    <td />
    <td style={{ ...s.fatTd, textAlign: "right", fontWeight: 700, color: T.ink }}>{val}</td>
  </tr>
);
