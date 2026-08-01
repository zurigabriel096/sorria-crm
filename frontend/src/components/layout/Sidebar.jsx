import { useRef, useState } from "react";
import { T } from "../../theme";
import { s } from "../../styles/s";
import { Logo } from "../Logo";
import { IconGrid, IconUsers, IconFilter, IconMega, IconChat, IconSend, IconTeam, IconCard, IconLife, IconGear, IconChevron, IconZap, IconPanelLeft } from "../icons";

// Itens simples navegam direto; itens com "children" viram um grupo expansível
// (acordeão inline), no espírito do menu de Campanhas da RD Station. O próprio
// grupo já é uma página navegável (view === group), os "children" são só os
// itens satélite — sem duplicar "Campanhas" dentro do próprio submenu.
const ITEMS = [
  ["dashboard", "Painel", IconGrid],
  ["pacientes", "Base de Leads", IconUsers],
  {
    group: "campanhas", label: "Campanhas", icon: IconMega,
    children: [
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

const isViewInGroup = (item, v) =>
  v === item.group || (v === "disparo" && item.group === "campanhas") || item.children.some(([k]) => k === v);

export function Sidebar({ view, setView, collapsed, setCollapsed, angry, setAngry }) {
  const clicks = useRef([]);
  // Só semeia aberto se a página inicial já cair no grupo; depois disso o estado
  // de expandido/recolhido é só do usuário — nunca recalculado a partir da página
  // ativa, senão a seta trava aberta enquanto o grupo estiver selecionado.
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = new Set();
    ITEMS.forEach((item) => { if (!Array.isArray(item) && isViewInGroup(item, view)) initial.add(item.group); });
    return initial;
  });

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
          const rowActive = isViewInGroup(item, view);
          const expanded = collapsed ? false : openGroups.has(group);

          return (
            <div key={group}>
              <div
                className="navItem"
                style={{ ...s.navItem, padding: 0, justifyContent: collapsed ? "center" : "flex-start", ...(rowActive ? s.navItemActive : {}) }}
              >
                <button
                  onClick={() => setView(group)}
                  title={label}
                  style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, padding: collapsed ? "11px 0" : "11px 0 11px 14px", color: "inherit", background: "transparent", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}
                >
                  <Icon color={rowActive ? T.primary : T.inkSoft} /> {!collapsed && <span className="fadeItem">{label}</span>}
                </button>
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group)}
                    title={expanded ? "Recolher" : "Expandir"}
                    style={{ display: "flex", alignItems: "center", padding: "11px 12px 11px 4px", background: "transparent" }}
                  >
                    <IconChevron color={T.inkSoft} dir={expanded ? "down" : "right"} />
                  </button>
                )}
              </div>
              {expanded && (
                <div className="fadeItem" style={{ display: "grid", gap: 2, margin: "2px 0 4px", paddingLeft: 14 }}>
                  {children.map(([key, childLabel, ChildIcon]) => {
                    const active = view === key;
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
