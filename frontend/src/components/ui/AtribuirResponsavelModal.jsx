import { useState } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Modal } from "./Modal";
import { Field } from "./Field";
import { Select } from "./Select";

// Atribuicao individual rapida de responsavel - achado #2 da auditoria de UX
// (06/08/2026): antes so' dava pra trocar responsavel abrindo o cadastro
// completo do lead, clicando em "Editar", achando o campo lá no meio da aba
// "Dados". Usado tanto em Pacientes.jsx (Base de Leads) quanto em
// FilaTrabalho.jsx (Minhas Tarefas) - mesma acao, mesmo componente.
export function AtribuirResponsavelModal({ paciente, colaboradores, onConfirmar, onClose, showToast }) {
  const [colaboradorId, setColaboradorId] = useState(paciente.responsavelId ? String(paciente.responsavelId) : "");
  const [salvando, setSalvando] = useState(false);

  const confirmar = async () => {
    setSalvando(true);
    try {
      await onConfirmar(paciente, colaboradorId ? Number(colaboradorId) : null);
      showToast("Responsável atualizado", "ok");
      onClose();
    } catch (e) {
      showToast(e.message || "Erro ao atribuir responsável", "warn");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal title={`Atribuir responsável — ${paciente.nome}`} onClose={onClose}>
      <Field label="Responsável pelo lead">
        <Select
          block
          value={colaboradorId}
          onChange={setColaboradorId}
          options={["", ...colaboradores.map((c) => String(c.id))]}
          labels={{ "": "Sem responsável (fila compartilhada)", ...Object.fromEntries(colaboradores.map((c) => [String(c.id), c.nome])) }}
        />
      </Field>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button style={{ ...s.btnGhost, flex: 1 }} onClick={onClose}>Cancelar</button>
        <button style={{ ...s.btnPrimary, flex: 1 }} disabled={salvando} onClick={confirmar}>
          {salvando ? "Salvando..." : "Confirmar"}
        </button>
      </div>
    </Modal>
  );
}
