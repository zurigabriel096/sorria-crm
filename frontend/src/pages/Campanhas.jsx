import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { dataHora } from "../utils/format";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { IconSend } from "../components/icons";

const vazio = () => ({ id: null, nome: "", objetivo: "Reativação", canal: "WhatsApp", emailMsg: "", segmentoId: "", templateId: "", intervaloSegundos: 3 });

export function Campanhas({ campanhas, onCriarCampanha, onAtualizarCampanha, onExcluirCampanha, onArquivarCampanha, templates, objetivos, setObjetivos, segmentos, onDisparar, showToast, usuario }) {
  const responsavel = usuario?.nome || "Você";
  const [modal, setModal] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [f, setF] = useState(vazio());
  const [novoObj, setNovoObj] = useState("");
  const [fObjetivo, setFObjetivo] = useState("Todos");
  const [verArquivadas, setVerArquivadas] = useState(false);
  const ativos = templates.filter((t) => t.ativo && !t.arquivado);

  const abrirNovo = () => { setF(vazio()); setModal("novo"); };
  const abrirEdicao = (c) => {
    setF({ id: c.id, nome: c.nome, objetivo: c.objetivo, canal: c.canal, emailMsg: c.emailMsg || "", segmentoId: c.segmentoId || "", templateId: c.templateId || "", intervaloSegundos: c.intervaloSegundos || 3 });
    setModal("editar");
  };

  const salvar = async () => {
    if (!f.nome.trim()) return showToast("Dê um nome", "warn");
    if (f.canal === "WhatsApp" && !f.templateId) return showToast("Escolha um template", "warn");
    setSalvando(true);
    try {
      const { id, segmentoId, ...dadosApi } = f;
      const payload = { ...dadosApi, templateId: dadosApi.templateId || null, responsavel };
      if (id) {
        await onAtualizarCampanha(id, { ...payload, status: "Ativa", inicio: campanhas.find((c) => c.id === id)?.inicio }, segmentoId || null);
        showToast("Campanha atualizada", "ok");
      } else {
        await onCriarCampanha({ ...payload, status: "Ativa", inicio: new Date().toLocaleDateString("pt-BR") }, segmentoId || null);
        showToast("Campanha criada", "ok");
      }
      setModal(null);
    } catch (e) {
      showToast(e.message || "Erro ao salvar campanha", "warn");
    } finally {
      setSalvando(false);
    }
  };

  const duplicar = async (c) => {
    try {
      await onCriarCampanha({
        nome: `${c.nome} (cópia)`, objetivo: c.objetivo, canal: c.canal, emailMsg: c.emailMsg || "",
        templateId: c.templateId || null, responsavel, status: "Ativa", inicio: new Date().toLocaleDateString("pt-BR"),
        intervaloSegundos: c.intervaloSegundos || 3,
      }, c.segmentoId || null);
      showToast("Campanha duplicada", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao duplicar campanha", "warn");
    }
  };

  const excluir = async (c) => {
    try {
      await onExcluirCampanha(c.id);
      showToast("Campanha removida", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover campanha", "warn");
    }
  };

  const arquivar = async (c) => {
    try {
      await onArquivarCampanha(c.id, !c.arquivado);
      showToast(c.arquivado ? "Campanha reativada" : "Campanha arquivada", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao arquivar campanha", "warn");
    }
  };

  const addObj = () => {
    const o = novoObj.trim();
    if (!o || objetivos.includes(o)) return;
    setObjetivos((x) => [...x, o]);
    setF((x) => ({ ...x, objetivo: o }));
    setNovoObj("");
    showToast("Objetivo criado", "ok");
  };

  const lista = campanhas.filter((c) => {
    if (!!c.arquivado !== verArquivadas) return false;
    if (fObjetivo !== "Todos" && c.objetivo !== fObjetivo) return false;
    return true;
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={s.toolbar}>
        <Select value={fObjetivo} onChange={setFObjetivo} options={["Todos", ...objetivos]} />
        <div style={s.toggle}>
          <button style={{ ...s.toggleBtn, ...(!verArquivadas ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivadas(false)}>Ativas</button>
          <button style={{ ...s.toggleBtn, ...(verArquivadas ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivadas(true)}>Arquivadas</button>
        </div>
        <div style={{ flex: 1 }} />
        <button style={s.btnPrimarySm} onClick={abrirNovo}>+ Nova campanha</button>
      </div>
      {!lista.length && <Card><div style={{ textAlign: "center", padding: 20, color: T.inkSoft }}>{verArquivadas ? "Nenhuma campanha arquivada." : "Nenhuma campanha ativa. Crie a primeira."}</div></Card>}
      <div style={s.cardGrid}>
        {lista.map((c) => (
          <div key={c.id} style={{ ...s.campCard, display: "flex", flexDirection: "column", opacity: c.arquivado ? .7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ ...s.objTag, background: T.primarySoft, color: T.primaryDark }}>{c.objetivo}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ ...s.tagOk, background: c.canal === "Email" ? "#EDEBFF" : "#E1F4F0", color: c.canal === "Email" ? "#5B4CE0" : "#0E9484" }}>{c.canal}</span>
                <DotMenu
                  items={[
                    { label: "Editar", onClick: () => abrirEdicao(c) },
                    { label: "Duplicar", onClick: () => duplicar(c) },
                    { label: c.arquivado ? "Reativar" : "Arquivar", onClick: () => arquivar(c) },
                    { label: "Excluir", danger: true, onClick: () => excluir(c) },
                  ]}
                />
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.ink, margin: "12px 0 4px" }}>{c.nome}</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>{c.responsavel} · {c.inicio}</div>
            <div style={{ display: "grid", gap: 4, marginTop: 4, flex: 1 }}>
              {c.segmentoId && <div style={{ fontSize: 11.5, color: T.primary, fontWeight: 600 }}>Segmentação: {segmentos.find((sg) => sg.id === c.segmentoId)?.nome || "—"}</div>}
              {c.templateId && <div style={{ fontSize: 11.5, color: T.inkSoft }}>Template: {templates.find((t) => t.id === c.templateId)?.nome || "—"}</div>}
              {c.atualizadoEm && <div style={{ fontSize: 10.5, color: T.inkSoft }}>Editado em {dataHora(c.atualizadoEm)}</div>}
            </div>
            <button onClick={() => onDisparar(c)} style={{ ...s.btnWa, marginTop: 14, width: "100%", justifyContent: "center" }}><IconSend color="#fff" /> Disparar campanha</button>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={f.id ? "Editar campanha" : "Nova campanha"} onClose={() => setModal(null)}>
          <Field label="Nome da campanha"><input style={s.input} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex: Reativação Agosto" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Canal"><Select block value={f.canal} onChange={(v) => setF({ ...f, canal: v })} options={["WhatsApp", "Email"]} /></Field>
            <Field label="Responsável"><input style={{ ...s.input, background: T.lineSoft, color: T.inkSoft }} value={responsavel} disabled /></Field>
          </div>
          <Field label="Objetivo">
            <Select block value={f.objetivo} onChange={(v) => setF({ ...f, objetivo: v })} options={objetivos} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={{ ...s.input, height: 38 }} placeholder="Criar novo objetivo..." value={novoObj} onChange={(e) => setNovoObj(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addObj()} />
              <button style={s.btnGhostSm} onClick={addObj}>+ Add</button>
            </div>
          </Field>
          <Field label="Segmentação (opcional)">
            <select
              style={{ ...s.select, width: "100%" }}
              value={f.segmentoId || ""}
              onChange={(e) => setF({ ...f, segmentoId: e.target.value ? Number(e.target.value) : "" })}
            >
              <option value="">Sem segmentação (toda a base elegível)</option>
              {segmentos.filter((sg) => !sg.arquivado || sg.id === f.segmentoId).map((sg) => <option key={sg.id} value={sg.id}>{sg.nome}</option>)}
            </select>
            <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>
              {f.segmentoId ? `Disparo restrito à segmentação "${segmentos.find((sg) => sg.id === f.segmentoId)?.nome}".` : "Sem segmentação: dispara pra toda a base elegível."}
            </div>
          </Field>
          {f.canal === "Email" && (
            <Field label="Mensagem de email (não personalizada nesta fase)">
              <textarea style={s.textarea} rows={3} value={f.emailMsg} onChange={(e) => setF({ ...f, emailMsg: e.target.value })} placeholder="Texto simples do email..." />
            </Field>
          )}
          {f.canal === "WhatsApp" && (
            <Field label="Template">
              <select
                style={{ ...s.select, width: "100%" }}
                value={f.templateId || ""}
                onChange={(e) => setF({ ...f, templateId: e.target.value ? Number(e.target.value) : "" })}
              >
                <option value="">Selecione um template ativo...</option>
                {ativos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              {!ativos.length && <div style={{ fontSize: 11.5, color: T.coral, marginTop: 6 }}>Nenhum template ativo — crie um na aba Templates.</div>}
            </Field>
          )}
          {f.canal === "WhatsApp" && (
            <Field label="Intervalo entre envios (segundos)">
              <input
                type="number" min={1} max={30} style={{ ...s.input, maxWidth: 120 }}
                value={f.intervaloSegundos}
                onChange={(e) => setF({ ...f, intervaloSegundos: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
              />
              <div style={{ fontSize: 11.5, color: T.inkSoft, marginTop: 6 }}>
                Pausa entre uma mensagem e outra. Recomendado: 3s ou mais — rajadas sem
                intervalo aumentam o risco do número ser marcado como spam pelo WhatsApp.
              </div>
            </Field>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1, opacity: salvando ? .6 : 1 }} onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : f.id ? "Salvar alterações" : "Criar campanha"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
