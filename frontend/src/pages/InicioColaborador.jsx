import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";

// Tela inicial pra quem NAO e' ADMIN/GESTOR - em vez de abrir direto no
// Kanban (que vira ilegivel em escala), mostra so o resumo do que precisa
// de atencao e manda pra Fila de Trabalho. ADMIN/GESTOR continuam caindo
// no Painel Executivo (ver App.jsx viewInicialPara).
export function InicioColaborador({ usuario, patients, setView }) {
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = String(usuario?.nome || "").trim().split(/\s+/)[0] || "";

  const agora = Date.now();
  const semResposta = patients.filter((p) => p.ultimaMensagemDirecao === "ENTRADA").length;
  const vencidos = patients.filter((p) => p.proximaAcaoEm && new Date(p.proximaAcaoEm).getTime() < agora).length;
  const hoje = patients.filter((p) => {
    if (!p.proximaAcaoEm) return false;
    const d = new Date(p.proximaAcaoEm);
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }).length;
  const meusLeads = patients.filter((p) => p.responsavelId === usuario?.id).length;

  return (
    <div style={{ display: "grid", gap: 22, maxWidth: 620, margin: "24px auto", textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>{saudacao}{primeiroNome ? `, ${primeiroNome}` : ""}.</div>
        <div style={{ fontSize: 14, color: T.inkSoft, marginTop: 4 }}>Aqui está o que precisa da sua atenção hoje.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <Card>
          <div style={{ fontSize: 32, fontWeight: 800, color: semResposta > 0 ? T.coral : T.primary }}>{semResposta}</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>{semResposta === 1 ? "mensagem sem resposta" : "mensagens sem resposta"}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 32, fontWeight: 800, color: vencidos > 0 ? T.coral : T.primary }}>{vencidos}</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>{vencidos === 1 ? "follow-up vencido" : "follow-ups vencidos"}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 32, fontWeight: 800, color: T.primary }}>{hoje}</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>{hoje === 1 ? "follow-up agendado pra hoje" : "follow-ups agendados pra hoje"}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 32, fontWeight: 800, color: T.ink }}>{meusLeads}</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>{meusLeads === 1 ? "lead sob sua responsabilidade" : "leads sob sua responsabilidade"}</div>
        </Card>
      </div>
      <button style={{ ...s.btnPrimary, justifySelf: "center", padding: "12px 28px" }} onClick={() => setView("filaTrabalho")}>
        Ver minhas tarefas
      </button>
    </div>
  );
}
