import { useEffect, useMemo, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { listNumeros, contatosPorNumero } from "../api/whatsappNumeros";
import { listMensagens, enviarMensagem, carregarMidiaBlobUrl } from "../api/mensagens";
import { getWhatsAppStatus } from "../api/whatsapp";
import { listEtapas, createEtapa, renameEtapa, deleteEtapa } from "../api/etapas";
import { listColaboradores } from "../api/colaboradores";
import { dataHora } from "../utils/format";

const POLL_MENSAGENS_MS = 4000;
const EMOJIS = ["😀", "😂", "😍", "🙏", "👍", "👋", "❤️", "😢", "😮", "🎉", "✅", "❌", "🔥", "💬", "📅", "😅", "🤔", "👏"];

// Kanban de conversas: escolhe um numero de WhatsApp, ve so os leads que ja
// trocaram mensagem por ELE (posicionados por Estagio), e responde direto
// pelo card - a resposta sai pelo numero selecionado aqui. Colunas vem do
// cadastro EtapaKanban (editavel por ADMIN: criar/renomear/excluir), nao mais
// de um array fixo. Arrastar um card muda o Estagio do lead de verdade.
// Baixa e descriptografa a foto sob demanda (o link cru do WhatsApp é
// cifrado - não dá pra usar <img src> direto nele nem sem o header de auth).
function FotoMensagem({ mensagemId }) {
  const [url, setUrl] = useState(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let blobUrl;
    carregarMidiaBlobUrl(mensagemId)
      .then((u) => { blobUrl = u; setUrl(u); })
      .catch(() => setErro(true));
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [mensagemId]);

  if (erro) return <div style={{ fontSize: 12.5, color: T.inkSoft, fontStyle: "italic" }}>Não consegui carregar essa foto (o link pode ter expirado).</div>;
  if (!url) return <div style={{ fontSize: 12.5, color: T.inkSoft }}>Carregando foto...</div>;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Foto recebida" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 10, display: "block" }} />
    </a>
  );
}

function ChatModal({ contato, whatsappNumeroId, numeros, colaboradores, onClose, showToast, onAbrirPaciente, onAtualizarPaciente }) {
  const [mensagens, setMensagens] = useState(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [editandoResponsavel, setEditandoResponsavel] = useState(false);

  const nomeResponsavel = colaboradores.find((c) => c.id === contato.responsavelId)?.nome;

  const mudarResponsavel = async (valor) => {
    setEditandoResponsavel(false);
    try {
      await onAtualizarPaciente({ ...contato, responsavelId: valor ? Number(valor) : null });
    } catch (e) {
      showToast(e.message || "Erro ao atribuir responsável", "warn");
    }
  };

  const carregar = () => listMensagens(contato.id).then(setMensagens).catch(() => setMensagens([]));
  useEffect(() => { carregar(); }, [contato.id]);
  // Atualiza sozinho enquanto a conversa estiver aberta - sem isso, uma
  // resposta que chega pelo webhook so aparecia fechando e reabrindo o card.
  useEffect(() => {
    const intervalo = setInterval(carregar, POLL_MENSAGENS_MS);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contato.id]);

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 10 }}>
        <span style={{ fontSize: 12.5, color: T.inkSoft }}>{contato.tel || "Sem telefone"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {editandoResponsavel ? (
            <select
              autoFocus
              style={{ ...s.select, height: 30, fontSize: 12.5 }}
              defaultValue={contato.responsavelId ? String(contato.responsavelId) : ""}
              onChange={(e) => mudarResponsavel(e.target.value)}
              onBlur={() => setEditandoResponsavel(false)}
            >
              <option value="">Sem responsável</option>
              {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          ) : (
            <button style={{ fontSize: 12, fontWeight: 700, color: T.ink }} onClick={() => setEditandoResponsavel(true)}>
              👤 {nomeResponsavel || "Sem responsável"}
            </button>
          )}
          <button
            style={{ fontSize: 12, fontWeight: 700, color: T.primary }}
            onClick={() => { onAbrirPaciente(contato); onClose(); }}
          >
            Editar tags / estágio
          </button>
        </div>
      </div>
      {!!(contato.tags || []).length && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {contato.tags.map((t) => <span key={t} style={{ ...s.tagOk, background: T.lineSoft, color: T.inkSoft }}>{t}</span>)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto", padding: 10, marginBottom: 12, background: T.bg, borderRadius: 12 }}>
        {mensagens === null ? (
          <div style={{ fontSize: 13, color: T.inkSoft }}>Carregando...</div>
        ) : !mensagens.length ? (
          <div style={{ fontSize: 13, color: T.inkSoft }}>Nenhuma mensagem ainda — comece a conversa abaixo.</div>
        ) : (
          mensagens.map((m) => {
            const saida = m.direcao === "SAIDA";
            let midia = null;
            try { midia = m.payloadBrutoMidia ? JSON.parse(m.payloadBrutoMidia) : null; } catch { /* ignora */ }
            const ehFoto = midia?.mimetype?.startsWith("image/");
            return (
              <div key={m.id} style={{ alignSelf: saida ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                <div style={{
                  background: saida ? T.primary : "#fff", color: saida ? "#fff" : T.ink,
                  padding: ehFoto ? 4 : "8px 12px", fontSize: 13.5, lineHeight: 1.4,
                  boxShadow: saida ? "none" : "0 1px 2px rgba(20,40,55,.08)",
                  borderRadius: saida ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                }}>
                  {ehFoto ? <FotoMensagem mensagemId={m.id} /> : m.texto}
                </div>
                <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 3, textAlign: saida ? "right" : "left" }}>
                  {saida ? (m.enviadoPorNome || "Você") : "Lead"} · {dataHora(m.criadoEm)}
                  {saida && <span style={{ color: T.primary, marginLeft: 3 }}>✓✓</span>}
                  {m.numeroAlternativo && (
                    <span style={{ color: T.coral, fontWeight: 700 }}>
                      {" "}· enviado via número de {numeros.find((n) => n.id === m.whatsappNumeroId)?.nome || "outro atendente"}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div style={{ display: "flex", gap: 8, position: "relative" }}>
        {emojiAberto && (
          <div style={{
            position: "absolute", bottom: 44, left: 0, background: "#fff", border: `1px solid ${T.line}`,
            borderRadius: 10, boxShadow: "0 10px 30px rgba(20,40,55,.14)", padding: 8,
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, zIndex: 10,
          }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                style={{ fontSize: 18, padding: 4, borderRadius: 6 }}
                onClick={() => { setTexto((t) => t + e); setEmojiAberto(false); }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          title="Inserir emoji"
          style={{ ...s.btnGhostSm, padding: "0 12px", fontSize: 17 }}
          onClick={() => setEmojiAberto((o) => !o)}
        >
          😊
        </button>
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

export function Conversas({ patients, showToast, onAbrirPaciente, onAtualizarPaciente, onCriarPaciente, usuario }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const [numeros, setNumeros] = useState([]);
  const [nomePrincipal, setNomePrincipal] = useState("");
  const [selecao, setSelecao] = useState("todos"); // "todos" | "principal" | id do numero (string)
  const [contatoIdsFiltro, setContatoIdsFiltro] = useState(null); // null = sem filtro (mostra todos)
  const [carregandoFiltro, setCarregandoFiltro] = useState(false);
  const [chatAberto, setChatAberto] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [renomeando, setRenomeando] = useState(null); // id da etapa em edição de nome
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [novaColuna, setNovaColuna] = useState(false);
  const [nomeNovaColuna, setNomeNovaColuna] = useState("");
  const [colaboradores, setColaboradores] = useState([]);
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos"); // "todos" | "sem" | id do colaborador (string)
  const [iniciarAberto, setIniciarAberto] = useState(false);

  useEffect(() => { listColaboradores().then(setColaboradores).catch(() => setColaboradores([])); }, []);

  // Mantem o chat aberto sincronizado com o estado global (ex.: depois de
  // atribuir responsavel, o cabecalho do chat reflete sem precisar fechar/abrir).
  useEffect(() => {
    if (!chatAberto) return;
    const atualizado = patients.find((p) => p.id === chatAberto.id);
    if (atualizado && atualizado !== chatAberto) setChatAberto(atualizado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients]);

  const carregarEtapas = () => listEtapas().then(setEtapas).catch(() => setEtapas([]));
  useEffect(() => { carregarEtapas(); }, []);
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
    { valor: "todos", rotulo: "Todos os números" },
    { valor: "principal", rotulo: nomePrincipal ? `${nomePrincipal} (principal)` : "Número principal" },
    ...numeros.map((n) => ({ valor: String(n.id), rotulo: n.nome })),
  ];

  const moverLead = async (contatoId, novaEtapaNome) => {
    const lead = patients.find((p) => p.id === contatoId);
    if (!lead || (lead.estagio || "Lead") === novaEtapaNome) return;
    try {
      await onAtualizarPaciente({ ...lead, estagio: novaEtapaNome });
    } catch (e) {
      showToast(e.message || "Erro ao mover lead", "warn");
    }
  };

  const salvarRenomeio = async (etapa) => {
    if (!nomeEdicao.trim() || nomeEdicao.trim() === etapa.nome) { setRenomeando(null); return; }
    try {
      await renameEtapa(etapa.id, nomeEdicao.trim());
      setRenomeando(null);
      carregarEtapas();
    } catch (e) {
      showToast(e.message || "Erro ao renomear coluna", "warn");
    }
  };

  const excluirEtapa = async (etapa) => {
    if (!window.confirm(`Excluir a coluna "${etapa.nome}"? Os leads que estão nela não serão apagados, só deixam de aparecer aqui.`)) return;
    try {
      await deleteEtapa(etapa.id);
      carregarEtapas();
    } catch (e) {
      showToast(e.message || "Erro ao excluir coluna", "warn");
    }
  };

  const criarColuna = async () => {
    if (!nomeNovaColuna.trim()) return;
    try {
      await createEtapa(nomeNovaColuna.trim());
      setNomeNovaColuna("");
      setNovaColuna(false);
      carregarEtapas();
    } catch (e) {
      showToast(e.message || "Erro ao criar coluna", "warn");
    }
  };

  const responsaveisFiltro = [
    { valor: "todos", rotulo: "Todos" },
    { valor: "sem", rotulo: "Sem responsável" },
    ...colaboradores.map((c) => ({ valor: String(c.id), rotulo: c.nome })),
  ];

  const passaFiltroResponsavel = (p) => {
    if (filtroResponsavel === "todos") return true;
    if (filtroResponsavel === "sem") return !p.responsavelId;
    return String(p.responsavelId) === filtroResponsavel;
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.inkSoft, marginBottom: 6 }}>Você deseja disparar de qual número?</div>
          <select style={{ ...s.select, minWidth: 260 }} value={selecao} onChange={(e) => setSelecao(e.target.value)}>
            {abas.map((aba) => <option key={aba.valor} value={aba.valor}>{aba.rotulo}</option>)}
          </select>
          <div style={{ fontSize: 11.5, color: T.primary, fontWeight: 700, marginTop: 6 }}>
            Número selecionado: {abas.find((a) => a.valor === selecao)?.rotulo}
          </div>
        </div>
        <button style={s.btnPrimarySm} onClick={() => setIniciarAberto(true)}>+ Iniciar conversa</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: T.inkSoft }}>Responsável:</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {responsaveisFiltro.map((r) => (
            <button
              key={r.valor}
              onClick={() => setFiltroResponsavel(r.valor)}
              style={{
                padding: "5px 11px", borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                background: filtroResponsavel === r.valor ? T.primarySoft : T.lineSoft,
                color: filtroResponsavel === r.valor ? T.primaryDark : T.inkSoft,
              }}
            >
              {r.rotulo}
            </button>
          ))}
        </div>
      </div>
      {selecao !== "todos" && (
        <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: -8 }}>
          Cards marcados com ✓ já conversaram por este número. Respostas daqui saem por ele — em qualquer card.
        </div>
      )}
      {carregandoFiltro ? (
        <Card><div style={{ textAlign: "center", padding: 30, color: T.inkSoft }}>Carregando...</div></Card>
      ) : (
        <div style={{ display: "flex", gap: 14, alignItems: "start", overflowX: "auto", paddingBottom: 8 }}>
          {etapas.map((etapa) => {
            const doEstagio = patients.filter((p) => (p.estagio || "Lead") === etapa.nome && passaFiltroResponsavel(p));
            return (
              <div
                key={etapa.id}
                style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 240, width: 240, flexShrink: 0 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); moverLead(Number(e.dataTransfer.getData("text/plain")), etapa.nome); }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {renomeando === etapa.id ? (
                    <input
                      autoFocus
                      style={{ ...s.input, height: 30, fontSize: 13, fontWeight: 700, flex: 1 }}
                      value={nomeEdicao}
                      onChange={(e) => setNomeEdicao(e.target.value)}
                      onBlur={() => salvarRenomeio(etapa)}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarRenomeio(etapa); if (e.key === "Escape") setRenomeando(null); }}
                    />
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{etapa.nome}</span>
                  )}
                  <span style={{ ...s.tagOk, background: T.lineSoft, color: T.inkSoft }}>{doEstagio.length}</span>
                  {souAdmin && renomeando !== etapa.id && (
                    <DotMenu items={[
                      { label: "Renomear", onClick: () => { setRenomeando(etapa.id); setNomeEdicao(etapa.nome); } },
                      { label: "Excluir coluna", danger: true, onClick: () => excluirEtapa(etapa) },
                    ]} />
                  )}
                </div>
                {!doEstagio.length && (
                  <Card><div style={{ fontSize: 12, color: T.inkSoft, textAlign: "center", padding: "14px 4px" }}>Nenhum lead aqui</div></Card>
                )}
                {doEstagio.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(p.id))}
                    style={{ ...s.campCard, cursor: "grab" }}
                    onClick={() => setChatAberto(p)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{p.nome}</div>
                      {selecao !== "todos" && idsComConversa.has(p.id) && (
                        <span style={{ color: T.primary, fontWeight: 700, fontSize: 12 }} title="Já conversou por este número">✓</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 4 }}>{p.tel || "Sem telefone"}</div>
                    <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 3 }}>
                      👤 {colaboradores.find((c) => c.id === p.responsavelId)?.nome || "Sem responsável"}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {souAdmin && (
            <div style={{ minWidth: 240, width: 240, flexShrink: 0 }}>
              {novaColuna ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    autoFocus
                    style={{ ...s.input, height: 34, fontSize: 13, flex: 1 }}
                    placeholder="Nome da coluna"
                    value={nomeNovaColuna}
                    onChange={(e) => setNomeNovaColuna(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") criarColuna(); if (e.key === "Escape") setNovaColuna(false); }}
                  />
                  <button style={s.btnPrimarySm} onClick={criarColuna}>OK</button>
                </div>
              ) : (
                <button style={{ ...s.btnGhostSm, width: "100%", justifyContent: "center" }} onClick={() => setNovaColuna(true)}>
                  + Nova coluna
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {chatAberto && (
        <ChatModal
          contato={chatAberto} whatsappNumeroId={numeroEnvio} numeros={numeros} colaboradores={colaboradores}
          onClose={() => setChatAberto(null)} showToast={showToast} onAbrirPaciente={onAbrirPaciente} onAtualizarPaciente={onAtualizarPaciente}
        />
      )}
      {iniciarAberto && (
        <IniciarConversaModal
          patients={patients}
          usuario={usuario}
          onClose={() => setIniciarAberto(false)}
          onSelecionar={(p) => { setChatAberto(p); setIniciarAberto(false); }}
          onCriarPaciente={onCriarPaciente}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function IniciarConversaModal({ patients, usuario, onClose, onSelecionar, onCriarPaciente, showToast }) {
  const [modo, setModo] = useState("selecionar"); // "selecionar" | "criar"
  const [busca, setBusca] = useState("");
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [criando, setCriando] = useState(false);

  const encontrados = busca.trim()
    ? patients.filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()) || (p.tel || "").includes(busca.trim()))
    : patients;

  const criar = async () => {
    if (!nome.trim() || !tel.trim()) return showToast("Preencha nome e telefone", "warn");
    setCriando(true);
    try {
      const novo = await onCriarPaciente({ nome: nome.trim(), tel: tel.trim(), responsavelId: usuario?.id || null });
      onSelecionar(novo);
    } catch (e) {
      showToast(e.message || "Erro ao criar lead", "warn");
    } finally {
      setCriando(false);
    }
  };

  return (
    <Modal title="Iniciar conversa" onClose={onClose}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: T.bg, padding: 4, borderRadius: 10 }}>
        {[["selecionar", "Selecionar lead"], ["criar", "Criar novo lead"]].map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setModo(valor)}
            style={{
              flex: 1, padding: "8px 6px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
              background: modo === valor ? "#fff" : "transparent",
              color: modo === valor ? T.ink : T.inkSoft,
              boxShadow: modo === valor ? "0 1px 4px rgba(20,40,55,.12)" : "none",
            }}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {modo === "selecionar" ? (
        <>
          <input
            style={{ ...s.input, width: "100%", marginBottom: 10 }}
            placeholder="Buscar por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
          <div style={{ display: "grid", gap: 6, maxHeight: 320, overflowY: "auto" }}>
            {!encontrados.length && <div style={{ fontSize: 13, color: T.inkSoft, padding: "10px 0" }}>Nenhum lead encontrado.</div>}
            {encontrados.slice(0, 50).map((p) => (
              <div
                key={p.id}
                onClick={() => onSelecionar(p)}
                style={{ padding: "10px 12px", borderRadius: 10, background: T.bg, cursor: "pointer" }}
              >
                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{p.nome}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{p.tel || "Sem telefone"}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <Field label="Nome do lead"><input style={s.input} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus /></Field>
          <Field label="Telefone (com DDD)"><input style={s.input} placeholder="12988887777" value={tel} onChange={(e) => setTel(e.target.value)} /></Field>
          <div style={{ fontSize: 11.5, color: T.inkSoft, margin: "6px 0 14px" }}>
            O responsável já entra como você ({usuario?.nome}) — pode trocar depois pelo chat.
          </div>
          <button style={{ ...s.btnPrimarySm, width: "100%", justifyContent: "center" }} disabled={criando} onClick={criar}>
            {criando ? "Criando..." : "Criar lead e iniciar conversa"}
          </button>
        </>
      )}
    </Modal>
  );
}
