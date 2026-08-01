import { useState } from "react";
import { T, SUPORTE_WA } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Dot, WhatsAppLogo, IconMail } from "../components/icons";

export function Suporte({ showToast }) {
  const [assunto, setAssunto] = useState("");
  const [prioridade, setPrioridade] = useState("Normal");
  const [msg, setMsg] = useState("");

  const enviar = () => {
    if (!assunto.trim() || !msg.trim()) return showToast("Preencha assunto e mensagem", "warn");
    showToast(`Chamado #${Math.floor(Math.random() * 9000 + 1000)} criado`, "ok");
    setAssunto("");
    setMsg("");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }} className="dashGrid">
      <Card title="Abrir chamado">
        <Field label="Assunto"><input style={s.input} value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Como podemos ajudar?" /></Field>
        <Field label="Prioridade"><Select block value={prioridade} onChange={setPrioridade} options={["Baixa", "Normal", "Alta", "Urgente"]} /></Field>
        <Field label="Mensagem"><textarea style={s.textarea} rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Descreva o que está acontecendo..." /></Field>
        <button style={{ ...s.btnPrimary, width: "100%" }} onClick={enviar}>Enviar chamado</button>
      </Card>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <a href={SUPORTE_WA} target="_blank" rel="noreferrer" className="channelCard" style={{ ...s.channelCard, textDecoration: "none" }}>
          <span style={{ ...s.channelIcon, background: T.wa + "1A" }}><WhatsAppLogo size={26} /></span>
          <div style={{ textAlign: "left" }}><div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>WhatsApp</div><div style={{ fontSize: 12.5, color: T.inkSoft }}>Resposta em ~10 min</div></div>
          <span style={{ marginLeft: "auto", color: T.inkSoft }}>›</span>
        </a>
        <button className="channelCard" style={s.channelCard} onClick={() => showToast("suporte@sorria.app", "ok")}>
          <span style={{ ...s.channelIcon, background: T.primary + "1A" }}><IconMail color={T.primary} /></span>
          <div style={{ textAlign: "left" }}><div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>Email</div><div style={{ fontSize: 12.5, color: T.inkSoft }}>suporte@sorria.app</div></div>
        </button>
        <div style={s.slaCard}>
          <div style={{ fontWeight: 700, color: T.ink, fontSize: 14, marginBottom: 6 }}>Status dos sistemas</div>
          {["Disparo WhatsApp", "Envio de email", "Painel"].map((x) => (
            <div key={x} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.inkSoft, padding: "4px 0" }}>
              <Dot color={T.wa} /> {x}<span style={{ marginLeft: "auto", color: T.wa, fontWeight: 600 }}>Operacional</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
