import { useEffect, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import {
  getAgenteVirtualConfig, setAgenteVirtualConfig,
  listarPerguntasFrequentes, criarPerguntaFrequente, atualizarPerguntaFrequente, excluirPerguntaFrequente,
} from "../api/agenteVirtual";

// Agente Virtual: triagem simples SEM IA (decisão do Samuel, 04/08/2026) - só
// casa palavra-chave escrita aqui contra o texto do lead, sem chamada de API
// externa nem custo por conversa. Dispara quando a primeira mensagem do dia
// de um contato fica 1 minuto sem nenhuma resposta (humano ou o próprio
// agente). Chave-mestra começa desligada - só ADMIN liga.
// Item de menu visivel pra todo colaborador (pedido explicito), mas so ADMIN
// ve a configuracao de verdade - os demais nem chegam a chamar a API (que ja
// e' @PreAuthorize ADMIN no backend, ver AgenteVirtualController).
export function AgenteVirtual({ showToast, usuario }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const [config, setConfig] = useState(null);
  const [perguntas, setPerguntas] = useState(null);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [modal, setModal] = useState(null); // null | {id, palavrasChave, resposta}
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
    setSalvandoConfig(true);
    try {
      const salvo = await setAgenteVirtualConfig(novo);
      setConfig(salvo);
      showToast("Configuração salva", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar configuração", "warn");
    } finally {
      setSalvandoConfig(false);
    }
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

  if (!souAdmin) {
    return (
      <div style={{ display: "grid", gap: 18, maxWidth: 820 }}>
        <Card title="Agente Virtual">
          <div style={{ fontSize: 14, color: T.inkSoft }}>
            Essa área é restrita ao administrador da conta.
          </div>
        </Card>
      </div>
    );
  }

  if (!config || !perguntas) return <div style={{ color: T.inkSoft, fontSize: 14, padding: "20px 0" }}>Carregando Agente Virtual...</div>;

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 820 }}>
      <div style={s.aviso}>
        <b>Sem IA de propósito.</b> O agente só casa as palavras-chave que você cadastrar aqui contra a
        mensagem do lead — nunca inventa resposta sobre saúde, financeiro ou qualquer outro assunto.
        Se nada bater, ele manda a mensagem padrão avisando que alguém vai responder.
      </div>

      <Card title="Chave-mestra">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => salvarConfig({ ativo: !config.ativo })}
            disabled={salvandoConfig}
            style={{ ...s.btnPrimarySm, background: config.ativo ? T.coral : T.primary }}
          >
            {config.ativo ? "Desligar" : "Ligar"} o Agente Virtual
          </button>
          <span style={{ ...s.tagOk, ...(config.ativo ? {} : { color: T.inkSoft, background: T.lineSoft }) }}>
            {config.ativo ? "● Ativo — respondendo automaticamente" : "● Inativo"}
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 10 }}>
          Dispara quando a primeira mensagem do dia de um lead fica 1 minuto sem nenhuma resposta
          (de humano ou do próprio agente).
        </div>
      </Card>

      <Card title="Mensagem padrão (quando nenhuma pergunta bater)">
        <textarea
          style={{ ...s.input, width: "100%", minHeight: 70, resize: "vertical" }}
          value={config.mensagemPadrao}
          onChange={(e) => setConfig({ ...config, mensagemPadrao: e.target.value })}
          onBlur={() => salvarConfig({ mensagemPadrao: config.mensagemPadrao })}
        />
      </Card>

      <Card title="Perguntas frequentes">
        <button style={{ ...s.btnGhostSm, marginBottom: 12 }} onClick={() => setModal({ id: null, palavrasChave: "", resposta: "" })}>
          + Nova pergunta
        </button>
        {!perguntas.length ? (
          <div style={{ fontSize: 13, color: T.inkSoft }}>Nenhuma pergunta cadastrada ainda.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {perguntas.map((p) => (
              <div key={p.id} style={{ padding: "10px 12px", background: T.lineSoft, borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: T.primary, fontWeight: 700 }}>{p.palavrasChave}</div>
                  <div style={{ fontSize: 13, color: T.ink, marginTop: 4 }}>{p.resposta}</div>
                </div>
                <button style={s.btnGhostSm} onClick={() => setModal({ id: p.id, palavrasChave: p.palavrasChave, resposta: p.resposta })}>Editar</button>
                <button style={{ ...s.btnGhostSm, color: T.coral }} onClick={() => excluir(p.id)}>Excluir</button>
              </div>
            ))}
          </div>
        )}
      </Card>

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
    </div>
  );
}
