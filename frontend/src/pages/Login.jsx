import { useRef, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Logo } from "../components/Logo";
import { Field } from "../components/ui/Field";
import { login } from "../api/auth";

// No plano free do Render, o backend "dorme" após ~15 min sem uso e demora até
// ~1 min pra acordar na próxima chamada — esse aviso evita que pareça travado.
const AVISO_DELAY_MS = 4000;

export function Login({ onEnter, onSupport }) {
  const [email, setEmail] = useState("clinica@orthodonticsjc.com.br");
  const [senha, setSenha] = useState("demodemo");
  const [loading, setLoading] = useState(false);
  const [avisoLento, setAvisoLento] = useState(false);
  const [erro, setErro] = useState("");
  const avisoTimer = useRef(null);

  const entrar = async () => {
    setErro("");
    setAvisoLento(false);
    setLoading(true);
    avisoTimer.current = setTimeout(() => setAvisoLento(true), AVISO_DELAY_MS);
    try {
      const usuario = await login(email, senha);
      onEnter(usuario);
    } catch (e) {
      setErro(e.message || "Não foi possível entrar. Confira email e senha.");
    } finally {
      clearTimeout(avisoTimer.current);
      setAvisoLento(false);
      setLoading(false);
    }
  };

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
          <Field label="Email"><input style={s.input} value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} /></Field>
          <Field label="Senha"><input style={s.input} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} /></Field>
          {erro && <p style={{ color: T.coral, fontSize: 13, marginTop: -8, marginBottom: 14 }}>{erro}</p>}
          <div style={{ textAlign: "right", margin: "-4px 0 18px" }}>
            <button style={s.linkBtn} onClick={onSupport}>Esqueci minha senha</button>
          </div>
          <button style={{ ...s.btnPrimary, opacity: loading ? .6 : 1 }} onClick={entrar} disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
          {avisoLento && (
            <p style={{ textAlign: "center", fontSize: 12.5, color: T.inkSoft, marginTop: 10 }}>
              Pode demorar até 1 minuto na primeira vez — o servidor está acordando.
            </p>
          )}
          <p style={{ textAlign: "center", fontSize: 13, color: T.inkSoft, marginTop: 22 }}>
            Precisa de ajuda? <button style={s.linkBtn} onClick={onSupport}>Falar com o suporte</button>
          </p>
        </div>
      </div>
    </div>
  );
}
