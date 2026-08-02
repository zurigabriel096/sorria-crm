import { useEffect, useMemo, useState } from "react";
import { T, ESTAGIOS_LEAD } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { listNumeros, contatosPorNumero } from "../api/whatsappNumeros";
import { listMensagens, enviarMensagem } from "../api/mensagens";

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
  const [selecao, setSelecao] = useState("todos"); // "todos" | "principal" | id do numero (string)
  const [contatoIdsFiltro, setContatoIdsFiltro] = useState(null); // null = sem filtro (mostra todos)
  const [carregandoFiltro, setCarregandoFiltro] = useState(false);
  const [chatAberto, setChatAberto] = useState(null);

  useEffect(() => { listNumeros().then(setNumeros).catch(() => setNumeros([])); }, []);

  useEffect(() => {
    if (selecao === "todos") { setContatoIdsFiltro(null); return; }
    setCarregandoFiltro(true);
    const idNumero = selecao === "principal" ? null : Number(selecao);
    contatosPorNumero(idNumero).then(setContatoIdsFiltro).catch(() => setContatoIdsFiltro([])).finally(() => setCarregandoFiltro(false));
  }, [selecao]);

  const leads = useMemo(() => {
    if (!contatoIdsFiltro) return patients;
    const idsComConversa = new Set(contatoIdsFiltro);
    return patients.filter((p) => idsComConversa.has(p.id));
  }, [patients, contatoIdsFiltro]);

  const numeroEnvio = selecao === "todos" || selecao === "principal" ? null : Number(selecao);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...s.toolbar }}>
        <Select
          value={selecao}
          onChange={setSelecao}
          options={["todos", "principal", ...numeros.map((n) => String(n.id))]}
          labels={{
            todos: "Todos os leads (sem filtro)",
            principal: "Número principal",
            ...Object.fromEntries(numeros.map((n) => [String(n.id), n.nome])),
          }}
        />
        {selecao !== "todos" && (
          <span style={{ fontSize: 11.5, color: T.inkSoft }}>
            Mostrando só leads que já conversaram por este número. Respostas daqui saem por ele.
          </span>
        )}
      </div>
      {carregandoFiltro ? (
        <Card><div style={{ textAlign: "center", padding: 30, color: T.inkSoft }}>Carregando...</div></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${ESTAGIOS_LEAD.length}, 1fr)`, gap: 14, alignItems: "start" }}>
          {ESTAGIOS_LEAD.map((estagio) => {
            const doEstagio = leads.filter((p) => (p.estagio || "Lead") === estagio);
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
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{p.nome}</div>
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
