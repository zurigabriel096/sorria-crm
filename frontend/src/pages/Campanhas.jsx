import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { IconSend } from "../components/icons";

export function Campanhas({ campanhas, onCriarCampanha, templates, objetivos, setObjetivos, segmentos, onDisparar, showToast, usuario }) {
  const responsavel = usuario?.nome || "Você";
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [f, setF] = useState({ nome: "", objetivo: "Reativação", canal: "WhatsApp", emailMsg: "", segmentoId: "" });
  const [novoObj, setNovoObj] = useState("");

  const criar = async () => {
    if (!f.nome.trim()) return showToast("Dê um nome", "warn");
    setSalvando(true);
    try {
      const { segmentoId, ...dadosApi } = f;
      await onCriarCampanha({ ...dadosApi, responsavel, status: "Ativa", inicio: new Date().toLocaleDateString("pt-BR") }, segmentoId || null);
      setModal(false);
      setF({ ...f, nome: "", segmentoId: "" });
      showToast("Campanha criada", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao criar campanha", "warn");
    } finally {
      setSalvando(false);
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

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={s.btnPrimarySm} onClick={() => setModal(true)}>+ Nova campanha</button>
      </div>
      {!campanhas.length && <Card><div style={{ textAlign: "center", padding: 20, color: T.inkSoft }}>Nenhuma campanha ainda. Crie a primeira.</div></Card>}
      <div style={s.cardGrid}>
        {campanhas.map((c) => (
          <div key={c.id} style={{ ...s.campCard, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ ...s.objTag, background: T.primarySoft, color: T.primaryDark }}>{c.objetivo}</span>
              <span style={{ ...s.tagOk, background: c.canal === "Email" ? "#EDEBFF" : "#E1F4F0", color: c.canal === "Email" ? "#5B4CE0" : "#0E9484" }}>{c.canal}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.ink, margin: "12px 0 4px" }}>{c.nome}</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft, flex: 1 }}>{c.responsavel} · {c.inicio}</div>
            {c.segmentoId && <div style={{ fontSize: 11.5, color: T.primary, fontWeight: 600, marginTop: 2 }}>Segmentação: {segmentos.find((sg) => sg.id === c.segmentoId)?.nome || "—"}</div>}
            <button onClick={() => onDisparar(c)} style={{ ...s.btnWa, marginTop: 16, width: "100%", justifyContent: "center" }}><IconSend color="#fff" /> Disparar campanha</button>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title="Nova campanha" onClose={() => setModal(false)}>
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
              {segmentos.map((sg) => <option key={sg.id} value={sg.id}>{sg.nome}</option>)}
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
          {f.canal === "WhatsApp" && <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 12 }}>O template do WhatsApp você escolhe na hora do disparo, entre os templates ativos.</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setModal(false)}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1, opacity: salvando ? .6 : 1 }} onClick={criar} disabled={salvando}>{salvando ? "Criando..." : "Criar campanha"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
