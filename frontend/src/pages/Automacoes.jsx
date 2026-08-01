import { T } from "../theme";
import { s } from "../styles/s";
import { Card } from "../components/ui/Card";
import { IconZap } from "../components/icons";

// Placeholder da automação estilo n8n (triggers, condições, ações, delays e ramificações
// conectados visualmente). O motor de execução (fila assíncrona + versionamento de fluxos)
// entra numa próxima fase, com a arquitetura já desenhada.
export function Automacoes({ showToast }) {
  return (
    <Card>
      <div style={{ display: "grid", placeItems: "center", padding: "50px 20px", textAlign: "center", gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: T.primarySoft, display: "grid", placeItems: "center" }}>
          <IconZap color={T.primary} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>Automações chegando em breve</div>
        <div style={{ fontSize: 13.5, color: T.inkSoft, maxWidth: 420, lineHeight: 1.5 }}>
          Um construtor de fluxos livre, com nós conectados por linhas — triggers, condições, ações, delays e ramificações — pra montar jornadas de reativação sem depender de um modelo engessado.
        </div>
        <button style={s.btnGhostSm} onClick={() => showToast("A gente te avisa assim que estiver no ar", "ok")}>Quero ser avisado</button>
      </div>
    </Card>
  );
}
