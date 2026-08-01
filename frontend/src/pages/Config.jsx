import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { WhatsAppLogo } from "../components/icons";

export function Config({ showToast }) {
  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 760 }}>
      <Card title="Dados da clínica">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Nome"><input style={s.input} defaultValue="Orthodontic SJC" /></Field>
          <Field label="Unidade"><input style={s.input} defaultValue="Vilaça" /></Field>
          <Field label="Email de contato"><input style={s.input} defaultValue="contato@orthodonticsjc.com.br" /></Field>
          <Field label="Telefone"><input style={s.input} defaultValue="(12) 3000 0000" /></Field>
        </div>
        <button style={{ ...s.btnPrimarySm, marginTop: 6 }} onClick={() => showToast("Salvo", "ok")}>Salvar</button>
      </Card>
      <Card title="Integração WhatsApp">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ ...s.channelIcon, background: T.wa + "1A" }}><WhatsAppLogo size={24} /></span>
          <div><div style={{ fontWeight: 700, color: T.ink }}>API conectada</div><div style={{ fontSize: 12.5, color: T.inkSoft }}>Número verificado · qualidade alta</div></div>
          <span style={{ ...s.tagOk, marginLeft: "auto" }}>● Ativo</span>
        </div>
      </Card>
    </div>
  );
}
