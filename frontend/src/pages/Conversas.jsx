import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { listNumeros, contatosPorNumero } from "../api/whatsappNumeros";
import { listMensagens, enviarMensagem, carregarMidiaBlobUrl } from "../api/mensagens";
import { getWhatsAppStatus } from "../api/whatsapp";
import { listEtapas, createEtapa, renameEtapa, deleteEtapa, marcarEtapaFinal, definirLimiarInatividade, definirDescricaoEtapa } from "../api/etapas";
import { listColaboradores } from "../api/colaboradores";
import { iniciais } from "../utils/usuario";
import { dataHora, tempoDesde, dataHoraRelativa } from "../utils/format";
import { IconUserPlaceholder } from "../components/icons";

const POLL_MENSAGENS_MS = 4000;
// Mesmo texto usado em MensagemService.registrarEntrada (backend) quando um
// numero desconhecido manda mensagem e vira lead automatico, sem nome de
// verdade ainda - o card mostra o telefone + previa da mensagem em vez do
// nome, ate alguem (humano ou Agente Virtual) preencher de verdade.
const LEAD_SEM_NOME = "Novo contato (WhatsApp)";
const EMOJIS = ["😀", "😂", "😍", "🙏", "👍", "👋", "❤️", "😢", "😮", "🎉", "✅", "❌", "🔥", "💬", "📅", "😅", "🤔", "👏"];

// Avatar do responsavel no card - foto de perfil, ou iniciais numa bolinha
// com a cor de perfil da pessoa (mesmo padrao do Topbar), estilo Trello.
function AvatarResponsavel({ colaborador, size = 24 }) {
  if (!colaborador) return null;
  const estiloBase = {
    width: size, height: size, borderRadius: "50%", border: "2px solid #fff",
    boxShadow: "0 1px 3px rgba(20,40,55,.3)", flexShrink: 0,
  };
  return colaborador.avatarUrl ? (
    <img src={colaborador.avatarUrl} alt={colaborador.nome} title={colaborador.nome} style={{ ...estiloBase, objectFit: "cover" }} />
  ) : (
    <div title={colaborador.nome} style={{
      ...estiloBase, background: colaborador.corPerfil || T.inkSoft, color: "#fff",
      display: "grid", placeItems: "center", fontSize: size * 0.42, fontWeight: 700,
    }}>
      {iniciais(colaborador.nome)}
    </div>
  );
}

// Badge de "ultima interacao" no card - substitui os campos removidos
// (dentista/financeiro/tags/etc, que ficam so no cadastro). Vermelho quando
// o cliente respondeu por ultimo e ninguem retornou ainda (o que mais
// importa pra fila de trabalho); neutro quando quem respondeu por ultimo
// fomos nos.
function BadgeUltimaMensagem({ ultimaMensagemEm, ultimaMensagemDirecao }) {
  if (!ultimaMensagemEm) return null;
  const aguardando = ultimaMensagemDirecao === "ENTRADA";
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: aguardando ? "#FDEBE8" : T.lineSoft,
      color: aguardando ? T.coral : T.inkSoft,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>
      {aguardando ? `⏱ aguardando há ${tempoDesde(ultimaMensagemEm)}` : `✓ atendido há ${tempoDesde(ultimaMensagemEm)}`}
    </span>
  );
}

// Campo clicavel de multi-selecao pra filtrar por responsavel (em vez de um
// botao por pessoa, que nao escala com muitos colaboradores). Selecionar
// alguem aqui desmarca o chip "Sem responsavel" (sao modos excludentes).
function SeletorResponsaveis({ colaboradores, selecionados, onAlternar }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const rotulo = !selecionados.length
    ? "Filtrar por responsável..."
    : selecionados.length === 1
    ? colaboradores.find((c) => String(c.id) === selecionados[0])?.nome || "1 selecionado"
    : `${selecionados.length} responsáveis selecionados`;

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setAberto((o) => !o)}
        style={{
          padding: "5px 11px", borderRadius: 20, fontSize: 11.5, fontWeight: 700,
          background: selecionados.length ? T.primarySoft : T.lineSoft,
          color: selecionados.length ? T.primaryDark : T.inkSoft,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        {rotulo} <span style={{ fontSize: 9 }}>▾</span>
      </button>
      {aberto && (
        <div className="pop" style={{
          position: "absolute", top: 32, left: 0, minWidth: 220, maxHeight: 260, overflowY: "auto",
          background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10,
          boxShadow: "0 10px 30px rgba(20,40,55,.14)", zIndex: 40, padding: 6,
        }}>
          {!colaboradores.length && (
            <div style={{ fontSize: 12.5, color: T.inkSoft, padding: "8px 10px" }}>Nenhum colaborador cadastrado.</div>
          )}
          {colaboradores.map((c) => {
            const marcado = selecionados.includes(String(c.id));
            return (
              <label
                key={c.id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, fontSize: 13, fontWeight: 600, color: T.ink, cursor: "pointer" }}
                className="navItem"
              >
                <input type="checkbox" checked={marcado} onChange={() => onAlternar(String(c.id))} />
                {c.nome}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

export function Conversas({ patients, showToast, onAbrirPaciente, onAtualizarPaciente, onCriarPaciente, usuario, abrirContatoId, onAbriuContato }) {
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
  const [editandoLimiar, setEditandoLimiar] = useState(null); // id da etapa em edição do limiar de inatividade
  const [limiarEdicao, setLimiarEdicao] = useState("");
  const [editandoDescricao, setEditandoDescricao] = useState(null); // id da etapa em edição da nota fixa
  const [descricaoEdicao, setDescricaoEdicao] = useState("");
  const [novaColuna, setNovaColuna] = useState(false);
  const [nomeNovaColuna, setNomeNovaColuna] = useState("");
  const [etapaNovaAguardandoTag, setEtapaNovaAguardandoTag] = useState(null); // nome da coluna, depois de confirmado
  const [nomeNovaTag, setNomeNovaTag] = useState("");
  const [colaboradores, setColaboradores] = useState([]);
  const [filtroSemResponsavel, setFiltroSemResponsavel] = useState(false);
  const [filtroResponsaveisSel, setFiltroResponsaveisSel] = useState([]); // ids (string) selecionados no campo
  const [iniciarAberto, setIniciarAberto] = useState(false);
  const [buscaConversa, setBuscaConversa] = useState("");

  useEffect(() => { listColaboradores().then(setColaboradores).catch(() => setColaboradores([])); }, []);

  // Deep link vindo da Fila de Trabalho - assim que o lead pedido estiver
  // carregado, abre o chat dele direto (sem precisar achar o card no Kanban).
  useEffect(() => {
    if (!abrirContatoId) return;
    const p = patients.find((x) => x.id === abrirContatoId);
    if (p) { setChatAberto(p); onAbriuContato?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirContatoId, patients]);

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

  // Ordenacao "fracionaria" tipo Trello: a posicao de um card e' um numero
  // (ordemKanban) que fica entre os vizinhos na hora de soltar. Cards sem
  // ordemKanban ainda (leads antigos, de antes dessa funcionalidade existir)
  // usam o proprio id como posicao de fallback, pra manter a ordem estavel.
  const posicao = (p) => p.ordemKanban ?? p.id;

  // vizinhos: lista ja ordenada dos cards no destino, SEM o card arrastado.
  // indiceAlvo: posicao onde o card deve entrar (0 = antes de tudo).
  const moverParaPosicao = async (contatoId, novaEtapaNome, vizinhos, indiceAlvo) => {
    const lead = patients.find((p) => p.id === contatoId);
    if (!lead) return;
    let novaOrdem;
    if (!vizinhos.length) novaOrdem = 0;
    else if (indiceAlvo <= 0) novaOrdem = posicao(vizinhos[0]) - 1;
    else if (indiceAlvo >= vizinhos.length) novaOrdem = posicao(vizinhos[vizinhos.length - 1]) + 1;
    else novaOrdem = (posicao(vizinhos[indiceAlvo - 1]) + posicao(vizinhos[indiceAlvo])) / 2;

    if ((lead.estagio || "Lead") === novaEtapaNome && novaOrdem === posicao(lead)) return;
    try {
      await onAtualizarPaciente({ ...lead, estagio: novaEtapaNome, ordemKanban: novaOrdem });
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

  const alternarEtapaFinal = async (etapa) => {
    try {
      await marcarEtapaFinal(etapa.id, !etapa.etapaFinal);
      carregarEtapas();
    } catch (e) {
      showToast(e.message || "Erro ao atualizar coluna", "warn");
    }
  };

  const salvarLimiar = async (etapa) => {
    const dias = parseInt(limiarEdicao, 10);
    if (!dias || dias < 1) { setEditandoLimiar(null); return; }
    if (dias === etapa.limiarInatividadeDias) { setEditandoLimiar(null); return; }
    try {
      await definirLimiarInatividade(etapa.id, dias);
      setEditandoLimiar(null);
      carregarEtapas();
    } catch (e) {
      showToast(e.message || "Erro ao atualizar limiar de inatividade", "warn");
    }
  };

  // Nota fixa no topo da coluna (ex.: instrução da etapa pro time) - texto
  // livre, em branco remove a nota.
  const salvarDescricao = async (etapa) => {
    const texto = descricaoEdicao.trim();
    if (texto === (etapa.descricao || "")) { setEditandoDescricao(null); return; }
    try {
      await definirDescricaoEtapa(etapa.id, texto);
      setEditandoDescricao(null);
      carregarEtapas();
    } catch (e) {
      showToast(e.message || "Erro ao salvar nota da coluna", "warn");
    }
  };

  // Passo 1: confirma o nome da coluna e abre o passo 2 (nome da tag), em vez
  // de criar direto com o mesmo nome da coluna sem perguntar.
  const confirmarNomeColuna = () => {
    if (!nomeNovaColuna.trim()) return;
    setEtapaNovaAguardandoTag(nomeNovaColuna.trim());
    setNomeNovaTag(nomeNovaColuna.trim());
    setNomeNovaColuna("");
    setNovaColuna(false);
  };

  const criarColuna = async () => {
    try {
      await createEtapa(etapaNovaAguardandoTag, nomeNovaTag.trim());
      setEtapaNovaAguardandoTag(null);
      setNomeNovaTag("");
      carregarEtapas();
    } catch (e) {
      showToast(e.message || "Erro ao criar coluna", "warn");
    }
  };

  const passaFiltroResponsavel = (p) => {
    if (filtroSemResponsavel) return !p.responsavelId;
    if (filtroResponsaveisSel.length) return filtroResponsaveisSel.includes(String(p.responsavelId));
    return true;
  };

  // Por nome OU telefone - existe pra achar leads sem nome (ex.: "Novo contato
  // (WhatsApp)", criado automatico por numero desconhecido) que o nome sozinho
  // nao localiza em meio a uma coluna cheia.
  const passaBusca = (p) => {
    const termo = buscaConversa.trim().toLowerCase();
    if (!termo) return true;
    return (p.nome || "").toLowerCase().includes(termo) || (p.telefone || p.tel || "").toLowerCase().includes(termo);
  };

  const alternarSemResponsavel = () => {
    setFiltroSemResponsavel((v) => !v);
    setFiltroResponsaveisSel([]);
  };

  const alternarResponsavelSel = (id) => {
    setFiltroResponsaveisSel((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));
    setFiltroSemResponsavel(false);
  };

  // Faixa de estatisticas acima do Kanban (mesmo espirito da faixa do Kommo) -
  // sobre o mesmo recorte de leads que os filtros de responsavel ja aplicam
  // nas colunas, pra bater com o que a pessoa esta de fato vendo no board.
  const estatisticas = useMemo(() => {
    const visiveis = patients.filter((p) => passaFiltroResponsavel(p) && passaBusca(p));
    const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
    const inicioAmanha = new Date(inicioHoje); inicioAmanha.setDate(inicioAmanha.getDate() + 1);
    const inicioOntem = new Date(inicioHoje); inicioOntem.setDate(inicioOntem.getDate() - 1);
    const agora = new Date();

    let comTarefaHoje = 0, semTarefa = 0, atrasados = 0, novosHoje = 0, novosOntem = 0;
    for (const p of visiveis) {
      if (!p.proximaAcaoEm) {
        semTarefa++;
      } else {
        const data = new Date(p.proximaAcaoEm);
        if (data < agora) atrasados++;
        else if (data >= inicioHoje && data < inicioAmanha) comTarefaHoje++;
      }
      if (p.criadoEm) {
        const criado = new Date(p.criadoEm);
        if (criado >= inicioHoje && criado < inicioAmanha) novosHoje++;
        else if (criado >= inicioOntem && criado < inicioHoje) novosOntem++;
      }
    }
    return { total: visiveis.length, comTarefaHoje, semTarefa, atrasados, novosHoje, novosOntem };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, filtroSemResponsavel, filtroResponsaveisSel, buscaConversa]);

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
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", padding: "10px 14px", background: T.lineSoft, borderRadius: 10 }}>
        {[
          ["Leads no board", estatisticas.total],
          ["Com tarefa hoje", estatisticas.comTarefaHoje],
          ["Sem tarefa atribuída", estatisticas.semTarefa],
          ["Atrasados", estatisticas.atrasados],
          ["Novos hoje / ontem", `${estatisticas.novosHoje} / ${estatisticas.novosOntem}`],
        ].map(([rotulo, valor]) => (
          <div key={rotulo}>
            <div style={{ fontSize: 10.5, color: T.inkSoft, fontWeight: 700, textTransform: "uppercase", letterSpacing: .3 }}>{rotulo}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>{valor}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          style={{ ...s.input, height: 30, fontSize: 12.5, width: 220 }}
          placeholder="🔎 Buscar conversa por nome ou telefone..."
          value={buscaConversa}
          onChange={(e) => setBuscaConversa(e.target.value)}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: T.inkSoft }}>Responsável:</span>
        <button
          onClick={alternarSemResponsavel}
          style={{
            padding: "5px 11px", borderRadius: 20, fontSize: 11.5, fontWeight: 700,
            background: filtroSemResponsavel ? T.primarySoft : T.lineSoft,
            color: filtroSemResponsavel ? T.primaryDark : T.inkSoft,
          }}
        >
          Sem responsável
        </button>
        <SeletorResponsaveis
          colaboradores={colaboradores}
          selecionados={filtroResponsaveisSel}
          onAlternar={alternarResponsavelSel}
        />
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
            const doEstagio = patients
              .filter((p) => (p.estagio || "Lead") === etapa.nome && passaFiltroResponsavel(p) && passaBusca(p))
              .sort((a, b) => posicao(a) - posicao(b));
            return (
              <div
                key={etapa.id}
                style={{ display: "grid", gap: 10, alignContent: "start", minWidth: 240, width: 240, flexShrink: 0 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = Number(e.dataTransfer.getData("text/plain"));
                  const vizinhos = doEstagio.filter((x) => x.id !== draggedId);
                  moverParaPosicao(draggedId, etapa.nome, vizinhos, vizinhos.length);
                }}
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
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }} title={etapa.etapaFinal ? "Etapa final - some da Fila de Trabalho quando inativa" : ""}>
                      {etapa.etapaFinal && "🏁 "}{etapa.nome}
                    </span>
                  )}
                  <span style={{ ...s.tagOk, background: T.lineSoft, color: T.inkSoft }}>{doEstagio.length}</span>
                  {souAdmin && renomeando !== etapa.id && (
                    <DotMenu items={[
                      { label: "Renomear", onClick: () => { setRenomeando(etapa.id); setNomeEdicao(etapa.nome); } },
                      { label: etapa.descricao ? "Editar nota da coluna" : "Adicionar nota da coluna", onClick: () => { setEditandoDescricao(etapa.id); setDescricaoEdicao(etapa.descricao || ""); } },
                      { label: etapa.etapaFinal ? "Desmarcar etapa final" : "Marcar como etapa final", onClick: () => alternarEtapaFinal(etapa) },
                      ...(etapa.etapaFinal ? [{
                        label: "Definir limiar de inatividade",
                        onClick: () => { setEditandoLimiar(etapa.id); setLimiarEdicao(String(etapa.limiarInatividadeDias ?? 60)); },
                      }] : []),
                      { label: "Excluir coluna", danger: true, onClick: () => excluirEtapa(etapa) },
                    ]} />
                  )}
                </div>
                {editandoDescricao === etapa.id ? (
                  <div style={{ display: "grid", gap: 4 }}>
                    <textarea
                      autoFocus
                      style={{ ...s.input, fontSize: 11.5, minHeight: 54, resize: "vertical" }}
                      placeholder="Ex.: Estes leads foram qualificados pelo bot — mova pra atendimento e agende."
                      value={descricaoEdicao}
                      onChange={(e) => setDescricaoEdicao(e.target.value)}
                      onBlur={() => salvarDescricao(etapa)}
                      onKeyDown={(e) => { if (e.key === "Escape") setEditandoDescricao(null); }}
                    />
                  </div>
                ) : etapa.descricao ? (
                  <div style={{ fontSize: 11, color: T.inkSoft, background: T.lineSoft, borderRadius: 8, padding: "6px 8px", whiteSpace: "pre-wrap" }}>
                    {etapa.descricao}
                  </div>
                ) : null}
                {editandoLimiar === etapa.id && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.inkSoft }}>
                    Sumir da fila após
                    <input
                      autoFocus
                      type="number"
                      min={1}
                      style={{ ...s.input, height: 26, width: 56, fontSize: 12, padding: "2px 6px" }}
                      value={limiarEdicao}
                      onChange={(e) => setLimiarEdicao(e.target.value)}
                      onBlur={() => salvarLimiar(etapa)}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarLimiar(etapa); if (e.key === "Escape") setEditandoLimiar(null); }}
                    />
                    dias sem mensagem
                  </div>
                )}
                {!doEstagio.length && (
                  <Card><div style={{ fontSize: 12, color: T.inkSoft, textAlign: "center", padding: "14px 4px" }}>Nenhum lead aqui</div></Card>
                )}
                {doEstagio.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", String(p.id))}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const draggedId = Number(e.dataTransfer.getData("text/plain"));
                      if (draggedId === p.id) return;
                      const vizinhos = doEstagio.filter((x) => x.id !== draggedId);
                      const indiceAlvo = vizinhos.findIndex((x) => x.id === p.id);
                      moverParaPosicao(draggedId, etapa.nome, vizinhos, indiceAlvo);
                    }}
                    style={{
                      ...s.campCard, cursor: "grab", position: "relative", paddingBottom: 22, paddingLeft: 44,
                      borderLeft: `3px solid ${p.ultimaMensagemDirecao === "ENTRADA" ? T.coral : "transparent"}`,
                    }}
                    onClick={() => setChatAberto(p)}
                  >
                    <div style={{ position: "absolute", left: 10, top: 10, width: 26, height: 26, borderRadius: "50%", background: T.lineSoft, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <IconUserPlaceholder color={T.inkSoft} width={15} height={15} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
                        {p.nome === LEAD_SEM_NOME ? `de: ${p.telefone || "número desconhecido"}` : p.nome}
                      </div>
                      {selecao !== "todos" && idsComConversa.has(p.id) && (
                        <span style={{ color: T.primary, fontWeight: 700, fontSize: 12 }} title="Já conversou por este número">✓</span>
                      )}
                    </div>
                    {p.ultimaMensagemTexto && (
                      <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        "{p.ultimaMensagemTexto}"
                      </div>
                    )}
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                      <BadgeUltimaMensagem ultimaMensagemEm={p.ultimaMensagemEm} ultimaMensagemDirecao={p.ultimaMensagemDirecao} />
                      {p.ultimaMensagemEm && <span style={{ fontSize: 10, color: T.inkSoft }}>{dataHoraRelativa(p.ultimaMensagemEm)}</span>}
                    </div>
                    <div style={{ position: "absolute", bottom: 8, right: 8 }}>
                      <AvatarResponsavel colaborador={colaboradores.find((c) => c.id === p.responsavelId)} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {souAdmin && (
            <div style={{ minWidth: 240, width: 240, flexShrink: 0 }}>
              {etapaNovaAguardandoTag ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 11.5, color: T.inkSoft }}>Nome da tag da coluna "{etapaNovaAguardandoTag}"</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      autoFocus
                      style={{ ...s.input, height: 34, fontSize: 13, flex: 1 }}
                      placeholder="Nome da tag"
                      value={nomeNovaTag}
                      onChange={(e) => setNomeNovaTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") criarColuna(); if (e.key === "Escape") setEtapaNovaAguardandoTag(null); }}
                    />
                    <button style={s.btnPrimarySm} onClick={criarColuna}>Criar</button>
                  </div>
                </div>
              ) : novaColuna ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    autoFocus
                    style={{ ...s.input, height: 34, fontSize: 13, flex: 1 }}
                    placeholder="Nome da coluna"
                    value={nomeNovaColuna}
                    onChange={(e) => setNomeNovaColuna(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmarNomeColuna(); if (e.key === "Escape") setNovaColuna(false); }}
                  />
                  <button style={s.btnPrimarySm} onClick={confirmarNomeColuna}>OK</button>
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
