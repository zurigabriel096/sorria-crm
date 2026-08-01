import { useEffect, useRef, useState } from "react";
import { T, AVATAR_COLORS, CLINICA } from "../../theme";
import { s } from "../../styles/s";
import { Dot, IconLogout, IconPlus } from "../icons";

const TITLES = {
  dashboard: "Painel executivo", pacientes: "Pacientes", segmentacoes: "Segmentações",
  campanhas: "Campanhas", templates: "Templates de WhatsApp", disparo: "Novo disparo",
  disparos: "Histórico de disparos", colaboradores: "Colaboradores", plano: "Meu plano",
  suporte: "Suporte", config: "Configurações",
};

export function Topbar({ view, avatarColor, setAvatarColor, waActive, setWaActive, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header style={s.topbar}>
      <div>
        <div style={{ fontSize: 12, color: T.inkSoft }}>{CLINICA}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{TITLES[view]}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => setWaActive((w) => !w)}
          title="Clique para simular conexão/desconexão"
          style={{ ...s.waPill, background: waActive ? "#E1F4F0" : "#FDE9E6", color: waActive ? "#0E9484" : T.coral, cursor: "pointer" }}
        >
          <Dot color={waActive ? T.wa : T.coral} /> {waActive ? "WhatsApp ativo" : "WhatsApp inativo"}
        </button>
        <div style={{ position: "relative" }} ref={ref}>
          <button style={{ ...s.avatar, background: avatarColor }} onClick={() => setOpen((o) => !o)}>RG</button>
          {open && (
            <div style={s.profileMenu} className="pop">
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 12px" }}>
                <div style={{ ...s.avatar, background: avatarColor, width: 40, height: 40 }}>RG</div>
                <div>
                  <div style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>Rithieli Gabriel</div>
                  <div style={{ fontSize: 12, color: T.inkSoft }}>Administradora</div>
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
                <label
                  style={{ width: 26, height: 26, borderRadius: "50%", cursor: "pointer", position: "relative", overflow: "hidden", border: `1.5px dashed ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Escolher outra cor (RGB)"
                >
                  <input
                    type="color"
                    value={avatarColor}
                    onChange={(e) => setAvatarColor(e.target.value)}
                    style={{ position: "absolute", inset: -4, width: 34, height: 34, border: "none", padding: 0, cursor: "pointer", opacity: 0 }}
                  />
                  <IconPlus color={T.inkSoft} />
                </label>
              </div>
              <div style={{ fontSize: 11, color: T.inkSoft, marginBottom: 12 }}>Upload de foto na versão completa.</div>
              <div style={s.hr} />
              <button style={s.logoutBtn} onClick={onLogout}><IconLogout color={T.coral} /> Sair da conta</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
