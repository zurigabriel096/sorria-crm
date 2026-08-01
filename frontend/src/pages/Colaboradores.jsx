import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";
import { PAPEL_LABEL, PAPEIS } from "../utils/usuario";

// Colaborador = usuário com login real (tabela "usuarios" no backend). O dentista não
// entra aqui de propósito: não usa o sistema, não tem papel/acesso.
export function Colaboradores({ colaboradores, onCriar, onAtualizar, onExcluir, usuario, showToast }) {
  const [modal, setModal] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const souAdmin = usuario?.papel === "ADMIN";
  const souGestorOuAdmin = souAdmin || usuario?.papel === "GESTOR";

  const abrirNovo = () => setModal({ nome: "", cpf: "", papel: "RECEPCAO", email: "", senha: "" });
  const abrirEdicao = (c) => setModal({ ...c, senha: "" });

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
        <div style={s.tableScroll}>
          <table style={s.table}>
            <thead><tr><th style={s.thL}>Nome</th><th style={s.th}>Função</th><th style={s.th}>CPF</th><th style={s.th}>Email</th><th style={s.th}></th></tr></thead>
            <tbody>
              {colaboradores.map((c) => (
                <tr key={c.id}>
                  <td style={s.tdL}><b style={{ color: T.ink }}>{c.nome}</b></td>
                  <td style={s.td}><span style={s.objTag}>{PAPEL_LABEL[c.papel] || c.papel}</span></td>
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
      {modal && (
        <Modal title={modal.id ? "Editar colaborador" : "Novo colaborador"} onClose={() => setModal(null)}>
          <Field label="Nome completo"><input style={s.input} value={modal.nome} onChange={(e) => setModal({ ...modal, nome: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="CPF"><input style={s.input} value={modal.cpf || ""} onChange={(e) => setModal({ ...modal, cpf: e.target.value })} placeholder="000.000.000-00" /></Field>
            <Field label="Função (acesso ao sistema)">
              <Select block value={modal.papel} onChange={(v) => setModal({ ...modal, papel: v })} options={PAPEIS} labels={PAPEL_LABEL} />
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
