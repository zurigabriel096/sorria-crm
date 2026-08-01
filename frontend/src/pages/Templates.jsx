import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { createTemplate, updateTemplate, deleteTemplate } from "../api/campaigns";

export function Templates({ templates, setTemplates, objetivos, showToast }) {
  const [modal, setModal] = useState(null);
  const [fCat, setFCat] = useState("Todas");

  const salvar = async (tpl) => {
    if (!tpl.nome.trim()) return showToast("Dê um nome ao template", "warn");
    try {
      const salvo = tpl.id == null ? await createTemplate(tpl) : await updateTemplate(tpl.id, tpl);
      setTemplates((t) => {
        const ex = t.find((x) => x.id === salvo.id);
        return ex ? t.map((x) => (x.id === salvo.id ? salvo : x)) : [salvo, ...t];
      });
      setModal(null);
      showToast("Template salvo", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar template", "warn");
    }
  };

  const duplicar = async (t) => {
    try {
      const copia = await createTemplate({ ...t, id: null, nome: `${t.nome} (cópia)` });
      setTemplates((ts) => [copia, ...ts]);
      showToast("Template duplicado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao duplicar template", "warn");
    }
  };

  const excluir = async (t) => {
    try {
      await deleteTemplate(t.id);
      setTemplates((ts) => ts.filter((x) => x.id !== t.id));
      showToast("Template removido", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover template", "warn");
    }
  };

  const lista = templates.filter((t) => fCat === "Todas" || t.categoria === fCat);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={s.toolbar}>
        <Select value={fCat} onChange={setFCat} options={["Todas", "Utilidade", "Marketing", "Autenticação"]} />
        <div style={{ flex: 1 }} />
        <button style={s.btnPrimarySm} onClick={() => setModal({ id: null, nome: "", categoria: "Utilidade", campanha: objetivos[0], corpo: "", imagem: "", ativo: true })}>+ Novo template</button>
      </div>
      <div style={s.cardGrid}>
        {lista.map((t) => (
          <div key={t.id} style={s.campCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ ...s.objTag, background: t.categoria === "Marketing" ? "#FCEFD9" : "#E1F4F0", color: t.categoria === "Marketing" ? T.gold : "#0E9484" }}>{t.categoria}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={t.ativo ? s.tagOk : s.tagMuted}>{t.ativo ? "Ativo" : "Inativo"}</span>
                <DotMenu
                  items={[
                    { label: "Editar", onClick: () => setModal({ ...t }) },
                    { label: "Duplicar", onClick: () => duplicar(t) },
                    { label: "Excluir", danger: true, onClick: () => excluir(t) },
                  ]}
                />
              </div>
            </div>
            <div style={{ fontWeight: 700, color: T.ink, margin: "10px 0 4px" }}>{t.nome}</div>
            {t.imagem && <div style={{ height: 90, borderRadius: 8, background: `#eee url(${t.imagem}) center/cover`, marginBottom: 8 }} />}
            <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.45 }}>{t.corpo}</div>
            <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 6 }}>{t.corpo.length} caracteres</div>
          </div>
        ))}
      </div>
      {modal && <TemplateEditor tpl={modal} objetivos={objetivos} onSave={salvar} onClose={() => setModal(null)} />}
    </div>
  );
}

function TemplateEditor({ tpl, objetivos, onSave, onClose }) {
  const [t, setT] = useState(tpl);
  const set = (k, v) => setT((x) => ({ ...x, [k]: v }));
  const imgFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => set("imagem", r.result);
    r.readAsDataURL(f);
  };

  return (
    <Modal title="Template de WhatsApp" onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Nome do template"><input style={s.input} value={t.nome} onChange={(e) => set("nome", e.target.value)} placeholder="ex: anti_no_show" /></Field>
        <Field label="Categoria"><Select block value={t.categoria} onChange={(v) => set("categoria", v)} options={["Utilidade", "Marketing", "Autenticação"]} /></Field>
        <Field label="Campanha / filtro"><Select block value={t.campanha} onChange={(v) => set("campanha", v)} options={objetivos} /></Field>
        <Field label="Status"><Select block value={t.ativo ? "Ativo" : "Inativo"} onChange={(v) => set("ativo", v === "Ativo")} options={["Ativo", "Inativo"]} /></Field>
      </div>
      <Field label={`Corpo da mensagem (${t.corpo.length} caracteres — ideal ≤135)`}>
        <textarea style={{ ...s.textarea, borderColor: t.corpo.length > 135 ? T.coral : T.line }} rows={3} value={t.corpo} onChange={(e) => set("corpo", e.target.value)} placeholder="Use {nome}, {data}, {hora}..." />
      </Field>
      <Field label="Imagem do template (opcional)">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input style={{ ...s.input, height: 38 }} placeholder="URL da imagem" value={t.imagem?.startsWith("data:") ? "(arquivo carregado)" : t.imagem} onChange={(e) => set("imagem", e.target.value)} />
          <label style={{ ...s.btnGhostSm, cursor: "pointer" }}>Upload<input type="file" accept="image/*" style={{ display: "none" }} onChange={imgFile} /></label>
        </div>
      </Field>
      <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>O WhatsApp não permite botões interativos em conexões como a nossa (só na API Business oficial) — por isso o template aqui é só texto.</div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex: 1 }} onClick={() => onSave(t)}>Salvar template</button>
      </div>
    </Modal>
  );
}
