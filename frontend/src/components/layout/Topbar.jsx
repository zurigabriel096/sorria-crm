import { useEffect, useRef, useState } from "react";
import { T, AVATAR_COLORS, CLINICA } from "../../theme";
import { s } from "../../styles/s";
import { IconLogout, GlowDot } from "../icons";
import { ColorPicker } from "../ui/ColorPicker";
import { AvatarUploader } from "../ui/AvatarUploader";
import { PAPEL_LABEL, iniciais } from "../../utils/usuario";

const TITLES = {
  dashboard: "Painel executivo", pacientes: "Base de Leads", segmentacoes: "Segmentações",
  campanhas: "Campanhas", templates: "Templates de WhatsApp", automacoes: "Automação", disparo: "Novo disparo",
  disparos: "Histórico de disparos", colaboradores: "Colaboradores", plano: "Meu plano",
  suporte: "Suporte", config: "Configurações",
};

export function Topbar({ view, usuario, onAvatarUploaded, avatarColor, setAvatarColor, sistemaAtivo, onReportarProblema, onLogout, showToast }) {
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const ref = useRef(null);
  const sigla = iniciais(usuario?.nome);
  const papelLabel = PAPEL_LABEL[usuario?.papel] || usuario?.papel || "";

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const Avatar = ({ size }) =>
    usuario?.avatarUrl ? (
      <img src={usuario.avatarUrl} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    ) : (
      <div style={{ ...s.avatar, background: avatarColor, width: size, height: size, fontSize: size <= 36 ? 13 : 15 }}>{sigla}</div>
    );

  return (
    <header style={s.topbar}>
      <div>
        <div style={{ fontSize: 12, color: T.inkSoft }}>{CLINICA}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{TITLES[view]}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => { if (!sistemaAtivo) onReportarProblema(); }}
          title={sistemaAtivo ? "Sistema operando normalmente" : "Clique para reportar o problema"}
          style={{ ...s.waPill, background: sistemaAtivo ? "#E1F4F0" : "#FDE9E6", color: sistemaAtivo ? "#0E9484" : T.coral, cursor: sistemaAtivo ? "default" : "pointer" }}
        >
          <GlowDot color={sistemaAtivo ? T.wa : T.coral} /> {sistemaAtivo ? "Sistema ativo" : "Sistema inativo"}
        </button>
        <div style={{ position: "relative" }} ref={ref}>
          <button style={{ ...s.avatar, background: "transparent", padding: 0, overflow: "hidden" }} onClick={() => setOpen((o) => !o)}>
            <Avatar size={36} />
          </button>
          {open && (
            <div style={s.profileMenu} className="pop">
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 12px" }}>
                <Avatar size={40} />
                <div>
                  <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>{usuario?.nome || "—"}</div>
                  <div style={{ fontSize: 12, color: T.inkSoft }}>{papelLabel}</div>
                </div>
              </div>
              <div style={s.hr} />
              <div style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 8 }}>Cor do perfil</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: avatarColor === c ? `2.5px solid ${T.ink}` : "2.5px solid transparent", cursor: "pointer" }}
                  />
                ))}
                <ColorPicker value={avatarColor} onChange={setAvatarColor} />
              </div>
              <button style={s.linkBtn} onClick={() => { setOpen(false); setUploadOpen(true); }}>
                {usuario?.avatarUrl ? "Trocar foto de perfil" : "Enviar foto de perfil"}
              </button>
              <div style={{ ...s.hr, marginTop: 12 }} />
              <button style={s.logoutBtn} onClick={onLogout}><IconLogout color={T.coral} /> Sair da conta</button>
            </div>
          )}
        </div>
      </div>
      {uploadOpen && (
        <AvatarUploader
          showToast={showToast}
          onClose={() => setUploadOpen(false)}
          onUploaded={onAvatarUploaded}
        />
      )}
    </header>
  );
}
