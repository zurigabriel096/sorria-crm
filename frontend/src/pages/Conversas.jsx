import { useEffect, useMemo, useState } from "react";
import { T, ESTAGIOS_LEAD } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { listNumeros, contatosPorNumero } from "../api/whatsappNumeros";
import { listMensagens, enviarMensagem } from "../api/mensagens";
import { getWhatsAppStatus } from "../api/whatsapp";

// Kanban de conversas: escolhe um numero de WhatsApp, ve so os leads que ja
// trocaram mensagem por ELE (posicionados por Estagio), e responde direto
// pelo card - a resposta sai pelo numero selecionado aqui. v1 nao tem
// drag-and-drop entre colunas de proposito (mudar o Estagio continua sendo
// feito no modal de detalhe do lead, em Base de Leads) - reposicionar
// arrastando fica pra uma proxima leva se fizer falta.
function ChatModal({ contato, whatsappNumeroId, numeros, onClose, showToast, onAbrirPaciente }) {
  const [mensagens, setMensagens] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = () => listMensagens(contato.id).then(setMensagens).catch(() => setMensagens([]));
  useEffect(() => { carregar(); }, [contato.id]);

  const enviar = async () => {
    if (!texto.trim()) return;
    if (!contato.tel) return showToast("Este lead não tem telefone cadastrado", "warn");
    setEnviando(true);
    try {
      await enviarMensagem(contato.id, { texto: texto.trim(), whatsappNumeroId: whatsappNumeroId || null });
      setTexto("");
      carregar();
    } catch (e) {
      showToast(e.message || "Erro ao enviar mensagem", "warn");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal title={contato.nome} onClose={onClose} wide>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: T.inkSoft }}>{contato.tel || "Sem telefone"}</span>
        <button
          style={{ fontSize: 12, fontWeight: 700, color: T.primary }}
          onClick={() => { onAbrirPaciente(contato); onClose(); }}
        >
          Editar tags / estágio
        </button>
      </div>
      {!!(contato.tags || []).length && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {contato.tags.map((t) => <span key={t} style={{ ...s.tagOk, background: T.lineSoft, color: T.inkSoft }}>{t}</span>)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto", padding: "4px 2px", marginBottom: 12 }}>
        {mensagens === null ? (
          <div style={{ fontSize: 13, color: T.inkSoft }}>Carregando...</div>
        ) : !mensagens.length ? (
          <div style={{ fontSize: 13, color: T.inkSoft }}>Nenhuma mensagem ainda — comece a conversa abaixo.</div>
        ) : (
          mensagens.map((m) => (
            <div key={m.id} style={{ alignSelf: m.direcao === "SAIDA" ? "flex-end" : "flex-start", maxWidth: "75%" }}>
              <div style={{
                background: m.direcao === "SAIDA" ? T.primary : T.bg, color: m.direcao === "SAIDA" ? "#fff" : T.ink,
                padding: "8px 12px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.4,
              }}>
                {m.texto}
              </div>
              <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 3, textAlign: m.direcao === "SAIDA" ? "right" : "left" }}>
                {m.direcao === "SAIDA" ? (m.enviadoPorNome || "Você") : "Lead"}
                {m.numeroAlternativo && (
                  <span style={{ color: T.coral, fontWeight: 700 }}>
                    {" "}· enviado via número de {numeros.find((n) => n.id === m.whatsappNumeroId)?.nome || "outro atendente"}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ ...s.input, flex: 1 }}
          placeholder="Digite uma resposta..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !enviando) enviar(); }}
        />
        <button style={s.btnPrimarySm} disabled={enviando || !texto.trim()} onClick={enviar}>
          {enviando ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </Modal>
  );
}

export function Conversas({ patients, showToast, onAbrirPaciente }) {
  const [numeros, setNumeros] = useState([]);
  const [nomePrincipal, setNomePrincipal] = useState("");
  const [selecao, setSelecao] = useState("todos"); // "todos" | "principal" | id do numero (string)
  const [contatoIdsFiltro, setContatoIdsFiltro] = useState(null); // null = sem filtro (mostra todos)
  const [carregandoFiltro, setCarregandoFiltro] = useState(false);
  const [chatAberto, setChatAberto] = useState(null);

  useEffect(() => { listNumeros().then(setNumeros).catch(() => setNumeros([])); }, []);
  useEffect(() => { getWhatsAppStatus().then((s) => setNomePrincipal(s.nome || "")).catch(() => {}); }, []);

  useEffect(() => {
    if (selecao === "todos") { setContatoIdsFiltro(null); return; }
    setCarregandoFiltro(true);
    const idNumero = selecao === "principal" ? null : Number(selecao);
    contatosPorNumero(idNumero).then(setContatoIdsFiltro).catch(() => setContatoIdsFiltro([])).finally(() => setCarregandoFiltro(false));
  }, [selecao]);

  // Nunca esconde leads: a lista mostra a base inteira sempre, mesmo pra um
  // numero que ainda nao conversou com ninguem (senao travaria o primeiro
  // contato por um numero novo). O numero escolhido so marca quem "ja
  // conversou aqui" e decide por onde a resposta sai.
  const idsComConversa = useMemo(() => new Set(contatoIdsFiltro || []), [contatoIdsFiltro]);
  const numeroEnvio = selecao === "todos" || selecao === "principal" ? null : Number(selecao);
  const abas = [
    { valor: "todos", rotulo: "Todos" },
    { valor: "principal", rotulo: nomePrincipal ? `${nomePrincipal} (principal)` : "Número principal" },
    ...numeros.map((n) => ({ valor: String(n.id), rotulo: n.nome })),
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, background: T.bg, padding: 4, borderRadius: 10, width: "fit-content" }}>
        {abas.map((aba) => (
          <button
            key={aba.valor}
            onClick={() => setSelecao(aba.valor)}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
              background: selecao === aba.valor ? "#fff" : "transparent",
              color: selecao === aba.valor ? T.ink : T.inkSoft,
              boxShadow: selecao === aba.valor ? "0 1px 4px rgba(20,40,55,.12)" : "none",
            }}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>
      {selecao !== "todos" && (
        <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: -8 }}>
          Cards marcados com ✓ já conversaram por este número. Respostas daqui saem por ele — em qualquer card.
        </div>
      )}
      {carregandoFiltro ? (
        <Card><div style={{ textAlign: "center", padding: 30, color: T.inkSoft }}>Carregando...</div></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${ESTAGIOS_LEAD.length}, 1fr)`, gap: 14, alignItems: "start" }}>
          {ESTAGIOS_LEAD.map((estagio) => {
            const doEstagio = patients.filter((p) => (p.estagio || "Lead") === estagio);
            return (
              <div key={estagio} style={{ display: "grid", gap: 10, alignContent: "start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{estagio}</span>
                  <span style={{ ...s.tagOk, background: T.lineSoft, color: T.inkSoft }}>{doEstagio.length}</span>
                </div>
                {!doEstagio.length && (
                  <Card><div style={{ fontSize: 12, color: T.inkSoft, textAlign: "center", padding: "14px 4px" }}>Nenhum lead aqui</div></Card>
                )}
                {doEstagio.map((p) => (
                  <div key={p.id} style={{ ...s.campCard, cursor: "pointer" }} onClick={() => setChatAberto(p)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{p.nome}</div>
                      {selecao !== "todos" && idsComConversa.has(p.id) && (
                        <span style={{ color: T.primary, fontWeight: 700, fontSize: 12 }} title="Já conversou por este número">✓</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 4 }}>{p.tel || "Sem telefone"}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      {chatAberto && (
        <ChatModal contato={chatAberto} whatsappNumeroId={numeroEnvio} numeros={numeros} onClose={() => setChatAberto(null)} showToast={showToast} onAbrirPaciente={onAbrirPaciente} />
      )}
    </div>
  );
}
