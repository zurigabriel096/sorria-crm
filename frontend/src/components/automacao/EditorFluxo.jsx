import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  useNodesState, useEdgesState, useReactFlow, addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { T } from "../../theme";
import { s } from "../../styles/s";
import StartNode from "./StartNode";
import FlowNode from "./FlowNode";
import MensagemNode from "./MensagemNode";
import PlaceholderNode from "./PlaceholderNode";
import CondicaoNode from "./CondicaoNode";
import { EntradaPanel } from "./EntradaPanel";
import { PrimeiroPassoPanel } from "./PrimeiroPassoPanel";
import { MensagemPanel } from "./MensagemPanel";
import ActionsPanel from "./ActionsPanel";
import { AjudaZoomButton } from "./AjudaZoomModal";
import { getFluxo, updateFluxo, ativarFluxo, resetarTeste } from "../../api/automacoes";
import { listNumeros } from "../../api/whatsappNumeros";
import { gerarId } from "../../utils/automacao/ids";

const nodeTypes = { start: StartNode, action: FlowNode, mensagem: MensagemNode, placeholder: PlaceholderNode, condicao: CondicaoNode };

// Mesmo vocabulario de OPERADORES em CondicaoNode.jsx - usado so pra montar
// o rotulo da aresta (ver edgesComRotulo), nao reexportado de la pra nao
// criar dependencia cruzada por um mapa tao pequeno.
const OPERADOR_ROTULO = { contem: "contém", nao_contem: "não contém", igual: "é igual a", diferente: "é diferente de" };

// Altura/padding/borda comuns a TODOS os controles da barra escura do editor
// (select de número, ☰, Salvar, contato de teste, Resetar teste, Ativar) -
// antes cada um tinha sua propria altura implicita (padding vertical
// diferente, <select> com altura nativa do navegador), o que deixava a barra
// com alturas desalinhadas entre si (reportado pelo Samuel, 05/08/2026).
const estiloBotaoHeader = {
  height: 36, display: "flex", alignItems: "center", boxSizing: "border-box",
  background: "rgba(255,255,255,.1)", color: "#fff", fontSize: 12.5, fontWeight: 600,
  padding: "0 12px", borderRadius: 9, border: "none", whiteSpace: "nowrap",
};

function noInicioPadrao() {
  return { id: "inicio", type: "start", position: { x: 60, y: 220 }, data: { entrada: null } };
}

function criarNoDeItem(item) {
  if (item.tipo === "enviar_mensagem") {
    return { type: "mensagem", data: { texto: "", imagem: null, blocosConteudo: [], atraso: { dias: 0, horas: 0, minutos: 0, segundos: 0 } } };
  }
  if (item.tipo === "condicao") {
    return { type: "condicao", data: { condicoes: [{ id: gerarId("cond"), operador: "contem", valor: "" }] } };
  }
  return { type: "action", data: { tipo: item.tipo, nome: item.nome } };
}

function formatarRelativo(segundos) {
  if (segundos < 60) return `há ${segundos}s`;
  return `há ${Math.floor(segundos / 60)}min`;
}

// Editor de um fluxo especifico - versao do canvas do protótipo sorria-automacao
// portada pro sorria-crm: persiste de verdade em /api/automacoes (nao mais
// localStorage), e o nome/ativo ja vem definidos da ListaFluxos antes de abrir aqui.
function Editor({ fluxo, souAdmin, onVoltar, showToast, patients, camposCustomizados }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(fluxo.nodes?.length ? fluxo.nodes : [noInicioPadrao()]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(fluxo.edges || []);
  const [ativo, setAtivo] = useState(!!fluxo.ativo);
  const [contatoTesteId, setContatoTesteId] = useState(fluxo.contatoTesteId || null);
  const [whatsappNumeroId, setWhatsappNumeroId] = useState(fluxo.whatsappNumeroId || null);
  const [numeros, setNumeros] = useState([]);
  useEffect(() => { listNumeros().then(setNumeros).catch(() => setNumeros([])); }, []);
  const [painelAberto, setPainelAberto] = useState(true);
  const [painelAtivo, setPainelAtivo] = useState(null);
  const [ultimoSalvamentoEm, setUltimoSalvamentoEm] = useState(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [salvando, setSalvando] = useState(false);

  const conexaoOrigem = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback((conn) => setEdges((eds) => addEdge({ ...conn, animated: true, style: { stroke: T.primary, strokeDasharray: "4 4" } }, eds)), [setEdges]);
  const onConnectStart = useCallback((_, params) => { conexaoOrigem.current = params; }, []);

  const onConnectEnd = useCallback((event, connectionState) => {
    if (connectionState.isValid || !conexaoOrigem.current) { conexaoOrigem.current = null; return; }
    const origem = conexaoOrigem.current;
    conexaoOrigem.current = null;
    const { clientX, clientY } = "changedTouches" in event ? event.changedTouches[0] : event;
    const posicao = screenToFlowPosition({ x: clientX, y: clientY });
    const placeholderId = gerarId("ph");
    setNodes((nds) => [...nds, { id: placeholderId, type: "placeholder", position: posicao, data: {} }]);
    setEdges((eds) => addEdge({ id: gerarId("edge"), source: origem.nodeId, sourceHandle: origem.handleId, target: placeholderId, animated: true, style: { stroke: T.primary, strokeDasharray: "4 4" } }, eds));
    setPainelAtivo({ tipo: "primeiroPasso", placeholderId });
  }, [screenToFlowPosition, setNodes, setEdges]);

  const resolverPrimeiroPasso = (item) => {
    const { placeholderId } = painelAtivo;
    const { type, data } = criarNoDeItem(item);
    setNodes((nds) => nds.map((n) => (n.id === placeholderId ? { ...n, type, data } : n)));
    setPainelAtivo(null);
  };

  const fecharPrimeiroPassoSemEscolher = () => {
    const { placeholderId } = painelAtivo;
    setNodes((nds) => nds.filter((n) => n.id !== placeholderId));
    setEdges((eds) => eds.filter((e) => e.target !== placeholderId));
    setPainelAtivo(null);
  };

  const abrirEntrada = useCallback(() => setPainelAtivo({ tipo: "entrada" }), []);
  const mudarEntrada = (patch) => {
    setNodes((nds) => nds.map((n) => (n.type === "start"
      ? { ...n, data: { entrada: { modoEntrada: null, tipoCondicao: null, segmentacao: null, automacaoMarketing: null, ...n.data.entrada, ...patch } } }
      : n)));
  };

  const abrirMensagem = useCallback((nodeId) => setPainelAtivo({ tipo: "mensagem", nodeId }), []);
  const mudarMensagem = (nodeId, patch) => setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  const mudarConfigAcao = (nodeId, patch) => setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));

  const excluirNo = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setPainelAtivo((p) => (p?.nodeId === nodeId ? null : p));
  }, [setNodes, setEdges]);

  const adicionarAcaoSolta = (item) => {
    const { type, data } = criarNoDeItem(item);
    const id = gerarId("no");
    const offset = (nodes.length % 6) * 70;
    setNodes((nds) => [...nds, { id, type, position: { x: 420, y: 60 + offset }, data }]);
  };

  const nodesComCallback = nodes.map((n) => {
    if (n.type === "start") return { ...n, data: { ...n.data, onAbrirEntrada: abrirEntrada } };
    if (n.type === "mensagem") return { ...n, data: { ...n.data, onAbrir: abrirMensagem, onExcluir: excluirNo } };
    if (n.type === "action") return { ...n, data: { ...n.data, onExcluir: excluirNo, onMudarConfig: mudarConfigAcao } };
    if (n.type === "condicao") return { ...n, data: { ...n.data, onExcluir: excluirNo, onMudarConfig: mudarConfigAcao } };
    if (n.type === "placeholder") return { ...n, data: { ...n.data, onExcluir: excluirNo } };
    return n;
  });

  // Rotulo na PROPRIA seta (nao so dentro do no de Condição) - pedido do
  // Samuel: "poderia ter essa nomenclatura desses dois nozinhos que estao
  // saindo" (qual condicao cada aresta representa). So visual - nunca
  // persistido (nao entra em "edges", que e' o que "persistir" salva),
  // recalculado a cada render a partir da condicao de verdade, entao nunca
  // fica desatualizado se o texto da condicao mudar.
  const edgesComRotulo = edges.map((e) => {
    const origem = nodes.find((n) => n.id === e.source);
    if (origem?.type !== "condicao") return e;
    const condicoes = origem.data?.condicoes || [];
    const condicao = condicoes.find((c) => c.id === e.sourceHandle);
    const rotulo = condicao
      ? `${OPERADOR_ROTULO[condicao.operador] || condicao.operador} "${condicao.valor}"`
      : e.sourceHandle === "__fallback__" ? "nenhuma bateu" : null;
    if (!rotulo) return e;
    return { ...e, label: rotulo, labelBgStyle: { fill: "#fff", fillOpacity: .92 }, labelStyle: { fontSize: 10.5, fill: "#5C6E7E", fontWeight: 700 } };
  });

  const mudarWhatsappNumero = async (valor) => {
    const id = valor ? Number(valor) : null;
    setWhatsappNumeroId(id);
    try {
      await updateFluxo(fluxo.id, { nome: fluxo.nome, ativo, nodes, edges, contatoTesteId, whatsappNumeroId: id });
      showToast(id ? "Número de disparo definido" : "Voltou a usar o número principal", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar número de disparo", "warn");
    }
  };

  const persistir = async (mostrarToast) => {
    setSalvando(true);
    try {
      await updateFluxo(fluxo.id, { nome: fluxo.nome, ativo, nodes, edges, contatoTesteId, whatsappNumeroId });
      setUltimoSalvamentoEm(Date.now());
      if (mostrarToast) showToast("Fluxo salvo", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar fluxo", "warn");
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async () => {
    if (!souAdmin) return;
    // Corte de seguranca (Fase 5): sem contato de teste, ativar passa a mandar
    // mensagem de verdade pra todo mundo que bater com a segmentacao de entrada.
    if (!ativo && !contatoTesteId) {
      const confirmou = window.confirm(
        "Este fluxo não tem contato de teste configurado. Ao ativar, ele vai começar a mandar mensagens reais pra todo mundo que bater com a segmentação de entrada. Confirma?"
      );
      if (!confirmou) return;
    }
    try {
      await ativarFluxo(fluxo.id, !ativo);
      setAtivo((a) => !a);
      showToast(!ativo ? "Fluxo ativado — passa a rodar de verdade" : "Fluxo desativado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao ativar/desativar fluxo", "warn");
    }
  };

  const escolherContatoTeste = async (id) => {
    setContatoTesteId(id);
    try {
      await updateFluxo(fluxo.id, { nome: fluxo.nome, ativo, nodes, edges, contatoTesteId: id, whatsappNumeroId });
      showToast(id ? "Contato de teste definido — o fluxo só roda pra ele" : "Contato de teste removido", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar contato de teste", "warn");
    }
  };

  // A entrada (segmentacao ou "mensagem recebida") so cria UMA execucao por
  // par fluxo+contato pra sempre - reconfigurar o gatilho ou a segmentacao nao
  // faz o mesmo contato de teste entrar de novo se ele ja rodou antes. Isso
  // limpa a execucao antiga pra dar pra retestar sem precisar mexer no banco.
  const resetarTesteDoContato = async () => {
    try {
      await resetarTeste(fluxo.id);
      showToast("Progresso de teste zerado — o contato de teste pode entrar no fluxo de novo no próximo ciclo (até 10s)", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao resetar teste", "warn");
    }
  };

  // Autosave leve (4min) - agora persiste de verdade no backend, nao so localStorage.
  useEffect(() => {
    const t = setInterval(() => persistir(false), 4 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, ativo, contatoTesteId, whatsappNumeroId]);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const textoSalvo = ultimoSalvamentoEm ? `Salvo ${formatarRelativo(Math.floor((agora - ultimoSalvamentoEm) / 1000))}` : null;
  const noInicio = nodes.find((n) => n.type === "start");

  return (
    <div style={{ height: "calc(100vh - 54px)", display: "flex", flexDirection: "column", position: "fixed", top: 54, left: 0, right: 0, bottom: 0, background: "#eef0f3" }}>
      <div style={{ height: 54, background: T.ink, color: "#fff", display: "flex", alignItems: "center", padding: "0 16px", gap: 14, flexShrink: 0 }}>
        <button onClick={onVoltar} style={{ color: "#fff", fontSize: 16 }} title="Voltar">←</button>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{fluxo.nome}</div>
        <span style={{ ...s.tagOk, background: ativo ? "#E1F4F0" : "rgba(255,255,255,.12)", color: ativo ? "#0E9484" : "#fff" }}>{ativo ? "● Ativo" : "○ Inativo"}</span>
        <div style={{ flex: 1 }} />
        {textoSalvo && <span style={{ fontSize: 12, color: "#9db4c9" }}>{textoSalvo}</span>}
        {souAdmin && (
          <select
            title="Qual número de WhatsApp esse fluxo usa pra mandar mensagem - deixe em branco pra usar o número principal. Recomendado: só números de baixo volume (nunca os de disparo em massa)."
            value={whatsappNumeroId ? String(whatsappNumeroId) : ""}
            onChange={(e) => mudarWhatsappNumero(e.target.value)}
            style={{ ...estiloBotaoHeader, fontWeight: 600, padding: "0 10px" }}
          >
            <option value="" style={{ color: T.ink }}>Número principal</option>
            {numeros.filter((n) => n.finalidade !== "AQUECIMENTO").map((n) => (
              <option key={n.id} value={n.id} style={{ color: T.ink }}>{n.nome}</option>
            ))}
          </select>
        )}
        <button onClick={() => setPainelAberto((o) => !o)} title="Ações disponíveis" style={{ ...estiloBotaoHeader, width: 36, padding: 0, justifyContent: "center", background: painelAberto ? T.primary : "rgba(255,255,255,.08)" }}>☰</button>
        <button onClick={() => persistir(true)} disabled={salvando} style={{ ...estiloBotaoHeader, fontWeight: 700, fontSize: 13, padding: "0 14px" }}>{salvando ? "Salvando..." : "Salvar"}</button>
        {souAdmin && (
          <SeletorContatoTeste contatoTesteId={contatoTesteId} patients={patients || []} onEscolher={escolherContatoTeste} />
        )}
        {souAdmin && contatoTesteId && (
          <button
            onClick={resetarTesteDoContato}
            title="Apaga o progresso que o contato de teste já teve nesse fluxo, pra ele poder entrar de novo do início"
            style={estiloBotaoHeader}
          >
            🔄 Resetar teste
          </button>
        )}
        {souAdmin && (
          <button onClick={alternarAtivo} style={{ ...estiloBotaoHeader, fontWeight: 700, fontSize: 13, padding: "0 16px", background: ativo ? T.coral : T.primary }}>
            {ativo ? "Desativar" : "Ativar fluxo"}
          </button>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {painelAtivo?.tipo === "mensagem" && (
          <MensagemPanel data={nodes.find((n) => n.id === painelAtivo.nodeId)?.data || {}} onMudar={(patch) => mudarMensagem(painelAtivo.nodeId, patch)} onFechar={() => setPainelAtivo(null)} camposCustomizados={camposCustomizados} />
        )}
        <div style={{ flex: 1, position: "relative" }}>
          <ReactFlow
            nodes={nodesComCallback} edges={edgesComRotulo} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onConnectStart={onConnectStart} onConnectEnd={onConnectEnd} nodeTypes={nodeTypes} fitView
          >
            <Background gap={18} color="#D7DEE3" />
            <Controls position="bottom-left" />
          </ReactFlow>
          <AjudaZoomButton />
        </div>
        {painelAtivo?.tipo === "entrada" && <EntradaPanel entrada={noInicio?.data.entrada} onMudar={mudarEntrada} onFechar={() => setPainelAtivo(null)} camposCustomizados={camposCustomizados} />}
        {painelAtivo?.tipo === "primeiroPasso" && <PrimeiroPassoPanel onEscolher={resolverPrimeiroPasso} onFechar={fecharPrimeiroPassoSemEscolher} />}
        {painelAberto && !painelAtivo && <ActionsPanel onAdd={adicionarAcaoSolta} onClose={() => setPainelAberto(false)} />}
      </div>
    </div>
  );
}

// Wrapper que carrega o fluxo real da API antes de montar o editor (precisa
// existir antes do useReactFlow ter contexto - por isso o ReactFlowProvider aqui).
export function EditorFluxo({ fluxoId, souAdmin, onVoltar, showToast, patients, camposCustomizados }) {
  const [fluxo, setFluxo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    getFluxo(fluxoId).then(setFluxo).catch((e) => setErro(e.message || "Erro ao carregar fluxo"));
  }, [fluxoId]);

  if (erro) return <div style={{ padding: 40, textAlign: "center", color: T.coral }}>{erro}</div>;
  if (!fluxo) return <div style={{ padding: 40, textAlign: "center", color: T.inkSoft }}>Carregando fluxo...</div>;

  return (
    <ReactFlowProvider>
      <Editor fluxo={fluxo} souAdmin={souAdmin} onVoltar={onVoltar} showToast={showToast} patients={patients} camposCustomizados={camposCustomizados} />
    </ReactFlowProvider>
  );
}

// Corte de seguranca (Fase 5): escolhe um contato real pra restringir o fluxo -
// enquanto configurado, o motor ignora a segmentacao de entrada e roda so pra
// esse contato (ver AutomacaoEngineService.processarEntradaDeUmFluxo). Popover
// simples com busca por nome/telefone, mesmo padrao de filtro do "+Iniciar
// conversa" em Conversas.jsx, sem precisar de um componente de busca à parte.
function SeletorContatoTeste({ contatoTesteId, patients, onEscolher }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const ref = useRef(null);
  const contato = patients.find((p) => p.id === contatoTesteId);

  useEffect(() => {
    if (!aberto) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [aberto]);

  const encontrados = busca.trim()
    ? patients.filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()) || (p.tel || "").includes(busca.trim()))
    : patients;

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setAberto((o) => !o)}
        title="Contato de teste - enquanto configurado, o fluxo só roda pra esse contato"
        style={{
          ...estiloBotaoHeader,
          background: contato ? T.gold : "rgba(255,255,255,.1)", color: contato ? T.ink : "#fff",
          fontWeight: 700,
        }}
      >
        🧪 {contato ? contato.nome : "Definir contato de teste"}
      </button>
      {aberto && (
        <div className="pop" style={{
          position: "absolute", top: 40, right: 0, width: 260, maxHeight: 320, overflowY: "auto",
          background: "#fff", border: `1px solid ${T.line}`, borderRadius: 10,
          boxShadow: "0 10px 30px rgba(20,40,55,.24)", zIndex: 40, padding: 10,
        }}>
          {contato && (
            <button
              style={{ ...s.btnGhostSm, width: "100%", justifyContent: "center", color: T.coral, marginBottom: 8 }}
              onClick={() => { onEscolher(null); setAberto(false); }}
            >
              Remover contato de teste
            </button>
          )}
          <input
            autoFocus
            style={{ ...s.input, height: 32, fontSize: 12.5 }}
            placeholder="Buscar lead por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div style={{ display: "grid", gap: 2, marginTop: 8 }}>
            {encontrados.slice(0, 30).map((p) => (
              <button
                key={p.id}
                onClick={() => { onEscolher(p.id); setAberto(false); }}
                className="navItem"
                style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 7, fontSize: 12.5, color: T.ink }}
              >
                <b>{p.nome}</b> <span style={{ color: T.inkSoft }}>· {p.tel || "sem telefone"}</span>
              </button>
            ))}
            {!encontrados.length && <div style={{ fontSize: 12.5, color: T.inkSoft, padding: "6px 8px" }}>Nenhum lead encontrado.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
