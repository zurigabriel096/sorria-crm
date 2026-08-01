import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { WhatsAppLogo } from "../components/icons";
import { getWhatsAppStatus, desconectarWhatsApp, solicitarCodigoPareamento } from "../api/whatsapp";

// A Evolution recusa gerar codigo de pareamento com um numero ja logado
// ("instance is already authenticated") - por isso a desconexao e um passo
// explicito e confirmado, antes de liberar o campo de numero novo.
function ConectarNumeroModal({ onClose, showToast, onConectado, statusInicial }) {
  const [desconectado, setDesconectado] = useState(!(statusInicial?.connected && statusInicial?.loggedIn));
  const [confirmarDesconexao, setConfirmarDesconexao] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [pairingCode, setPairingCode] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const desconectarAtual = async () => {
    setDesconectando(true);
    try {
      await desconectarWhatsApp();
      setDesconectado(true);
      showToast("Número desconectado. Agora gere o código do novo número.", "ok");
    } catch (e) {
      showToast(e.message, "warn");
    } finally {
      setDesconectando(false);
    }
  };

  const gerarCodigo = async () => {
    setCarregando(true);
    try {
      const { pairingCode } = await solicitarCodigoPareamento(telefone);
      setPairingCode(pairingCode);
    } catch (e) {
      showToast(e.message, "warn");
    } finally {
      setCarregando(false);
    }
  };

  const jaConectei = async () => {
    setVerificando(true);
    try {
      const status = await getWhatsAppStatus();
      if (status.connected && status.loggedIn) {
        showToast(`WhatsApp conectado: ${status.nome}`, "ok");
        onConectado(status);
        onClose();
      } else {
        showToast("Ainda não detectei a conexão. Confirme se digitou o código no WhatsApp e tente de novo.", "warn");
      }
    } catch (e) {
      showToast(e.message, "warn");
    } finally {
      setVerificando(false);
    }
  };

  if (!desconectado) {
    return (
      <Modal title="Conectar número por código" onClose={onClose}>
        <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 16 }}>
          Existe um número conectado agora (<strong>{statusInicial?.nome}</strong>). A Evolution só
          gera o código do número novo depois que este for desconectado — e isso interrompe o
          disparo de mensagens até o novo número ser pareado.
        </p>
        {!confirmarDesconexao ? (
          <button style={{ ...s.btnGhostSm, width: "100%", justifyContent: "center" }} onClick={() => setConfirmarDesconexao(true)}>
            Desconectar número atual
          </button>
        ) : (
          <>
            <p style={{ fontSize: 13, color: T.coral, fontWeight: 600, marginBottom: 12 }}>
              Confirma? Isso desconecta "{statusInicial?.nome}" agora mesmo.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...s.btnGhostSm, flex: 1, justifyContent: "center" }} onClick={() => setConfirmarDesconexao(false)}>
                Cancelar
              </button>
              <button style={{ ...s.btnPrimarySm, flex: 1, justifyContent: "center" }} disabled={desconectando} onClick={desconectarAtual}>
                {desconectando ? "Desconectando..." : "Sim, desconectar"}
              </button>
            </div>
          </>
        )}
      </Modal>
    );
  }

  return (
    <Modal title="Conectar número por código" onClose={onClose}>
      {!pairingCode ? (
        <>
          <Field label="Número do WhatsApp (com DDD)">
            <input
              style={s.input}
              placeholder="12988887777"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </Field>
          <button
            style={{ ...s.btnPrimarySm, width: "100%", justifyContent: "center", opacity: telefone.trim() ? 1 : 0.5 }}
            disabled={!telefone.trim() || carregando}
            onClick={gerarCodigo}
          >
            {carregando ? "Gerando código..." : "Gerar código"}
          </button>
        </>
      ) : (
        <>
          <div style={{
            textAlign: "center", padding: "18px 12px", borderRadius: 12, background: T.primarySoft,
            fontSize: 26, fontWeight: 800, letterSpacing: 3, color: T.primaryDark, marginBottom: 14,
          }}>
            {pairingCode}
          </div>
          <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 16 }}>
            No celular do número <strong>{telefone}</strong>, abra o WhatsApp → <strong>Configurações</strong> →{" "}
            <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong> →{" "}
            <strong>Conectar com número de telefone</strong> → digite o código acima.
          </p>
          <button
            style={{ ...s.btnPrimarySm, width: "100%", justifyContent: "center" }}
            disabled={verificando}
            onClick={jaConectei}
          >
            {verificando ? "Verificando..." : "Já conectei"}
          </button>
        </>
      )}
    </Modal>
  );
}

export function Config({ showToast, usuario }) {
  const [status, setStatus] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const souAdmin = usuario?.papel === "ADMIN";

  const carregarStatus = () => {
    getWhatsAppStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false, loggedIn: false, nome: "" }));
  };

  useEffect(() => { carregarStatus(); }, []);

  const conectado = status?.connected && status?.loggedIn;

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
          <div>
            <div style={{ fontWeight: 700, color: T.ink }}>
              {status === null ? "Verificando..." : conectado ? "API conectada" : "Desconectada"}
            </div>
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>
              {conectado ? `Número: ${status.nome || "verificado"}` : "Nenhum número pareado no momento"}
            </div>
          </div>
          <span style={{ ...s.tagOk, marginLeft: "auto", ...(conectado ? {} : { color: T.coral, background: T.coral + "1A" }) }}>
            {status === null ? "···" : conectado ? "● Ativo" : "● Inativo"}
          </span>
        </div>
        {souAdmin && (
          <button style={{ ...s.btnGhostSm, marginTop: 14 }} onClick={() => setModalAberto(true)}>
            {conectado ? "Trocar número" : "Conectar número"}
          </button>
        )}
      </Card>
      {modalAberto && (
        <ConectarNumeroModal
          onClose={() => setModalAberto(false)}
          showToast={showToast}
          onConectado={(s) => setStatus(s)}
          statusInicial={status}
        />
      )}
    </div>
  );
}
