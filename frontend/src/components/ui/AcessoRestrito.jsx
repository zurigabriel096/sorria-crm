import { T } from "../../theme";
import { IconLock } from "../icons";

// Envolve o conteudo de uma aba restrita a gestao no menu unificado (ver
// Sidebar.jsx, remodelacao 06/08/2026). Todo mundo VE a aba, mas quem nao e'
// ADMIN/GESTOR abre e encontra o conteudo borrado com um cadeado por cima,
// em vez da aba sumir do menu (comportamento antigo) ou virar um 403 seco.
export function AcessoRestrito({ liberado, children }) {
  if (liberado) return children;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(7px)", pointerEvents: "none", userSelect: "none", opacity: 0.85 }} aria-hidden="true">
        {children}
      </div>
      <div
        style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          background: "linear-gradient(180deg, rgba(243,247,246,.35), rgba(243,247,246,.75))",
        }}
      >
        <div
          style={{
            background: "#fff", border: `1px solid ${T.line}`, borderRadius: 16, padding: "24px 28px",
            maxWidth: 320, textAlign: "center", boxShadow: "0 12px 32px rgba(22,38,59,.14)",
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.primarySoft, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
            <IconLock color={T.primary} width={20} height={20} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, color: T.ink, marginBottom: 4 }}>Acesso restrito à gestão</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>
            Essa área é visível pra todo mundo saber que existe, mas só ADMIN/GESTOR consegue abrir de verdade.
          </div>
        </div>
      </div>
    </div>
  );
}
