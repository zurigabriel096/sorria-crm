import { useEffect, useRef, useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { dataHora } from "../utils/format";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { GuiaVariaveis } from "../components/ui/GuiaVariaveis";
import { createTemplate, updateTemplate, deleteTemplate, archiveTemplate, testarDisparoTemplate } from "../api/campaigns";
import { listNumeros } from "../api/whatsappNumeros";

const NUMERO_PRINCIPAL = "";

export function Templates({ templates, setTemplates, objetivos, objetivoObjetos, onCriarObjetivo, onExcluirObjetivo, usuario, showToast }) {
  const [modal, setModal] = useState(null);
  const [fCat, setFCat] = useState("Todas");
  const [fCampanha, setFCampanha] = useState("Todas");
  const [verArquivados, setVerArquivados] = useState(false);
  const [testando, setTestando] = useState(null); // null | {tpl, telefone, whatsappNumeroId, enviando}
  const [numeros, setNumeros] = useState([]);
  useEffect(() => { listNumeros().then(setNumeros).catch(() => setNumeros([])); }, []);

  const abrirTeste = (tpl) => setTestando({ tpl, telefone: "", whatsappNumeroId: NUMERO_PRINCIPAL, enviando: false });

  const enviarTeste = async () => {
    if (!testando.telefone.trim()) return showToast("Digite o número de telefone", "warn");
    setTestando((x) => ({ ...x, enviando: true }));
    try {
      const { status } = await testarDisparoTemplate(testando.tpl.id, testando.telefone.trim(), testando.whatsappNumeroId || null);
      if (status === "Entregue") {
        showToast("Teste enviado", "ok");
        setTestando(null);
      } else {
        showToast(`Envio retornou "${status}" — confira o número/instância`, "warn");
        setTestando((x) => ({ ...x, enviando: false }));
      }
    } catch (e) {
      showToast(e.message || "Erro ao enviar teste", "warn");
      setTestando((x) => ({ ...x, enviando: false }));
    }
  };

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

  const arquivar = async (t) => {
    try {
      const atualizado = await archiveTemplate(t.id, !t.arquivado);
      setTemplates((ts) => ts.map((x) => (x.id === t.id ? atualizado : x)));
      showToast(t.arquivado ? "Template reativado" : "Template arquivado", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao arquivar template", "warn");
    }
  };

  const lista = templates.filter((t) => {
    if (!!t.arquivado !== verArquivados) return false;
    if (fCat !== "Todas" && t.categoria !== fCat) return false;
    if (fCampanha !== "Todas" && t.campanha !== fCampanha) return false;
    return true;
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={s.toolbar}>
        <Select value={fCat} onChange={setFCat} options={["Todas", "Utilidade", "Marketing", "Autenticação"]} labels={{ "Autenticação": "Autenticação (em breve)" }} />
        <Select value={fCampanha} onChange={setFCampanha} options={["Todas", ...objetivos]} />
        <div style={s.toggle}>
          <button style={{ ...s.toggleBtn, ...(!verArquivados ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivados(false)}>Ativos</button>
          <button style={{ ...s.toggleBtn, ...(verArquivados ? { background: "#fff", color: T.ink } : {}) }} onClick={() => setVerArquivados(true)}>Arquivados</button>
        </div>
        <div style={{ flex: 1 }} />
        <button style={s.btnPrimarySm} onClick={() => setModal({ id: null, nome: "", categoria: "Utilidade", campanha: objetivos[0], corpo: "", imagem: "", ativo: true })}>+ Novo template</button>
      </div>
      {!lista.length && <Card><div style={{ textAlign: "center", padding: 20, color: T.inkSoft }}>{verArquivados ? "Nenhum template arquivado." : "Nenhum template ativo."}</div></Card>}
      <div style={s.cardGrid}>
        {lista.map((t) => (
          <div key={t.id} style={{ ...s.campCard, opacity: t.arquivado ? .7 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ ...s.objTag, background: t.categoria === "Marketing" ? "#FCEFD9" : "#E1F4F0", color: t.categoria === "Marketing" ? T.gold : "#0E9484" }}>{t.categoria}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={t.ativo ? s.tagOk : s.tagMuted}>{t.ativo ? "Ativo" : "Inativo"}</span>
                <DotMenu
                  items={[
                    { label: "Editar", onClick: () => setModal({ ...t }) },
                    { label: "Testar disparo", onClick: () => abrirTeste(t) },
                    { label: "Duplicar", onClick: () => duplicar(t) },
                    { label: t.arquivado ? "Reativar" : "Arquivar", onClick: () => arquivar(t) },
                    { label: "Excluir", danger: true, onClick: () => excluir(t) },
                  ]}
                />
              </div>
            </div>
            <div style={{ fontWeight: 700, color: T.ink, margin: "10px 0 4px" }}>{t.nome}</div>
            {t.imagem && <div style={{ height: 90, borderRadius: 8, background: `#eee url(${t.imagem}) center/cover`, marginBottom: 8 }} />}
            <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.45 }}>{t.corpo}</div>
            <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 6 }}>{t.corpo.length} caracteres</div>
            {t.atualizadoEm && <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 6 }}>Editado em {dataHora(t.atualizadoEm)}</div>}
          </div>
        ))}
      </div>
      {modal && (
        <TemplateEditor
          tpl={modal}
          objetivos={objetivos}
          objetivoObjetos={objetivoObjetos}
          onCriarObjetivo={onCriarObjetivo}
          onExcluirObjetivo={onExcluirObjetivo}
          souAdmin={usuario?.papel === "ADMIN"}
          showToast={showToast}
          onSave={salvar}
          onClose={() => setModal(null)}
        />
      )}
      {testando && (
        <Modal title={`Testar disparo — ${testando.tpl.nome}`} onClose={() => setTestando(null)}>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 14 }}>
            Manda esse template pro número abaixo agora mesmo, sem precisar de nenhum lead cadastrado ("{"{nome}"}" vira "Teste").
          </div>
          <Field label="De qual número você quer testar?">
            <Select
              block
              value={testando.whatsappNumeroId}
              onChange={(v) => setTestando({ ...testando, whatsappNumeroId: v })}
              options={[NUMERO_PRINCIPAL, ...numeros.map((n) => String(n.id))]}
              labels={{ [NUMERO_PRINCIPAL]: "Número principal", ...Object.fromEntries(numeros.map((n) => [String(n.id), n.nome])) }}
            />
          </Field>
          <Field label="Telefone de destino (com DDD)">
            <input
              style={s.input}
              placeholder="12988887777"
              value={testando.telefone}
              onChange={(e) => setTestando({ ...testando, telefone: e.target.value })}
              autoFocus
            />
          </Field>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setTestando(null)}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1, opacity: testando.enviando ? .6 : 1 }} onClick={enviarTeste} disabled={testando.enviando}>
              {testando.enviando ? "Enviando..." : "Enviar teste"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Botões de formatação do WhatsApp (negrito *texto*, itálico _texto_, tachado
// ~texto~, citação "> texto") - aparecem numa janelinha flutuante perto da
// seleção, igual editores tipo Notion/Medium, em vez de precisar decorar a
// sintaxe do WhatsApp.
function ToolbarFormatacao({ x, y, onAplicar }) {
  const btn = { width: 30, height: 30, borderRadius: 6, color: "#fff", fontSize: 14, fontWeight: 700, display: "grid", placeItems: "center" };
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, transform: "translate(-50%, calc(-100% - 8px))",
        background: T.ink, borderRadius: 10, padding: 4, display: "flex", gap: 2,
        boxShadow: "0 8px 22px rgba(0,0,0,.28)", zIndex: 50,
      }}
    >
      <button style={btn} title="Negrito" onMouseDown={(e) => e.preventDefault()} onClick={() => onAplicar("negrito")}>B</button>
      <button style={{ ...btn, fontStyle: "italic" }} title="Itálico" onMouseDown={(e) => e.preventDefault()} onClick={() => onAplicar("italico")}>I</button>
      <button style={{ ...btn, textDecoration: "line-through" }} title="Tachado" onMouseDown={(e) => e.preventDefault()} onClick={() => onAplicar("tachado")}>S</button>
      <button style={btn} title="Citação" onMouseDown={(e) => e.preventDefault()} onClick={() => onAplicar("citacao")}>”</button>
    </div>
  );
}

function TemplateEditor({ tpl, objetivos, objetivoObjetos, onCriarObjetivo, onExcluirObjetivo, souAdmin, showToast, onSave, onClose }) {
  const [t, setT] = useState(tpl);
  const [novoObj, setNovoObj] = useState("");
  const set = (k, v) => setT((x) => ({ ...x, [k]: v }));

  // Mesmo padrao de "criar novo objetivo" ja usado em Campanhas.jsx - agora
  // persiste no backend (antes so existia no estado local do frontend e se
  // perdia a cada reload).
  const addObj = async () => {
    const o = novoObj.trim();
    if (!o || objetivos.includes(o)) return;
    try {
      await onCriarObjetivo(o);
      set("campanha", o);
      setNovoObj("");
    } catch (e) {
      showToast(e.message || "Erro ao criar objetivo", "warn");
    }
  };

  const excluirObj = async (obj) => {
    if (!confirm(`Excluir o objetivo "${obj.nome}"?`)) return;
    try {
      await onExcluirObjetivo(obj.id);
      if (t.campanha === obj.nome) set("campanha", "");
    } catch (e) {
      showToast(e.message || "Erro ao excluir objetivo", "warn");
    }
  };
  const imgFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => set("imagem", r.result);
    r.readAsDataURL(f);
  };

  const areaRef = useRef(null);
  const [toolbar, setToolbar] = useState(null);

  const detectarSelecao = (e) => {
    const el = areaRef.current;
    if (!el || el.selectionStart === el.selectionEnd) { setToolbar(null); return; }
    const rect = el.getBoundingClientRect();
    setToolbar({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const aplicarFormato = (tipo) => {
    const el = areaRef.current;
    const { selectionStart: start, selectionEnd: end } = el;
    if (start === end) return;
    const texto = t.corpo || "";
    const selecionado = texto.slice(start, end);
    let novoSelecionado, deslocInicio;
    if (tipo === "citacao") {
      novoSelecionado = selecionado.split("\n").map((l) => `> ${l}`).join("\n");
      deslocInicio = 2;
    } else {
      const marcador = tipo === "negrito" ? "*" : tipo === "italico" ? "_" : "~";
      novoSelecionado = `${marcador}${selecionado}${marcador}`;
      deslocInicio = marcador.length;
    }
    set("corpo", texto.slice(0, start) + novoSelecionado + texto.slice(end));
    setToolbar(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + deslocInicio, start + deslocInicio + selecionado.length);
    });
  };

  return (
    <Modal title="Template de WhatsApp" onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Nome do template"><input style={s.input} value={t.nome} onChange={(e) => set("nome", e.target.value)} placeholder="ex: anti_no_show" /></Field>
        <Field label="Categoria">
          <Select block value={t.categoria} onChange={(v) => set("categoria", v)} options={["Utilidade", "Marketing", "Autenticação"]} labels={{ "Autenticação": "Autenticação (em desenvolvimento)" }} disabledOptions={["Autenticação"]} />
        </Field>
        <Field label="Campanha / filtro">
          <Select block value={t.campanha} onChange={(v) => set("campanha", v)} options={objetivos} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input style={{ ...s.input, height: 38 }} placeholder="Criar novo objetivo..." value={novoObj} onChange={(e) => setNovoObj(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addObj()} />
            <button style={s.btnGhostSm} onClick={addObj}>+ Add</button>
          </div>
          {souAdmin && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {objetivoObjetos.map((obj) => (
                <span key={obj.id} style={{ ...s.objTag, background: T.lineSoft, color: T.inkSoft, display: "flex", alignItems: "center", gap: 5 }}>
                  {obj.nome}
                  <span onClick={() => excluirObj(obj)} style={{ cursor: "pointer", fontWeight: 700 }} title="Excluir objetivo">×</span>
                </span>
              ))}
            </div>
          )}
        </Field>
        <Field label="Status"><Select block value={t.ativo ? "Ativo" : "Inativo"} onChange={(v) => set("ativo", v === "Ativo")} options={["Ativo", "Inativo"]} /></Field>
      </div>
      <Field label={
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{`Corpo da mensagem (${t.corpo.length} caracteres — ideal ≤135)`}</span>
          <GuiaVariaveis textareaRef={areaRef} valor={t.corpo} onMudar={(v) => set("corpo", v)} />
        </span>
      }>
        <div style={{ position: "relative" }}>
          <textarea
            ref={areaRef}
            style={{ ...s.textarea, borderColor: t.corpo.length > 135 ? T.coral : T.line }}
            rows={3}
            value={t.corpo}
            onChange={(e) => set("corpo", e.target.value)}
            onMouseUp={detectarSelecao}
            onBlur={() => setToolbar(null)}
            placeholder="Use {nome}..."
          />
          {toolbar && <ToolbarFormatacao x={toolbar.x} y={toolbar.y} onAplicar={aplicarFormato} />}
        </div>
      </Field>
      <Field label="Imagem do template (opcional)">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input style={{ ...s.input, height: 38 }} placeholder="URL da imagem" value={t.imagem?.startsWith("data:") ? "(arquivo carregado)" : t.imagem} onChange={(e) => set("imagem", e.target.value)} />
          <label style={{ ...s.btnGhostSm, cursor: "pointer" }}>Upload<input type="file" accept="image/*" style={{ display: "none" }} onChange={imgFile} /></label>
        </div>
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex: 1 }} onClick={() => onSave(t)}>Salvar template</button>
      </div>
    </Modal>
  );
}
