import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { PERIODOS, PRECOS } from "../data/seed";
import { brl, num } from "../utils/format";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Metric } from "../components/ui/Metric";
import { IconCheck } from "../components/icons";

const BENEFICIOS = [
  "Contatos e campanhas ilimitados",
  "1 número de WhatsApp conectado",
  "Disparo em massa com segmentação",
  "Dashboard e histórico de disparos",
  "Suporte via chat",
];

export function Plano({ showToast }) {
  const [per, setPer] = useState(Object.keys(PERIODOS)[0]);
  const d = PERIODOS[per];

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 780 }}>
      <div style={s.aviso}>Todas as faturas são enviadas no dia 02 para o email cadastrado. Se não estiver recebendo, fale com o suporte para atualizarmos o email do setor financeiro.</div>
      <div style={s.planHero}>
        <div>
          <div style={{ fontSize: 13, opacity: .85 }}>Plano contratado</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Sorr.ia · {brl(PRECOS.mensalidade)}/mês</div>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 2 }}>Cobrança mensal recorrente · sem fidelidade</div>
        </div>
        <button style={s.planUpgrade} onClick={() => showToast("Abrindo planos...", "ok")}>Ver planos →</button>
      </div>
      <Card title="O que está incluso">
        <div style={{ display: "grid", gap: 10 }}>
          {BENEFICIOS.map((b) => (
            <div key={b} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: T.ink }}>
              <IconCheck color={T.wa} /> {b}
            </div>
          ))}
        </div>
      </Card>
      <Card title="Consumo do período">
        <Field label="Período"><Select block value={per} onChange={setPer} options={Object.keys(PERIODOS)} /></Field>
        <div style={{ ...s.summaryRow, marginTop: 6 }}>
          <Metric label="Contatos na base" value={num(d.contatos)} />
          <Metric label="Mensagens enviadas" value={num(d.mkt + d.util)} />
        </div>
      </Card>
      <Card title="Próxima fatura">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: T.inkSoft }}>Assinatura mensal Sorr.ia</span>
          <b style={{ fontSize: 22, color: T.primary }}>{brl(PRECOS.mensalidade)}</b>
        </div>
      </Card>
    </div>
  );
}
