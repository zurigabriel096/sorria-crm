import { useRef, useState } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Logo } from "../Logo";
import { IconGrid, IconUsers, IconFilter, IconMega, IconChat, IconSend, IconTeam, IconCard, IconLife, IconGear, IconChevron, IconZap, IconPanelLeft } from "../icons";

// Itens simples navegam direto; itens com "children" viram um grupo expansível
// (acordeão inline), no espírito do menu de Campanhas da RD Station.
const ITEMS = [
  ["dashboard", "Painel", IconGrid],
  ["pacientes", "Pacientes", IconUsers],
  {
    group: "campanhas", label: "Campanhas", icon: IconMega,
    children: [
      ["campanhas", "Campanhas", IconMega],
      ["segmentacoes", "Segmentações", IconFilter],
      ["templates", "Templates", IconChat],
      ["automacoes", "Automação", IconZap],
    ],
  },
  ["disparos", "Disparos", IconSend],
  ["colaboradores", "Colaboradores", IconTeam],
  ["plano", "Meu plano", IconCard],
  ["suporte", "Suporte", IconLife],
  ["config", "Configurações", IconGear],
];

export function Sidebar({ view, setView, collapsed, setCollapsed, angry, setAngry }) {
  const clicks = useRef([]);
  const [openGroups, setOpenGroups] = useState(() => new Set());

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

  const toggleGroup = (key) => {
    setOpenGroups((s2) => {
      const next = new Set(s2);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const isViewIn = (children, v) => children.some(([k]) => k === v || (v === "disparo" && k === "campanhas"));

  return (
    <aside style={{ ...s.sidebar, width: collapsed ? 76 : 234 }}>
      <div style={{ height: 58, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", paddingLeft: collapsed ? 0 : 18, transition: "padding .22s" }}>
        {collapsed ? <Logo size={18} markOnly angry={angry} /> : <Logo size={20} angry={angry} />}
      </div>
      <button className="collapseBtn" onClick={toggle} title="Recolher menu" style={{ ...s.collapseBtn, position: "absolute", top: 64, left: 20 }}>
        <IconPanelLeft color={T.inkSoft} width={16} height={16} />
      </button>
      <nav style={{ flex: 1, padding: collapsed ? "46px 10px 4px" : "46px 12px 4px", overflowY: "auto" }}>
        {ITEMS.map((item) => {
          if (Array.isArray(item)) {
            const [key, label, Icon] = item;
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
          }

          const { group, label, icon: Icon, children } = item;
          const childActive = isViewIn(children, view);
          const expanded = collapsed ? false : openGroups.has(group) || childActive;

          return (
            <div key={group}>
              <button
                onClick={() => (collapsed ? setView(children[0][0]) : toggleGroup(group))}
                className="navItem"
                title={label}
                style={{ ...s.navItem, justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? "11px 0" : "11px 14px", ...(childActive && !expanded ? s.navItemActive : {}) }}
              >
                <Icon color={childActive ? T.primary : T.inkSoft} />
                {!collapsed && <span className="fadeItem" style={{ flex: 1, textAlign: "left" }}>{label}</span>}
                {!collapsed && <IconChevron color={T.inkSoft} dir={expanded ? "down" : "right"} />}
              </button>
              {expanded && (
                <div className="fadeItem" style={{ display: "grid", gap: 2, margin: "2px 0 4px", paddingLeft: 14 }}>
                  {children.map(([key, childLabel, ChildIcon]) => {
                    const active = view === key || (view === "disparo" && key === "campanhas");
                    return (
                      <button
                        key={key}
                        onClick={() => setView(key)}
                        className="navItem"
                        title={childLabel}
                        style={{ ...s.navItem, fontSize: 13, padding: "9px 14px", ...(active ? s.navItemActive : {}) }}
                      >
                        <ChildIcon color={active ? T.primary : T.inkSoft} /> <span>{childLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
