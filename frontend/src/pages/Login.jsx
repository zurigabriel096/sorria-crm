import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Logo } from "../components/Logo";
import { Field } from "../components/ui/Field";

// TODO(backend): trocar onEnter() por uma chamada real a src/api/auth.js `login(email, senha)`
// e só liberar o app quando o backend responder 200 com o token JWT.
export function Login({ onEnter, onSupport }) {
  const [email, setEmail] = useState("clinica@orthodonticsjc.com.br");
  const [senha, setSenha] = useState("demodemo");

  return (
    <div style={s.loginRoot}>
      <div style={s.loginLeft}>
        <div style={{ maxWidth: 380 }}>
          <Logo size={30} light />
          <h1 style={s.loginH1}>
            O CRM que faz sua clínica{" "}
            <span className="notranslate" translate="no" style={{ color: "#fff", background: T.primaryDark, padding: "0 6px", borderRadius: 6 }}>sorrir</span> de novo.
          </h1>
          <p style={s.loginSub}>Reative pacientes inativos por WhatsApp e email, acompanhe conversões e LTV, sem planilha e sem operar disparo por disparo.</p>
        </div>
      </div>
      <div style={s.loginRight}>
        <div style={s.loginCard}>
          <Logo size={24} />
          <h2 style={{ marginTop: 22, fontSize: 20, fontWeight: 800, color: T.ink }}>Entrar na sua conta</h2>
          <p style={{ color: T.inkSoft, fontSize: 13.5, margin: "4px 0 22px" }}>Bem-vindo de volta</p>
          <Field label="Email"><input style={s.input} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Senha"><input style={s.input} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} /></Field>
          <div style={{ textAlign: "right", margin: "-4px 0 18px" }}>
            <button style={s.linkBtn} onClick={onSupport}>Esqueci minha senha</button>
          </div>
          <button style={s.btnPrimary} onClick={onEnter}>Entrar</button>
          <p style={{ textAlign: "center", fontSize: 13, color: T.inkSoft, marginTop: 22 }}>
            Precisa de ajuda? <button style={s.linkBtn} onClick={onSupport}>Falar com o suporte</button>
          </p>
        </div>
      </div>
    </div>
  );
}
