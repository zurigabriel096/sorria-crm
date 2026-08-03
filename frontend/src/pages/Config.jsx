import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { WhatsAppLogo } from "../components/icons";
import { getWhatsAppStatus, desconectarWhatsApp, solicitarCodigoPareamento, obterQrCodeWhatsApp } from "../api/whatsapp";
import { listNumeros, createNumero, deleteNumero, gerarQrCodeNumero, solicitarPareamentoNumero } from "../api/whatsappNumeros";

// A Evolution recusa gerar codigo de pareamento com um numero ja logado
// ("instance is already authenticated") - por isso a desconexao e um passo
// explicito e confirmado, antes de liberar o campo de numero novo. So se
// aplica ao numero PRINCIPAL (numeroId null) - um numero secundario novo
// (WhatsAppNumeroService.criar) ja nasce como instancia propria e
// desconectada, nunca precisa desse gate.
const QR_DURACAO_SEGUNDOS = 25;

function ConectarNumeroModal({ numeroId, onClose, showToast, onConectado, statusInicial }) {
  const [desconectado, setDesconectado] = useState(!!numeroId || !(statusInicial?.connected && statusInicial?.loggedIn));
  const [confirmarDesconexao, setConfirmarDesconexao] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const [metodo, setMetodo] = useState("qr");
  const [telefone, setTelefone] = useState("");
  const [pairingCode, setPairingCode] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [segundosRestantes, setSegundosRestantes] = useState(QR_DURACAO_SEGUNDOS);
  const [carregando, setCarregando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  // O QR do WhatsApp expira rapido (parecido com o WhatsApp Web) - conta regressiva
  // visual e, ao zerar, gera um novo automaticamente, sem exigir clique manual.
  useEffect(() => {
    if (metodo !== "qr" || !qrCode) return;
    setSegundosRestantes(QR_DURACAO_SEGUNDOS);
    const intervalo = setInterval(() => {
      setSegundosRestantes((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [qrCode, metodo]);

  useEffect(() => {
    if (metodo === "qr" && qrCode && segundosRestantes === 0 && !carregando) {
      gerarQrCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundosRestantes]);

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
      const { pairingCode } = numeroId ? await solicitarPareamentoNumero(numeroId, telefone) : await solicitarCodigoPareamento(telefone);
      setPairingCode(pairingCode);
    } catch (e) {
      showToast(e.message, "warn");
    } finally {
      setCarregando(false);
    }
  };

  const gerarQrCode = async () => {
    setCarregando(true);
    try {
      const { qrcode } = numeroId ? await gerarQrCodeNumero(numeroId) : await obterQrCodeWhatsApp();
      setQrCode(qrcode);
    } catch (e) {
      showToast(e.message, "warn");
    } finally {
      setCarregando(false);
    }
  };

  // Numero secundario nao tem um /status dedicado (so aparece no listar()
  // geral) - reaproveita listNumeros() pra confirmar se esse id em especifico
  // ja conectou, em vez de criar um endpoint so pra essa checagem pontual.
  const jaConectei = async () => {
    setVerificando(true);
    try {
      if (numeroId) {
        const lista = await listNumeros();
        const numero = lista.find((n) => n.id === numeroId);
        if (numero?.conectado) {
          showToast(`WhatsApp conectado: ${numero.nomeConectado}`, "ok");
          onConectado(numero);
          onClose();
        } else {
          showToast("Ainda não detectei a conexão. Confirme se digitou o código no WhatsApp e tente de novo.", "warn");
        }
        return;
      }
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

  const semCodigoAinda = metodo === "qr" ? !qrCode : !pairingCode;

  return (
    <Modal title="Conectar número por código" onClose={onClose}>
      {semCodigoAinda && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: T.bg, padding: 4, borderRadius: 10 }}>
          {[["qr", "QR code (recomendado)"], ["codigo", "Código por telefone"]].map(([valor, rotulo]) => (
            <button
              key={valor}
              onClick={() => setMetodo(valor)}
              style={{
                flex: 1, padding: "8px 6px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                background: metodo === valor ? "#fff" : "transparent",
                color: metodo === valor ? T.ink : T.inkSoft,
                boxShadow: metodo === valor ? "0 1px 4px rgba(20,40,55,.12)" : "none",
              }}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      {metodo === "qr" ? (
        !qrCode ? (
          <>
            <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 16 }}>
              Gere o QR code e escaneie com o WhatsApp do número que vai passar a disparar as mensagens.
            </p>
            <button
              style={{ ...s.btnPrimarySm, width: "100%", justifyContent: "center" }}
              disabled={carregando}
              onClick={gerarQrCode}
            >
              {carregando ? "Gerando QR code... (leva alguns segundos)" : "Gerar QR code"}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <img
                src={qrCode}
                alt="QR code de conexão do WhatsApp"
                style={{
                  width: 220, height: 220, borderRadius: 12, border: `1px solid ${T.line}`,
                  opacity: carregando ? 0.35 : 1, transition: "opacity .25s",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: T.inkSoft }}>
                {carregando ? "Atualizando código..." : `Atualiza em ${segundosRestantes}s`}
              </span>
              <div style={{ width: 140, height: 4, borderRadius: 4, background: T.line, overflow: "hidden" }}>
                <div style={{
                  width: carregando ? "100%" : `${(segundosRestantes / QR_DURACAO_SEGUNDOS) * 100}%`,
                  height: "100%", background: T.primary,
                  transition: carregando ? "none" : "width 1s linear",
                }} />
              </div>
            </div>
            <p style={{ fontSize: 13, color: T.inkSoft, marginBottom: 16, textAlign: "center" }}>
              Abra o WhatsApp do novo número → <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong> →{" "}
              aponte a câmera pro código acima.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...s.btnGhostSm, flex: 1, justifyContent: "center" }} onClick={gerarQrCode} disabled={carregando}>
                Gerar novo
              </button>
              <button style={{ ...s.btnPrimarySm, flex: 1, justifyContent: "center" }} disabled={verificando} onClick={jaConectei}>
                {verificando ? "Verificando..." : "Já conectei"}
              </button>
            </div>
          </>
        )
      ) : !pairingCode ? (
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

// Numeros ADICIONAIS de WhatsApp (o principal continua no card acima). Cada
// um cadastrado aqui vira uma opcao de "numero de disparo" nas Campanhas. Ao
// salvar o nome, o backend ja cria a instancia na Evolution e devolve o id -
// na hora ja abre o QR pra conectar, sem precisar de nada feito por fora.
function OutrosNumerosCard({ showToast, souAdmin }) {
  const [numeros, setNumeros] = useState(null);
  const [formAberto, setFormAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [finalidade, setFinalidade] = useState("DISPARO");
  const [salvando, setSalvando] = useState(false);
  const [numeroParaConectar, setNumeroParaConectar] = useState(null);

  const carregar = () => listNumeros().then(setNumeros).catch(() => setNumeros([]));
  useEffect(() => { carregar(); }, []);

  const salvar = async () => {
    if (!nome.trim()) return showToast("Dê um nome pra esse número", "warn");
    setSalvando(true);
    try {
      const criado = await createNumero(nome.trim(), finalidade);
      setNome(""); setFinalidade("DISPARO"); setFormAberto(false);
      showToast("Número criado — agora conecte escaneando o QR", "ok");
      carregar();
      setNumeroParaConectar(criado.id);
    } catch (e) {
      showToast(e.message || "Erro ao adicionar número", "warn");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (n) => {
    try {
      await deleteNumero(n.id);
      setNumeros((lista) => lista.filter((x) => x.id !== n.id));
      showToast("Número removido", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover número", "warn");
    }
  };

  return (
    <Card title="Outros números de disparo">
      <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>
        Números extras, além do principal acima. Depois de cadastrado, cada um vira uma opção de
        "número de disparo" na criação de campanhas.
      </div>
      {numeros === null ? (
        <div style={{ fontSize: 13, color: T.inkSoft }}>Carregando...</div>
      ) : !numeros.length ? (
        <div style={{ fontSize: 13, color: T.inkSoft }}>Nenhum número extra cadastrado.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {numeros.map((n) => (
            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: T.bg }}>
              <span style={{ ...s.channelIcon, background: T.wa + "1A" }}><WhatsAppLogo size={20} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: T.ink, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                  {n.nome}
                  {n.finalidade === "AQUECIMENTO" && <span style={{ ...s.tagMuted, fontSize: 10.5 }}>Aquecimento</span>}
                </div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{n.conectado ? (n.nomeConectado || "Conectado") : "Desconectado"}</div>
              </div>
              <span style={{ ...s.tagOk, ...(n.conectado ? {} : { color: T.coral, background: T.coral + "1A" }) }}>
                {n.conectado ? "● Ativo" : "● Inativo"}
              </span>
              {souAdmin && !n.conectado && (
                <button onClick={() => setNumeroParaConectar(n.id)} style={{ fontSize: 12, color: T.primary, fontWeight: 600 }}>Conectar</button>
              )}
              {souAdmin && (
                <button onClick={() => remover(n)} style={{ fontSize: 12, color: T.coral, fontWeight: 600 }}>Remover</button>
              )}
            </div>
          ))}
        </div>
      )}
      {souAdmin && (
        formAberto ? (
          <div style={{ display: "grid", gap: 10, marginTop: 14, padding: 12, borderRadius: 10, border: `1px solid ${T.line}` }}>
            <Field label="Nome (pra identificar nas campanhas)">
              <input style={s.input} placeholder="Ex.: Sarah - Atendimento" value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Field label="Finalidade">
              <select style={{ ...s.select, width: "100%" }} value={finalidade} onChange={(e) => setFinalidade(e.target.value)}>
                <option value="DISPARO">Disparo (campanhas normais)</option>
                <option value="AQUECIMENTO">Aquecimento (Sorr.ia Protect — nunca dispara campanha)</option>
              </select>
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...s.btnGhostSm, flex: 1, justifyContent: "center" }} onClick={() => setFormAberto(false)}>Cancelar</button>
              <button style={{ ...s.btnPrimarySm, flex: 1, justifyContent: "center" }} disabled={salvando} onClick={salvar}>
                {salvando ? "Salvando..." : "Adicionar número"}
              </button>
            </div>
          </div>
        ) : (
          <button style={{ ...s.btnGhostSm, marginTop: 14 }} onClick={() => setFormAberto(true)}>+ Adicionar número</button>
        )
      )}
      {numeroParaConectar && (
        <ConectarNumeroModal
          numeroId={numeroParaConectar}
          onClose={() => setNumeroParaConectar(null)}
          showToast={showToast}
          onConectado={() => carregar()}
          statusInicial={{ connected: false, loggedIn: false }}
        />
      )}
    </Card>
  );
}

export function Config({ showToast, usuario }) {
  const [status, setStatus] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const souAdmin = usuario?.papel === "ADMIN";

  const carregarStatus = () => {
    getWhatsAppStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false, loggedIn: false, nome: "", telefone: "" }));
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
          <Field label="Telefone">
            <input
              style={{ ...s.input, background: T.bg, color: T.inkSoft, cursor: "not-allowed" }}
              value={status?.telefone || (conectado ? "Sincronizando..." : "Nenhum número conectado")}
              disabled
              readOnly
              title="Sincronizado automaticamente com o número conectado no WhatsApp (aba Integração WhatsApp abaixo)"
            />
          </Field>
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
      <OutrosNumerosCard showToast={showToast} souAdmin={souAdmin} />
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
