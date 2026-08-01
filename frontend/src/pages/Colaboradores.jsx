import { useState } from "react";
import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";

// TODO(backend): CRUD de colaboradores/usuários deve virar parte do módulo de
// auth do Spring Boot (tabela usuarios), com senha com hash (BCrypt) — nunca
// mantenha senha em texto puro como neste protótipo em memória.
export function Colaboradores({ colaboradores, setColaboradores, showToast }) {
  const [modal, setModal] = useState(null);

  const salvar = (c) => {
    if (!c.nome.trim()) return showToast("Informe o nome", "warn");
    setColaboradores((l) => {
      const ex = l.find((x) => x.id === c.id);
      return ex ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c];
    });
    setModal(null);
    showToast("Colaborador salvo", "ok");
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={s.btnPrimarySm} onClick={() => setModal({ id: Date.now(), nome: "", cpf: "", funcao: "Recepção", email: "", senha: "" })}>+ Adicionar colaborador</button>
      </div>
      <Card noPad>
        <div style={s.tableScroll}>
          <table style={s.table}>
            <thead><tr><th style={s.thL}>Nome</th><th style={s.th}>Função</th><th style={s.th}>CPF</th><th style={s.th}>Email</th><th style={s.th}></th></tr></thead>
            <tbody>
              {colaboradores.map((c) => (
                <tr key={c.id}>
                  <td style={s.tdL}><b style={{ color: T.ink }}>{c.nome}</b></td>
                  <td style={s.td}><span style={s.objTag}>{c.funcao}</span></td>
                  <td style={s.tdNum}>{c.cpf || "—"}</td>
                  <td style={s.tdNum}>{c.email || "—"}</td>
                  <td style={s.td}><button style={s.btnGhostSm} onClick={() => setModal({ ...c })}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {modal && (
        <Modal title={modal.nome ? "Editar colaborador" : "Novo colaborador"} onClose={() => setModal(null)}>
          <Field label="Nome completo"><input style={s.input} value={modal.nome} onChange={(e) => setModal({ ...modal, nome: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="CPF"><input style={s.input} value={modal.cpf} onChange={(e) => setModal({ ...modal, cpf: e.target.value })} placeholder="000.000.000-00" /></Field>
            <Field label="Função"><Select block value={modal.funcao} onChange={(v) => setModal({ ...modal, funcao: v })} options={["Recepção", "Comercial", "Dentista", "Gestor", "Marketing"]} /></Field>
            <Field label="Email"><input style={s.input} value={modal.email} onChange={(e) => setModal({ ...modal, email: e.target.value })} /></Field>
            <Field label="Senha"><input style={s.input} type="password" value={modal.senha || ""} onChange={(e) => setModal({ ...modal, senha: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
            <button style={{ ...s.btnPrimary, flex: 1 }} onClick={() => salvar(modal)}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
