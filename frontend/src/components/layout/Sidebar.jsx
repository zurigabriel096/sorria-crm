import { useRef } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Logo } from "../Logo";
import { IconGrid, IconUsers, IconFilter, IconMega, IconChat, IconSend, IconTeam, IconCard, IconLife, IconGear, IconChevron } from "../icons";

const ITEMS = [
  ["dashboard", "Painel", IconGrid],
  ["pacientes", "Pacientes", IconUsers],
  ["segmentacoes", "Segmentações", IconFilter],
  ["campanhas", "Campanhas", IconMega],
  ["templates", "Templates", IconChat],
  ["disparos", "Disparos", IconSend],
  ["colaboradores", "Colaboradores", IconTeam],
  ["plano", "Meu plano", IconCard],
  ["suporte", "Suporte", IconLife],
  ["config", "Configurações", IconGear],
];

export function Sidebar({ view, setView, collapsed, setCollapsed, angry, setAngry }) {
  const clicks = useRef([]);

  const toggle = () => {
    const now = Date.now();
    clicks.current = clicks.current.filter((t) => now - t < 1600);
    clicks.current.push(now);
    if (clicks.current.length >= 5) {
      setAngry(true);
      clicks.current = [];
      setTimeout(() => { setAngry(false); setCollapsed(false); }, 1200);
      return;
    }
    setCollapsed((c) => !c);
  };

  return (
    <aside style={{ ...s.sidebar, width: collapsed ? 76 : 234 }}>
      <div style={{ height: 58, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", paddingLeft: collapsed ? 0 : 18, transition: "padding .22s" }}>
        {collapsed ? <Logo size={18} markOnly angry={angry} /> : <Logo size={20} angry={angry} />}
      </div>
      <button className="collapseBtn" onClick={toggle} title="Recolher menu" style={{ ...s.collapseBtn, position: "absolute", top: 64, left: 20 }}>
        <IconChevron color={T.inkSoft} dir={collapsed ? "right" : "left"} />
      </button>
      <nav style={{ flex: 1, padding: collapsed ? "46px 10px 4px" : "46px 12px 4px", overflowY: "auto" }}>
        {ITEMS.map(([key, label, Icon]) => {
          const active = view === key || (view === "disparo" && key === "campanhas");
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className="navItem"
              title={label}
              style={{ ...s.navItem, justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? "11px 0" : "11px 14px", ...(active ? s.navItemActive : {}) }}
            >
              <Icon color={active ? T.primary : T.inkSoft} /> {!collapsed && <span className="fadeItem">{label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
