import { useState } from "react";
import { s } from "../styles/s";
import { T } from "../theme";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useArrastarHorizontal } from "../utils/arrastarHorizontal";

const FRASE_CONFIRMACAO = "LIMPAR HISTORICO";

export function HistoricoDisparos({ historico, patients, onAbrirPaciente, usuario, onLimparHistorico, showToast }) {
  const souAdmin = usuario?.papel === "ADMIN";
  const arrasteTabela = useArrastarHorizontal();
  const [confirmando, setConfirmando] = useState(null); // null | {frase}
  const [limpando, setLimpando] = useState(false);

  const abrir = (h) => {
    const paciente = patients.find((p) => p.id === h.contatoId);
    if (paciente) onAbrirPaciente(paciente, "historico");
  };

  const confirmarLimpeza = async () => {
    if (confirmando.frase !== FRASE_CONFIRMACAO) {
      return showToast("Frase de confirmação não bate", "warn");
    }
    setLimpando(true);
    try {
      await onLimparHistorico();
      showToast("Histórico de disparo limpo", "ok");
      setConfirmando(null);
    } catch (e) {
      showToast(e.message || "Erro ao limpar histórico", "warn");
    } finally {
      setLimpando(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {souAdmin && !!historico.length && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button style={{ ...s.btnGhostSm, color: T.coral }} onClick={() => setConfirmando({ frase: "" })}>Limpar histórico</button>
        </div>
      )}
      {!historico.length ? (
        <Card><div style={{ textAlign: "center", padding: 24, color: T.inkSoft }}>Nenhum disparo ainda.</div></Card>
      ) : (
        <Card noPad>
          <div ref={arrasteTabela.ref} style={{ ...s.tableScroll, ...arrasteTabela.style }} {...arrasteTabela.props}>
            <table style={s.table}>
              <thead><tr><th style={s.thL}>Lead</th><th style={s.th}>Campanha</th><th style={s.th}>Status</th><th style={s.th}>Data</th></tr></thead>
              <tbody>
                {historico.map((h, i) => (
                  <tr key={i} className="prow" onClick={() => abrir(h)}>
                    <td style={s.tdL}><b style={{ color: T.primary }}>{h.nome}</b></td>
                    <td style={s.td}><span style={{ fontSize: 12.5, color: T.inkSoft }}>{h.campanha}</span></td>
                    <td style={s.td}><StatusBadge status={h.status} /></td>
                    <td style={s.tdNum}>{h.hora}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {confirmando && (
        <Modal title="Limpar histórico de disparo" onClose={() => setConfirmando(null)}>
          <div style={{ fontSize: 13, color: T.coral, fontWeight: 700, marginBottom: 10 }}>
            Atenção: isso apaga TODO o histórico de disparo (CRM e prospects fora do CRM), pra sempre. Não pode ser desfeito.
          </div>
          <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 10 }}>
            Pra confirmar, digite <code style={{ fontWeight: 700, color: T.ink }}>{FRASE_CONFIRMACAO}</code> abaixo:
          </div>
          <input
            style={s.input}
            value={confirmando.frase}
            onChange={(e) => setConfirmando({ frase: e.target.value })}
            placeholder={FRASE_CONFIRMACAO}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ ...s.btnGhost, flex: 1 }} onClick={() => setConfirmando(null)}>Cancelar</button>
            <button
              style={{ ...s.btnPrimary, flex: 1, background: T.coral, opacity: (limpando || confirmando.frase !== FRASE_CONFIRMACAO) ? .5 : 1 }}
              onClick={confirmarLimpeza}
              disabled={limpando || confirmando.frase !== FRASE_CONFIRMACAO}
            >
              {limpando ? "Limpando..." : "Limpar histórico"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
