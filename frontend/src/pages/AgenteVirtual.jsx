import { useEffect, useMemo, useState } from "react";
import { ReactFlow, ReactFlowProvider, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { T } from "../theme";
import { s } from "../styles/s";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import {
  getAgenteVirtualConfig, setAgenteVirtualConfig,
  listarPerguntasFrequentes, criarPerguntaFrequente, atualizarPerguntaFrequente, excluirPerguntaFrequente,
} from "../api/agenteVirtual";
import NoChaveMestra, { HANDLE_MENSAGEM_PADRAO } from "../components/agentevirtual/NoChaveMestra";
import NoPergunta from "../components/agentevirtual/NoPergunta";
import NoMensagemPadrao from "../components/agentevirtual/NoMensagemPadrao";

const nodeTypes = { chave: NoChaveMestra, pergunta: NoPergunta, padrao: NoMensagemPadrao };

// Agente Virtual: triagem simples SEM IA (decisão do Samuel, 04/08/2026) - só
// casa palavra-chave escrita aqui contra o texto do lead, sem chamada de API
// externa nem custo por conversa. Dispara quando a primeira mensagem do dia
// de um contato fica 1 minuto sem nenhuma resposta (humano ou o próprio
// agente). Chave-mestra começa desligada - só ADMIN liga.
//
// Visual em arvore (05/08/2026, pedido do Samuel: "quero conectar os nós, pros
// operadores terem uma visualização da jornada") - MESMO dado/API de sempre
// (config + lista de PerguntaFrequente), só a apresentação virou nós
// conectados (igual ao editor de Automação) em vez de uma lista plana. Não
// muda a logica real de casamento de palavra-chave (AgenteVirtualService
// continua so' comparando texto, sem ordem/prioridade entre os nos).
export function AgenteVirtual({ showToast, usuario }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const [config, setConfig] = useState(null);
  const [perguntas, setPerguntas] = useState(null);
  const [modal, setModal] = useState(null); // null | {id, palavrasChave, resposta}
  const [editandoPadrao, setEditandoPadrao] = useState(false);
  const [mensagemPadraoEdicao, setMensagemPadraoEdicao] = useState("");
  const [salvandoPergunta, setSalvandoPergunta] = useState(false);

  const carregar = () => {
    if (!souAdmin) return;
    getAgenteVirtualConfig().then(setConfig).catch(() => showToast("Erro ao carregar configuração", "warn"));
    listarPerguntasFrequentes().then(setPerguntas).catch(() => setPerguntas([]));
  };

  useEffect(() => { carregar(); }, []);

  const salvarConfig = async (patch) => {
    const novo = { ...config, ...patch };
    setConfig(novo);
    try {
      const salvo = await setAgenteVirtualConfig(novo);
      setConfig(salvo);
      showToast("Configuração salva", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar configuração", "warn");
    }
  };

  const abrirEdicaoPadrao = () => { setMensagemPadraoEdicao(config.mensagemPadrao); setEditandoPadrao(true); };
  const salvarMensagemPadrao = async () => {
    setEditandoPadrao(false);
    await salvarConfig({ mensagemPadrao: mensagemPadraoEdicao });
  };

  const salvarPergunta = async () => {
    if (!modal.palavrasChave.trim() || !modal.resposta.trim()) {
      return showToast("Preencha as palavras-chave e a resposta", "warn");
    }
    setSalvandoPergunta(true);
    try {
      const dto = { palavrasChave: modal.palavrasChave.trim(), resposta: modal.resposta.trim() };
      if (modal.id) await atualizarPerguntaFrequente(modal.id, dto);
      else await criarPerguntaFrequente(dto);
      setModal(null);
      listarPerguntasFrequentes().then(setPerguntas);
      showToast("Pergunta salva", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar pergunta", "warn");
    } finally {
      setSalvandoPergunta(false);
    }
  };

  const excluir = async (id) => {
    try {
      await excluirPerguntaFrequente(id);
      setPerguntas((lista) => lista.filter((p) => p.id !== id));
      showToast("Pergunta excluída", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao excluir pergunta", "warn");
    }
  };

  const abrirNovaPergunta = () => setModal({ id: null, palavrasChave: "", resposta: "" });
  const abrirEditarPergunta = (id) => {
    const p = perguntas.find((x) => x.id === Number(id));
    if (p) setModal({ id: p.id, palavrasChave: p.palavrasChave, resposta: p.resposta });
  };

  const ALTURA_LINHA = 90;
  const nodes = useMemo(() => {
    if (!config || !perguntas) return [];
    const lista = [
      { id: "chave", type: "chave", position: { x: 40, y: Math.max(0, (perguntas.length * ALTURA_LINHA) / 2 - 60) }, data: { ativo: config.ativo, perguntas, onAlternarAtivo: () => salvarConfig({ ativo: !config.ativo }) } },
    ];
    perguntas.forEach((p, i) => {
      lista.push({
        id: String(p.id), type: "pergunta", position: { x: 440, y: i * ALTURA_LINHA },
        data: { palavrasChave: p.palavrasChave, resposta: p.resposta, onEditar: abrirEditarPergunta, onExcluir: excluir },
      });
    });
    lista.push({
      id: "padrao", type: "padrao", position: { x: 440, y: perguntas.length * ALTURA_LINHA },
      data: { mensagemPadrao: config.mensagemPadrao, onEditar: abrirEdicaoPadrao },
    });
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, perguntas]);

  const edges = useMemo(() => {
    if (!perguntas) return [];
    const lista = perguntas.map((p) => ({
      id: `edge-chave-${p.id}`, source: "chave", sourceHandle: String(p.id), target: String(p.id),
      style: { stroke: T.primary }, animated: true,
    }));
    lista.push({ id: "edge-chave-padrao", source: "chave", sourceHandle: HANDLE_MENSAGEM_PADRAO, target: "padrao", style: { stroke: "#8A9AA6", strokeDasharray: "4 4" } });
    return lista;
  }, [perguntas]);

  if (!souAdmin) {
    return (
      <div style={{ display: "grid", gap: 18, maxWidth: 820 }}>
        <div style={s.aviso}>Essa área é restrita ao administrador da conta.</div>
      </div>
    );
  }

  if (!config || !perguntas) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "20px 0" }}>Carregando Agente Virtual...</div>;

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 1100 }}>
      <div style={s.aviso}>
        <b>Sem IA de propósito.</b> O agente só casa as palavras-chave que você cadastrar aqui contra a
        mensagem do lead — nunca inventa resposta sobre saúde, financeiro ou qualquer outro assunto.
        Se nada bater, ele manda a mensagem padrão avisando que alguém vai responder.
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={s.btnPrimarySm} onClick={abrirNovaPergunta}>+ Nova pergunta</button>
      </div>

      <div style={{ height: 520, background: "#F7F9FA", borderRadius: 14, border: `1px solid ${T.line}`, position: "relative" }}>
        <ReactFlowProvider>
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
            <Background gap={18} color="#DDE4E8" />
            <Controls position="bottom-left" showInteractive={false} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {modal && (
        <Modal title={modal.id ? "Editar pergunta" : "Nova pergunta"} onClose={() => setModal(null)}>
          <Field label="Palavras-chave (separadas por vírgula)">
            <textarea
              style={{ ...s.input, width: "100%", minHeight: 60 }}
              placeholder="ex.: horário, que horas, até que hora atende"
              value={modal.palavrasChave}
              onChange={(e) => setModal({ ...modal, palavrasChave: e.target.value })}
            />
          </Field>
          <Field label="Resposta">
            <textarea
              style={{ ...s.input, width: "100%", minHeight: 90 }}
              placeholder="ex.: Atendemos de segunda a sábado, das 8h às 18h!"
              value={modal.resposta}
              onChange={(e) => setModal({ ...modal, resposta: e.target.value })}
            />
          </Field>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1, opacity: salvandoPergunta ? .6 : 1 }} onClick={salvarPergunta} disabled={salvandoPergunta}>
              {salvandoPergunta ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </Modal>
      )}

      {editandoPadrao && (
        <Modal title="Mensagem padrão (quando nenhuma pergunta bater)" onClose={() => setEditandoPadrao(false)}>
          <textarea
            autoFocus
            style={{ ...s.input, width: "100%", minHeight: 90 }}
            value={mensagemPadraoEdicao}
            onChange={(e) => setMensagemPadraoEdicao(e.target.value)}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setEditandoPadrao(false)}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1 }} onClick={salvarMensagemPadrao}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
