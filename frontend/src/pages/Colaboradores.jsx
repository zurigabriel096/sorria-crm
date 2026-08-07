import { useState } from "react";
import { T, AVATAR_COLORS } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { DotMenu } from "../components/ui/DotMenu";
import { ColorPicker } from "../components/ui/ColorPicker";
import { useArrastarHorizontal } from "../utils/arrastarHorizontal";

// Colaborador = usuário com login real (tabela "usuarios" no backend). O dentista não
// entra aqui de propósito: não usa o sistema, não tem papel/acesso.
export function Colaboradores({
  colaboradores, onCriar, onAtualizar, onExcluir, usuario, showToast,
  papeisCargo, onCriarPapelCargo, onAtualizarPapelCargo, onExcluirPapelCargo,
}) {
  const [modal, setModal] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [funcaoForm, setFuncaoForm] = useState(null); // null | {id, rotulo, cor}
  const souAdmin = usuario?.papel === "ADMIN";
  const arrasteTabela = useArrastarHorizontal();
  const souGestorOuAdmin = souAdmin || usuario?.papel === "GESTOR";
  const rotuloDe = (chave) => papeisCargo.find((p) => p.chave === chave)?.rotulo || chave;
  const corDe = (chave) => papeisCargo.find((p) => p.chave === chave)?.cor || T.inkSoft;

  const abrirNovo = () => setModal({ nome: "", cpf: "", papel: papeisCargo[0]?.chave || "", email: "", senha: "" });
  const abrirEdicao = (c) => setModal({ ...c, senha: "" });

  const abrirNovaFuncao = () => setFuncaoForm({ id: null, rotulo: "", cor: AVATAR_COLORS[papeisCargo.length % AVATAR_COLORS.length] });
  const abrirEdicaoFuncao = (p) => setFuncaoForm({ id: p.id, rotulo: p.rotulo, cor: p.cor });

  const salvarFuncao = async () => {
    if (!funcaoForm.rotulo.trim()) return showToast("Dê um nome pra função", "warn");
    try {
      if (funcaoForm.id) await onAtualizarPapelCargo(funcaoForm.id, { rotulo: funcaoForm.rotulo.trim(), cor: funcaoForm.cor });
      else await onCriarPapelCargo({ rotulo: funcaoForm.rotulo.trim(), cor: funcaoForm.cor });
      setFuncaoForm(null);
      showToast("Função salva", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar função", "warn");
    }
  };

  const excluirFuncao = async (p) => {
    if (!window.confirm(`Excluir a função "${p.rotulo}"? Colaboradores que já tem essa função mantêm o acesso, só não vai mais aparecer pra escolher em novos cadastros.`)) return;
    try {
      await onExcluirPapelCargo(p.id);
      showToast("Função removida", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover função", "warn");
    }
  };

  const salvar = async () => {
    if (!modal.nome.trim()) return showToast("Informe o nome", "warn");
    if (!modal.email.trim()) return showToast("Informe o email", "warn");
    if (!modal.id && !modal.senha.trim()) return showToast("Defina uma senha", "warn");
    setSalvando(true);
    try {
      if (modal.id) await onAtualizar(modal.id, modal);
      else await onCriar(modal);
      setModal(null);
      showToast("Colaborador salvo", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao salvar colaborador", "warn");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (c) => {
    try {
      await onExcluir(c.id);
      showToast("Colaborador removido", "ok");
    } catch (e) {
      showToast(e.message || "Erro ao remover colaborador", "warn");
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {souGestorOuAdmin && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={s.btnPrimarySm} onClick={abrirNovo}>+ Adicionar colaborador</button>
        </div>
      )}
      <Card noPad>
        <div ref={arrasteTabela.ref} style={{ ...s.tableScroll, ...arrasteTabela.style }} {...arrasteTabela.props}>
          <table style={s.table}>
            <thead><tr><th style={s.thL}>Nome</th><th style={s.th}>Função</th><th style={s.th}>CPF</th><th style={s.th}>Email</th><th style={s.th}></th></tr></thead>
            <tbody>
              {colaboradores.map((c) => (
                <tr key={c.id}>
                  <td style={s.tdL}><b style={{ color: T.ink }}>{c.nome}</b></td>
                  <td style={s.td}><span style={{ ...s.objTag, background: `${corDe(c.papel)}22`, color: corDe(c.papel) }}>{rotuloDe(c.papel)}</span></td>
                  <td style={s.tdNum}>{c.cpf || "—"}</td>
                  <td style={s.tdNum}>{c.email || "—"}</td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {souGestorOuAdmin && <button style={s.btnGhostSm} onClick={() => abrirEdicao(c)}>Editar</button>}
                      {souAdmin && <button style={{ ...s.btnGhostSm, color: T.coral }} onClick={() => excluir(c)}>Excluir</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!souAdmin && <div style={{ padding: "10px 20px 16px", fontSize: 12, color: T.inkSoft }}>Só administradores podem excluir colaboradores.</div>}
      </Card>
      {souAdmin && (
        <Card title="Funções">
          <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>
            Cor e nome de cada função — aparecem no badge da tabela acima e no seletor de função do cadastro.
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {papeisCargo.map((p) => (
              <span key={p.id} style={{ ...s.tagChipBig, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: p.cor, flexShrink: 0 }} />
                {p.rotulo}
                <DotMenu items={[
                  { label: "Editar", onClick: () => abrirEdicaoFuncao(p) },
                  { label: "Excluir", danger: true, onClick: () => excluirFuncao(p) },
                ]} />
              </span>
            ))}
          </div>
          {funcaoForm ? (
            <div style={{ border: `1.5px dashed ${T.line}`, borderRadius: 10, padding: 10, display: "grid", gap: 8, maxWidth: 360 }}>
              <input style={s.input} placeholder="Nome da função (ex: Financeiro)" value={funcaoForm.rotulo} onChange={(e) => setFuncaoForm({ ...funcaoForm, rotulo: e.target.value })} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: T.inkSoft }}>Cor:</span>
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFuncaoForm({ ...funcaoForm, cor: c })}
                    style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: funcaoForm.cor === c ? `2px solid ${T.ink}` : "2px solid transparent" }}
                  />
                ))}
                <ColorPicker value={funcaoForm.cor} onChange={(c) => setFuncaoForm({ ...funcaoForm, cor: c })} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setFuncaoForm(null)}>Cancelar</button>
                <button style={{ ...s.btnPrimary, flex: 1 }} onClick={salvarFuncao}>Salvar</button>
              </div>
            </div>
          ) : (
            <button style={s.btnGhostSm} onClick={abrirNovaFuncao}>+ Nova função</button>
          )}
        </Card>
      )}
      {modal && (
        <Modal title={modal.id ? "Editar colaborador" : "Novo colaborador"} onClose={() => setModal(null)}>
          <Field label="Nome completo"><input style={s.input} value={modal.nome} onChange={(e) => setModal({ ...modal, nome: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="CPF"><input style={s.input} value={modal.cpf || ""} onChange={(e) => setModal({ ...modal, cpf: e.target.value })} placeholder="000.000.000-00" /></Field>
            <Field label="Função (acesso ao sistema)">
              <Select block value={modal.papel} onChange={(v) => setModal({ ...modal, papel: v })} options={papeisCargo.map((p) => p.chave)} labels={Object.fromEntries(papeisCargo.map((p) => [p.chave, p.rotulo]))} />
            </Field>
            <Field label="Email (login)"><input style={s.input} value={modal.email} onChange={(e) => setModal({ ...modal, email: e.target.value })} /></Field>
            <Field label={modal.id ? "Nova senha (opcional)" : "Senha"}>
              <input style={s.input} type="password" value={modal.senha || ""} onChange={(e) => setModal({ ...modal, senha: e.target.value })} placeholder={modal.id ? "Deixe em branco pra manter" : ""} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1, opacity: salvando ? .6 : 1 }} onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
