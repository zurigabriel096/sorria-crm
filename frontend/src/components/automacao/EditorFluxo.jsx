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
import { EntradaPanel } from "./EntradaPanel";
import { PrimeiroPassoPanel } from "./PrimeiroPassoPanel";
import { MensagemPanel } from "./MensagemPanel";
import ActionsPanel from "./ActionsPanel";
import { AjudaZoomButton } from "./AjudaZoomModal";
import { getFluxo, updateFluxo, ativarFluxo } from "../../api/automacoes";
import { gerarId } from "../../utils/automacao/ids";

const nodeTypes = { start: StartNode, action: FlowNode, mensagem: MensagemNode, placeholder: PlaceholderNode };

function noInicioPadrao() {
  return { id: "inicio", type: "start", position: { x: 60, y: 220 }, data: { entrada: null } };
}

function criarNoDeItem(item) {
  if (item.tipo === "enviar_mensagem") {
    return { type: "mensagem", data: { texto: "", imagem: null, respostasRapidas: [], blocosConteudo: [], atraso: { dias: 0, horas: 0, minutos: 0, segundos: 0 } } };
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
function Editor({ fluxo, souAdmin, onVoltar, showToast }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(fluxo.nodes?.length ? fluxo.nodes : [noInicioPadrao()]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(fluxo.edges || []);
  const [ativo, setAtivo] = useState(!!fluxo.ativo);
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
    return n;
  });

  const persistir = async (mostrarToast) => {
    setSalvando(true);
    try {
      await updateFluxo(fluxo.id, { nome: fluxo.nome, ativo, nodes, edges });
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
    try {
      await ativarFluxo(fluxo.id, !ativo);
      setAtivo((a) => !a);
      showToast(!ativo ? "Fluxo ativado — passa a rodar de verdade" : "Fluxo desativado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao ativar/desativar fluxo", "warn");
    }
  };

  // Autosave leve (4min) - agora persiste de verdade no backend, nao so localStorage.
  useEffect(() => {
    const t = setInterval(() => persistir(false), 4 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, ativo]);

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
        <button onClick={() => setPainelAberto((o) => !o)} title="Ações disponíveis" style={{ width: 32, height: 32, borderRadius: 9, background: painelAberto ? T.primary : "rgba(255,255,255,.08)", color: "#fff", display: "grid", placeItems: "center" }}>☰</button>
        <button onClick={() => persistir(true)} disabled={salvando} style={{ background: "rgba(255,255,255,.1)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 9 }}>{salvando ? "Salvando..." : "Salvar"}</button>
        {souAdmin && (
          <button onClick={alternarAtivo} style={{ background: ativo ? T.coral : T.primary, color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 9 }}>
            {ativo ? "Desativar" : "Ativar fluxo"}
          </button>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {painelAtivo?.tipo === "mensagem" && (
          <MensagemPanel data={nodes.find((n) => n.id === painelAtivo.nodeId)?.data || {}} onMudar={(patch) => mudarMensagem(painelAtivo.nodeId, patch)} onFechar={() => setPainelAtivo(null)} />
        )}
        <div style={{ flex: 1, position: "relative" }}>
          <ReactFlow
            nodes={nodesComCallback} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onConnectStart={onConnectStart} onConnectEnd={onConnectEnd} nodeTypes={nodeTypes} fitView
          >
            <Background gap={18} color="#D7DEE3" />
            <Controls position="bottom-left" />
          </ReactFlow>
          <AjudaZoomButton />
        </div>
        {painelAtivo?.tipo === "entrada" && <EntradaPanel entrada={noInicio?.data.entrada} onMudar={mudarEntrada} onFechar={() => setPainelAtivo(null)} />}
        {painelAtivo?.tipo === "primeiroPasso" && <PrimeiroPassoPanel onEscolher={resolverPrimeiroPasso} onFechar={fecharPrimeiroPassoSemEscolher} />}
        {painelAberto && !painelAtivo && <ActionsPanel onAdd={adicionarAcaoSolta} onClose={() => setPainelAberto(false)} />}
      </div>
    </div>
  );
}

// Wrapper que carrega o fluxo real da API antes de montar o editor (precisa
// existir antes do useReactFlow ter contexto - por isso o ReactFlowProvider aqui).
export function EditorFluxo({ fluxoId, souAdmin, onVoltar, showToast }) {
  const [fluxo, setFluxo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    getFluxo(fluxoId).then(setFluxo).catch((e) => setErro(e.message || "Erro ao carregar fluxo"));
  }, [fluxoId]);

  if (erro) return <div style={{ padding: 40, textAlign: "center", color: T.coral }}>{erro}</div>;
  if (!fluxo) return <div style={{ padding: 40, textAlign: "center", color: T.inkSoft }}>Carregando fluxo...</div>;

  return (
    <ReactFlowProvider>
      <Editor fluxo={fluxo} souAdmin={souAdmin} onVoltar={onVoltar} showToast={showToast} />
    </ReactFlowProvider>
  );
}
